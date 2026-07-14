// Browser-side BERT/NER using @huggingface/transformers.
// User text, drafts and mappings are never sent to Hugging Face; inference stays
// local in the browser after model files are loaded.

import type { PiiSpan } from "./types";
import { NER_VARIANTS, DEFAULT_NER_VARIANT, type NerVariantKey } from "./modelCatalog";
import { verifyModel } from "./modelIntegrity";
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
let currentVariant: NerVariantKey = DEFAULT_NER_VARIANT;
const activeModelId = () => NER_VARIANTS[currentVariant].modelId;

let pipelinePromise: Promise<AnyPipeline> | null = null;
let lastError: string | null = null;
let usedRuntime: "webgpu" | "wasm" | null = null;
let modelVerified = false;

const listeners = new Set<(s: NerStatus) => void>();

export type ModelHealthPhase =
  | "idle"
  | "download"
  | "init"
  | "integrity"
  | "test"
  | "ready"
  | "error";

export interface NerStatus {
  loading: boolean;
  ready: boolean;
  runtime: "webgpu" | "wasm" | null;
  error: string | null;
  modelId: string;
  variant: NerVariantKey;
  verified: boolean;
  working: boolean;
  healthPhase: ModelHealthPhase;
  healthError: string | null;
  lastCheckedAt?: string;
  progress?: { file: string; loaded?: number; total?: number; pct?: number };
}

let currentStatus: NerStatus = {
  loading: false,
  ready: false,
  runtime: null,
  error: null,
  modelId: activeModelId(),
  variant: currentVariant,
  verified: false,
  working: false,
  healthPhase: "idle",
  healthError: null,
};

function emit(patch: Partial<NerStatus>) {
  currentStatus = { ...currentStatus, ...patch, modelId: activeModelId(), variant: currentVariant };
  for (const l of listeners) l(currentStatus);
  if (patch.ready)
    emitDebug("model.ner.status", `BERT werkt (${currentStatus.runtime})`, {
      modelId: currentStatus.modelId,
      runtime: currentStatus.runtime,
      verified: currentStatus.verified,
    });
  else if (patch.error || patch.healthError)
    emitDebug("model.ner.status", "BERT error", { error: patch.error ?? patch.healthError });
  else if (patch.loading && !patch.progress)
    emitDebug("model.ner.status", "BERT laden gestart", { modelId: currentStatus.modelId });
}

export function onNerStatus(cb: (s: NerStatus) => void): () => void {
  listeners.add(cb);
  cb(currentStatus);
  return () => listeners.delete(cb);
}

export function getNerStatus(): NerStatus {
  return currentStatus;
}
export function isNerVerified(): boolean {
  return modelVerified;
}

function hfConfigUrl(modelId: string, revision: string): string {
  return `https://huggingface.co/${modelId}/resolve/${encodeURIComponent(revision)}/config.json`;
}

async function fetchModelConfig(modelId: string, revision: string): Promise<string | null> {
  try {
    const res = await fetch(hfConfigUrl(modelId, revision), {
      method: "GET",
      cache: "force-cache",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function runIntegrityCheck(pipe: unknown): Promise<void> {
  const variant = NER_VARIANTS[currentVariant];
  emit({ healthPhase: "integrity" });
  try {
    const p = pipe as { model?: { config?: { _name_or_path?: string; name_or_path?: string } } };
    const claimed = p?.model?.config?._name_or_path ?? p?.model?.config?.name_or_path;
    if (claimed && !claimed.includes("ner-hrl")) {
      console.warn("[PIM BERT] loaded model id mismatch:", claimed);
    }
  } catch {
    /* swallow */
  }

  const configText = await fetchModelConfig(variant.modelId, variant.revision);
  const rec = await verifyModel(CATALOG_KEY, configText, {
    modelId: variant.modelId,
    expected: variant.expectedConfigSha256,
  });
  modelVerified = rec.status === "verified";
}

async function runNerSmokeTest(pipe: AnyPipeline): Promise<void> {
  emit({ healthPhase: "test", healthError: null });
  try {
    const out = (await pipe("Jan werkt bij School De Brug in Utrecht.", {
      aggregation_strategy: "simple",
    } as Record<string, unknown>)) as NerOutput[];
    if (!Array.isArray(out)) throw new Error("BERT gaf geen lijst met labels terug.");
    if (out.length === 0) throw new Error("BERT startte, maar vond niets in de testzin.");
    emit({
      working: true,
      ready: true,
      healthPhase: "ready",
      healthError: null,
      lastCheckedAt: new Date().toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    lastError = msg;
    emit({
      loading: false,
      ready: false,
      working: false,
      error: msg,
      healthError: msg,
      healthPhase: "error",
      lastCheckedAt: new Date().toISOString(),
    });
    throw e;
  }
}

async function detectWebGpu(): Promise<boolean> {
  const navAny = navigator as Navigator & { gpu?: { requestAdapter?: () => Promise<unknown> } };
  if (!navAny.gpu?.requestAdapter) return false;
  try {
    return !!(await navAny.gpu.requestAdapter());
  } catch {
    return false;
  }
}

export async function loadNerSlm(): Promise<AnyPipeline | null> {
  if (pipelinePromise) {
    try {
      return await pipelinePromise;
    } catch {
      return null;
    }
  }
  emit({
    loading: true,
    ready: false,
    working: false,
    error: null,
    healthError: null,
    healthPhase: "download",
  });

  pipelinePromise = (async () => {
    const tf = await import("@huggingface/transformers");
    tf.env.allowLocalModels = false;
    tf.env.allowRemoteModels = true;

    const wantGpu = await detectWebGpu();
    const device: "webgpu" | "wasm" = wantGpu ? "webgpu" : "wasm";

    const progress_callback = (p: {
      status: string;
      file?: string;
      loaded?: number;
      total?: number;
      progress?: number;
    }) => {
      if (p.status === "progress" && p.file) {
        emit({
          healthPhase: "download",
          progress: {
            file: p.file,
            loaded: p.loaded,
            total: p.total,
            pct: typeof p.progress === "number" ? p.progress : undefined,
          },
        });
      }
    };

    const variant = NER_VARIANTS[currentVariant];
    const modelId = variant.modelId;
    try {
      emit({ healthPhase: "init" });
      const pipe = await tf.pipeline("token-classification", modelId, {
        device,
        dtype: device === "webgpu" ? "fp16" : "q8",
        revision: variant.revision,
        progress_callback,
      } as Record<string, unknown>);
      usedRuntime = device;
      await runIntegrityCheck(pipe);
      emit({ loading: false, runtime: device, verified: modelVerified, progress: undefined });
      await runNerSmokeTest(pipe as unknown as AnyPipeline);
      return pipe as unknown as AnyPipeline;
    } catch (e1) {
      if (device === "webgpu") {
        try {
          emit({ healthPhase: "init" });
          const pipe = await tf.pipeline("token-classification", modelId, {
            device: "wasm",
            dtype: "q8",
            revision: variant.revision,
            progress_callback,
          } as Record<string, unknown>);
          usedRuntime = "wasm";
          await runIntegrityCheck(pipe);
          emit({ loading: false, runtime: "wasm", verified: modelVerified, progress: undefined });
          await runNerSmokeTest(pipe as unknown as AnyPipeline);
          return pipe as unknown as AnyPipeline;
        } catch (e2) {
          lastError = `WebGPU faalde (${(e1 as Error).message}); WASM fallback faalde (${(e2 as Error).message})`;
          emit({
            loading: false,
            ready: false,
            working: false,
            error: lastError,
            healthError: lastError,
            healthPhase: "error",
          });
          throw e2;
        }
      }
      lastError = (e1 as Error).message;
      emit({
        loading: false,
        ready: false,
        working: false,
        error: lastError,
        healthError: lastError,
        healthPhase: "error",
      });
      throw e1;
    }
  })();

  try {
    return await pipelinePromise;
  } catch {
    return null;
  }
}

export function retryNerSlm(): void {
  pipelinePromise = null;
  modelVerified = false;
  usedRuntime = null;
  lastError = null;
  emit({
    loading: false,
    ready: false,
    working: false,
    error: null,
    healthError: null,
    runtime: null,
    verified: false,
    healthPhase: "idle",
  });
}

export function getNerVariant(): NerVariantKey {
  return currentVariant;
}

export function setNerVariant(variant: NerVariantKey): void {
  if (variant === currentVariant) return;
  currentVariant = variant;
  retryNerSlm();
  emit({ modelId: activeModelId(), variant, healthPhase: "idle" });
  emitDebug("model.ner.status", `BERT-variant gewisseld -> ${NER_VARIANTS[variant].label}`, {
    modelId: activeModelId(),
  });
}

export function getNerLastError(): string | null {
  return lastError;
}

export async function detectPersonsSlm(text: string): Promise<PiiSpan[]> {
  const pipe = await loadNerSlm();
  if (!pipe) return [];
  try {
    const out = (await pipe(text, { aggregation_strategy: "simple" } as Record<
      string,
      unknown
    >)) as NerOutput[];
    const aggregated: NerOutput[] = [];
    for (const ent of out) {
      const last = aggregated[aggregated.length - 1];
      const sameTag =
        last && (last.entity_group ?? last.entity) === (ent.entity_group ?? ent.entity);
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
      const around = text
        .slice(Math.max(0, ent.start - 60), Math.min(text.length, ent.end + 20))
        .toLowerCase();
      const isSchoolish =
        /\b(basisschool|school|gymnasium|havo|vwo|vmbo|college|lyceum|onderwijs)\b/.test(around);
      if (tag.includes("PER")) {
        if (ent.score < 0.3) continue;
        spans.push({
          start: ent.start,
          end: ent.end,
          text: surface,
          category: "name",
          ruleId: "slm.ner.per",
          confidence: ent.score,
          contextual: false,
        });
      } else if (tag.includes("ORG")) {
        if (ent.score < 0.35) continue;
        spans.push({
          start: ent.start,
          end: ent.end,
          text: surface,
          category: isSchoolish ? "school" : "name",
          ruleId: isSchoolish ? "slm.ner.org_school" : "slm.ner.org",
          confidence: ent.score,
          contextual: false,
        });
      } else if (tag.includes("LOC")) {
        if (ent.score < 0.4) continue;
        spans.push({
          start: ent.start,
          end: ent.end,
          text: surface,
          category: "address",
          ruleId: "slm.ner.loc",
          confidence: ent.score,
          contextual: false,
        });
      } else if (tag.includes("MISC")) {
        if (ent.score < 0.45) continue;
        spans.push({
          start: ent.start,
          end: ent.end,
          text: surface,
          category: isSchoolish ? "school" : "name",
          ruleId: isSchoolish ? "slm.ner.misc_school" : "slm.ner.misc_name",
          confidence: ent.score * 0.9,
          contextual: false,
        });
      }
    }
    return spans;
  } catch (e) {
    const msg = (e as Error).message;
    lastError = msg;
    emit({
      ready: false,
      working: false,
      error: msg,
      healthError: msg,
      healthPhase: "error",
      lastCheckedAt: new Date().toISOString(),
    });
    console.warn("[PIM BERT] inference failed:", msg);
    return [];
  }
}

export function getNerRuntime(): "webgpu" | "wasm" | null {
  return usedRuntime;
}
