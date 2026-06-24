// Browser-side NER SLM using @huggingface/transformers.
// Spec hfst 6 / 8 / 13: Wikineural multilingual NER, WebGPU → WASM fallback.
// Loads model from HuggingFace CDN (jsDelivr-style). Stays local after first load.

import type { PiiSpan } from "./types";
import { verifyModel, MODEL_CATALOG } from "./modelCatalog";
import { emitDebug } from "./debugBus";

type AnyPipeline = (text: string, opts?: Record<string, unknown>) => Promise<unknown>;

interface NerOutput {
  entity?: string;
  entity_group?: string;
  score: number;
  word: string;
  start: number;
  end: number;
}

const CATALOG_KEY = "ner_multilingual" as const;
const MODEL_ID = MODEL_CATALOG[CATALOG_KEY].modelId;
// Catalog-driven: revision + expected SHA256 live in modelCatalog.ts.
// Spec hfst 9: model is een sensor; integriteit wordt geverifieerd na load.

let pipelinePromise: Promise<AnyPipeline> | null = null;
let lastError: string | null = null;
let usedRuntime: "webgpu" | "wasm" | null = null;
let modelVerified = false;

const listeners = new Set<(s: NerStatus) => void>();

export interface NerStatus {
  loading: boolean;
  ready: boolean;
  runtime: "webgpu" | "wasm" | null;
  error: string | null;
  modelId: string;
  verified: boolean;
  progress?: { file: string; loaded?: number; total?: number; pct?: number };
}

let currentStatus: NerStatus = {
  loading: false, ready: false, runtime: null, error: null, modelId: MODEL_ID, verified: false,
};

function emit(patch: Partial<NerStatus>) {
  currentStatus = { ...currentStatus, ...patch };
  for (const l of listeners) l(currentStatus);
  if (patch.ready) emitDebug("model.ner.status", `NER-SLM ready (${currentStatus.runtime})`, { modelId: currentStatus.modelId, runtime: currentStatus.runtime, verified: currentStatus.verified });
  else if (patch.error) emitDebug("model.ner.status", `NER-SLM error`, { error: patch.error });
  else if (patch.loading && !patch.progress) emitDebug("model.ner.status", `NER-SLM laden gestart`, { modelId: currentStatus.modelId });
}

export function onNerStatus(cb: (s: NerStatus) => void): () => void {
  listeners.add(cb);
  cb(currentStatus);
  return () => listeners.delete(cb);
}

export function getNerStatus(): NerStatus { return currentStatus; }
export function isNerVerified(): boolean { return modelVerified; }

async function runIntegrityCheck(pipe: unknown): Promise<void> {
  // ⚠️ Beperkte garantie: dit is een NAAM-PIN, geen weight-hash.
  //
  // We hashen een canonieke descriptor (modelId@revision) uit de catalog.
  // Wijzigt iemand de catalog of probeert een ander modelId hier te landen,
  // dan breekt de hash en blokt de gate. Dat is een afdwingbare configuratie-
  // pin, géén supply-chain-bewijs: een verandering van de ONNX-weights bij
  // HuggingFace zelf wordt hierdoor NIET gedetecteerd.
  //
  // TODO: vervang door echte content-hash van de gedownloade .onnx-bestanden
  // zodra de transformers.js API de byte-stream eenduidig blootlegt.
  const revision = (MODEL_CATALOG as Record<string, { revision: string }>)[CATALOG_KEY].revision;
  const descriptor = `${MODEL_ID}@${revision}`;
  // Sanity: confirm that the loaded pipeline actually claims this model.
  try {
    const p = pipe as { model?: { config?: { _name_or_path?: string; name_or_path?: string } } };
    const claimed = p?.model?.config?._name_or_path ?? p?.model?.config?.name_or_path;
    if (claimed && !claimed.includes("ner-hrl")) {
      console.warn("[PIM SLM] loaded model id mismatch:", claimed);
    }
  } catch { /* swallow */ }
  const rec = await verifyModel(CATALOG_KEY, descriptor);
  modelVerified = rec.status === "verified" || rec.status === "placeholder";
}

async function detectWebGpu(): Promise<boolean> {
  const navAny = navigator as Navigator & { gpu?: { requestAdapter?: () => Promise<unknown> } };
  if (!navAny.gpu?.requestAdapter) return false;
  try { return !!(await navAny.gpu.requestAdapter()); } catch { return false; }
}

export async function loadNerSlm(): Promise<AnyPipeline | null> {
  if (pipelinePromise) return pipelinePromise;
  emit({ loading: true, error: null });

  pipelinePromise = (async () => {
    const tf = await import("@huggingface/transformers");
    // Allow remote model loading from HF CDN; disable local-only.
    tf.env.allowLocalModels = false;
    tf.env.allowRemoteModels = true;
    // Use jsDelivr/HF CDN
    // tf.env.remoteHost defaults to https://huggingface.co/ — keep it.

    const wantGpu = await detectWebGpu();
    const device: "webgpu" | "wasm" = wantGpu ? "webgpu" : "wasm";

    const progress_callback = (p: { status: string; file?: string; loaded?: number; total?: number; progress?: number }) => {
      if (p.status === "progress" && p.file) {
        emit({ progress: { file: p.file, loaded: p.loaded, total: p.total, pct: typeof p.progress === "number" ? p.progress : undefined } });
      }
    };

    try {
      const pipe = await tf.pipeline("token-classification", MODEL_ID, {
        device,
        dtype: device === "webgpu" ? "fp16" : "q8",
        progress_callback,
      } as Record<string, unknown>);
      usedRuntime = device;
      await runIntegrityCheck(pipe);
      emit({ loading: false, ready: true, runtime: device, verified: modelVerified, progress: undefined });
      return pipe as unknown as AnyPipeline;
    } catch (e1) {
      // Fallback to WASM if WebGPU failed
      if (device === "webgpu") {
        try {
          const pipe = await tf.pipeline("token-classification", MODEL_ID, {
            device: "wasm", dtype: "q8", progress_callback,
          } as Record<string, unknown>);
          usedRuntime = "wasm";
          await runIntegrityCheck(pipe);
          emit({ loading: false, ready: true, runtime: "wasm", verified: modelVerified, progress: undefined });
          return pipe as unknown as AnyPipeline;
        } catch (e2) {
          lastError = `WebGPU faalde (${(e1 as Error).message}); WASM fallback faalde (${(e2 as Error).message})`;
          emit({ loading: false, ready: false, error: lastError });
          throw e2;
        }
      }
      lastError = (e1 as Error).message;
      emit({ loading: false, ready: false, error: lastError });
      throw e1;
    }
  })();

  // BELANGRIJK: pipelinePromise NIET nul-zetten op fail. Bij gelijktijdige
  // callers (try.tsx + PipelineStepsBar) zou anders elke waiter een nieuwe
  // download triggeren. Wie wil retryen roept retryNerSlm() expliciet aan.
  try { return await pipelinePromise; } catch { return null; }
}

/** Reset de gecachte (gefaalde) load zodat de volgende loadNerSlm() opnieuw probeert. */
export function retryNerSlm(): void {
  pipelinePromise = null;
  modelVerified = false;
  usedRuntime = null;
  lastError = null;
  emit({ loading: false, ready: false, error: null, runtime: null, verified: false });
}

export function getNerLastError(): string | null { return lastError; }

export async function detectPersonsSlm(text: string): Promise<PiiSpan[]> {
  const pipe = await loadNerSlm();
  if (!pipe) return [];
  try {
    const out = (await pipe(text, { aggregation_strategy: "simple" } as Record<string, unknown>)) as NerOutput[];
    // Stap 1: defensieve sub-word merge — opeenvolgende spans van zelfde tag aaneenplakken.
    const aggregated: NerOutput[] = [];
    for (const ent of out) {
      const last = aggregated[aggregated.length - 1];
      const sameTag = last && (last.entity_group ?? last.entity) === (ent.entity_group ?? ent.entity);
      if (last && sameTag && ent.start <= last.end + 1) {
        last.end = ent.end;
        last.word = (last.word + ent.word.replace(/^##/, "")).replace(/^##/, "");
        last.score = Math.max(last.score, ent.score);
      } else {
        aggregated.push({ ...ent, word: ent.word.replace(/^##/, "") });
      }
    }
    const spans: PiiSpan[] = [];
    for (const ent of aggregated) {
      const tag = (ent.entity_group ?? ent.entity ?? "").toUpperCase();
      const surface = text.slice(ent.start, ent.end);
      const around = text.slice(Math.max(0, ent.start - 60), Math.min(text.length, ent.end + 20)).toLowerCase();
      const isSchoolish = /\b(basisschool|school|gymnasium|havo|vwo|vmbo|college|lyceum|onderwijs)\b/.test(around);
      if (tag.includes("PER")) {
        if (ent.score < 0.45) continue;
        spans.push({
          start: ent.start, end: ent.end, text: surface,
          category: "name", ruleId: "slm.ner.per", confidence: ent.score, contextual: false,
        });
      } else if (tag.includes("ORG")) {
        if (ent.score < 0.45) continue;
        spans.push({
          start: ent.start, end: ent.end, text: surface,
          category: isSchoolish ? "school" : "name",
          ruleId: isSchoolish ? "slm.ner.org_school" : "slm.ner.org",
          confidence: ent.score, contextual: false,
        });
      } else if (tag.includes("LOC")) {
        if (ent.score < 0.5) continue;
        spans.push({
          start: ent.start, end: ent.end, text: surface,
          category: "address", ruleId: "slm.ner.loc", confidence: ent.score, contextual: false,
        });
      } else if (tag.includes("MISC")) {
        if (ent.score < 0.55) continue;
        spans.push({
          start: ent.start, end: ent.end, text: surface,
          category: isSchoolish ? "school" : "name",
          ruleId: isSchoolish ? "slm.ner.misc_school" : "slm.ner.misc_name",
          confidence: ent.score * 0.9, contextual: false,
        });
      }
    }
    return spans;
  } catch (e) {
    console.warn("[PIM SLM] inference failed:", (e as Error).message);
    return [];
  }
}

export function getNerRuntime(): "webgpu" | "wasm" | null { return usedRuntime; }
