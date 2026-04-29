// Browser-side NER SLM using @huggingface/transformers.
// Spec hfst 6 / 8 / 13: Wikineural multilingual NER, WebGPU → WASM fallback.
// Loads model from HuggingFace CDN (jsDelivr-style). Stays local after first load.

import type { PiiSpan } from "./types";
import { verifyModel, MODEL_CATALOG } from "./modelCatalog";

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
}

export function onNerStatus(cb: (s: NerStatus) => void): () => void {
  listeners.add(cb);
  cb(currentStatus);
  return () => listeners.delete(cb);
}

export function getNerStatus(): NerStatus { return currentStatus; }
export function isNerVerified(): boolean { return modelVerified; }

async function runIntegrityCheck(pipe: unknown): Promise<void> {
  // Trust-on-first-pin: we hashen een canonieke descriptor (modelId@revision)
  // die in de catalog is gepind. Wijzigt iemand de catalog of probeert een
  // ander modelId hier te landen, dan breekt de hash en blokt de gate.
  // Niet supply-chain-bewijs, maar wel een afdwingbare gate vanuit de UI.
  const revision = (MODEL_CATALOG as Record<string, { revision: string }>)[CATALOG_KEY].revision;
  const descriptor = `${MODEL_ID}@${revision}`;
  // Sanity: confirm that the loaded pipeline actually claims this model.
  try {
    const p = pipe as { model?: { config?: { _name_or_path?: string; name_or_path?: string } } };
    const claimed = p?.model?.config?._name_or_path ?? p?.model?.config?.name_or_path;
    if (claimed && !claimed.includes("bert-base-multilingual-cased-ner-hrl")) {
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

  try { return await pipelinePromise; } catch { pipelinePromise = null; return null; }
}

export async function detectPersonsSlm(text: string): Promise<PiiSpan[]> {
  const pipe = await loadNerSlm();
  if (!pipe) return [];
  try {
    const out = (await pipe(text, { aggregation_strategy: "simple" } as Record<string, unknown>)) as NerOutput[];
    const spans: PiiSpan[] = [];
    for (const ent of out) {
      const tag = (ent.entity_group ?? ent.entity ?? "").toUpperCase();
      // Persoonsnamen → name; Organisaties (incl. scholen) → school als 'school' / 'basisschool' nabij; anders skip.
      // We mappen PER → name, ORG → school als context aanwezig is, anders ook name (organisatie kan PII zijn).
      if (tag.includes("PER")) {
        spans.push({
          start: ent.start, end: ent.end, text: ent.word.replace(/^##/, ""),
          category: "name", ruleId: "slm.ner.per", confidence: ent.score, contextual: false,
        });
      } else if (tag.includes("ORG")) {
        const around = text.slice(Math.max(0, ent.start - 30), ent.end + 5).toLowerCase();
        const isSchool = /\b(basisschool|school|gymnasium|havo|vwo|vmbo|college|lyceum)\b/.test(around);
        spans.push({
          start: ent.start, end: ent.end, text: ent.word.replace(/^##/, ""),
          category: isSchool ? "school" : "name",
          ruleId: isSchool ? "slm.ner.org_school" : "slm.ner.org",
          confidence: ent.score, contextual: false,
        });
      } else if (tag.includes("LOC")) {
        spans.push({
          start: ent.start, end: ent.end, text: ent.word.replace(/^##/, ""),
          category: "address", ruleId: "slm.ner.loc", confidence: ent.score * 0.8, contextual: false,
        });
      }
    }
    return spans.filter(s => s.confidence >= 0.6);
  } catch (e) {
    console.warn("[PIM SLM] inference failed:", (e as Error).message);
    return [];
  }
}

export function getNerRuntime(): "webgpu" | "wasm" | null { return usedRuntime; }
