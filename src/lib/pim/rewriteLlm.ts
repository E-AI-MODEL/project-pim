// Rewrite LLM (Qwen) via @mlc-ai/web-llm — spec hfst 25 / v3-2.
// Doel: bij Draft Check "repair" een LLM-rewrite proberen die residuele
// herkenbaarheid generaliseert ZONDER tokens of categoriewoorden te raken.
//
// Hard rules:
//   - Alleen anonieme drafts. Pseudonieme tokens mogen we nooit aan een LLM
//     geven (zelfs niet lokaal — bewaakt via ALLOW-list aan de UI-kant).
//   - On-demand load achter expliciete user-actie (~400MB download).
//   - Output gaat door dezelfde Draft Check Guard. Bij twijfel = origineel.
//   - Catalog-status `placeholder` blijft staan: productie-egress geblokt.

import { verifyModel, MODEL_CATALOG } from "./modelCatalog";

const CATALOG_KEY = "rewrite_qwen" as const;
const MODEL_ID = MODEL_CATALOG[CATALOG_KEY].modelId;

export interface RewriteStatus {
  loading: boolean;
  ready: boolean;
  error: string | null;
  modelId: string;
  progress?: { text: string; pct?: number };
}

let status: RewriteStatus = { loading: false, ready: false, error: null, modelId: MODEL_ID };
const listeners = new Set<(s: RewriteStatus) => void>();

function emit(p: Partial<RewriteStatus>) {
  status = { ...status, ...p };
  for (const l of listeners) l(status);
}

export function onRewriteStatus(cb: (s: RewriteStatus) => void): () => void {
  listeners.add(cb);
  cb(status);
  return () => listeners.delete(cb);
}

export function getRewriteStatus(): RewriteStatus { return status; }

type EngineLike = {
  chat: { completions: { create: (req: Record<string, unknown>) => Promise<unknown> } };
};

let engine: EngineLike | null = null;
let loadPromise: Promise<EngineLike | null> | null = null;

const SYSTEM_PROMPT = `Je herschrijft Nederlandse onderwijsteksten zodat ze MINDER herkenbaar zijn.
REGELS (hard):
- Verwijder of generaliseer namen, plaatsen, data, kleine groepen (bijv. "groep 6A" → "een groep").
- Behoud feitelijke kern en toon. Geen fictieve details toevoegen.
- Laat ALLE blokken in vierkante haken zoals [persoon], [school], [datum] EXACT staan.
- Antwoord met UITSLUITEND de herschreven tekst, geen uitleg.`;

export async function loadRewriteLlm(): Promise<EngineLike | null> {
  if (engine) return engine;
  if (loadPromise) return loadPromise;
  emit({ loading: true, error: null });

  loadPromise = (async () => {
    try {
      const mod = await import("@mlc-ai/web-llm");
      const eng = await mod.CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (p: { progress: number; text: string }) => {
          emit({ progress: { text: p.text, pct: Math.round((p.progress ?? 0) * 100) } });
        },
      });
      // Verify catalog integrity (placeholder is acceptable for demo).
      await verifyModel(CATALOG_KEY, `${MODEL_ID}@${MODEL_CATALOG[CATALOG_KEY].revision}`);
      engine = eng as unknown as EngineLike;
      emit({ loading: false, ready: true, progress: undefined });
      return engine;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      emit({ loading: false, ready: false, error: msg, progress: undefined });
      loadPromise = null;
      return null;
    }
  })();

  return loadPromise;
}

/**
 * Probeer een anonieme draft te herschrijven. Faalt veilig: bij elke fout
 * geven we de ORIGINELE draft terug zodat de pipeline niet breekt.
 */
export async function rewriteAnonymousDraft(draft: string): Promise<{ text: string; usedLlm: boolean; reason: string }> {
  const eng = await loadRewriteLlm();
  if (!eng) return { text: draft, usedLlm: false, reason: "LLM niet beschikbaar" };
  try {
    const res = (await eng.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: draft },
      ],
      temperature: 0.2,
      max_tokens: 512,
    })) as { choices: { message: { content: string } }[] };
    const out = res.choices?.[0]?.message?.content?.trim();
    if (!out || out.length < 10) return { text: draft, usedLlm: false, reason: "Lege LLM-output" };
    return { text: out, usedLlm: true, reason: "LLM-rewrite toegepast" };
  } catch (e) {
    return { text: draft, usedLlm: false, reason: `LLM-fout: ${(e as Error).message}` };
  }
}

/**
 * Streaming variant: roept onToken voor elke delta. Yieldt uiteindelijk de volledige tekst.
 * Bij elke fout fallback naar originele draft.
 */
export async function rewriteAnonymousDraftStream(
  draft: string,
  onToken: (chunk: string, accumulated: string) => void,
): Promise<{ text: string; usedLlm: boolean; reason: string }> {
  const eng = await loadRewriteLlm();
  if (!eng) return { text: draft, usedLlm: false, reason: "LLM niet beschikbaar" };
  try {
    const stream = (await eng.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: draft },
      ],
      temperature: 0.2,
      max_tokens: 512,
      stream: true,
    })) as AsyncIterable<{ choices: { delta?: { content?: string } }[] }>;
    let acc = "";
    for await (const chunk of stream) {
      const piece = chunk.choices?.[0]?.delta?.content ?? "";
      if (!piece) continue;
      acc += piece;
      onToken(piece, acc);
    }
    const out = acc.trim();
    if (!out || out.length < 10) return { text: draft, usedLlm: false, reason: "Lege LLM-output" };
    return { text: out, usedLlm: true, reason: "LLM-rewrite (streaming) toegepast" };
  } catch (e) {
    return { text: draft, usedLlm: false, reason: `LLM-fout: ${(e as Error).message}` };
  }
}