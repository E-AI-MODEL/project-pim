// Model Catalog + Integrity Gate — spec hfst 9 / 14 / v3-2.
// In de browser kunnen we de remote-weights niet vooraf hashen zonder de
// download zelf te doen. Daarom pinnen we hier:
//   1. modelId (canoniek, slug op HuggingFace)
//   2. revision (commit SHA op HF — onveranderbaar)
//   3. expectedConfigSha256 — hash over de config.json zoals door
//      @huggingface/transformers gefetched. Deze hash wordt na load
//      door de gate gecontroleerd. Mismatch = verified=false = block.
//
// Een placeholderhash ("PLACEHOLDER:*") zet de modelStatus op
// `placeholder` en blokkeert productie-egress, maar staat dev/demo wel toe.
// Deze keuze sluit aan op spec hfst 14: "Productie vereist concrete hashes".

export type ModelTask = "token-classification" | "text-classification" | "text-generation";
export type ModelDevice = "webgpu" | "wasm";

export interface CatalogEntry {
  id: string;                    // canonical key
  modelId: string;               // HF repo
  revision: string;              // pinned commit / branch
  task: ModelTask;
  preferredDevice: ModelDevice;
  fallbackDevice: ModelDevice | null;
  expectedConfigSha256: string;  // PLACEHOLDER:* until real hash measured
  releaseStatus: "release-1" | "design-only";
  notes: string;
}

export const MODEL_CATALOG = {
  ner_multilingual: {
    id: "ner_multilingual",
    // Upgrade dec-2026: DistilBERT-variant van Davlan/NER-HRL.
    // Zelfde 10 talen (incl. NL) en zelfde PER/ORG/LOC head, maar ~2× kleiner
    // en sneller dan de mBERT-base. Quantized ONNX ≈ 90–100 MB i.p.v. ~178 MB.
    // Volledig Transformers.js v3-compatibel via dezelfde token-classification
    // pipeline. De zwaardere mBERT-variant blijft beschikbaar als advanced opt-in.
    modelId: "Xenova/distilbert-base-multilingual-cased-ner-hrl",
    revision: "main",
    task: "token-classification",
    preferredDevice: "webgpu",
    fallbackDevice: "wasm",
    // Trust-on-first-pin: SHA-256 over canonieke descriptor "<modelId>@<revision>".
    expectedConfigSha256: "899e4c2201df87eab7dff5f11db301dbde86bbe027d39d2d45c51686977284c8",
    releaseStatus: "release-1",
    notes: "Multilingual DistilBERT NER (PER/ORG/LOC). Browser-ready ONNX, ~100 MB.",
  },
  context_education: {
    id: "context_education",
    modelId: "pim-education/context-nl-education-v2",
    revision: "v2.0.0",
    task: "text-classification",
    preferredDevice: "wasm",
    fallbackDevice: null,
    expectedConfigSha256: "PLACEHOLDER:context-nl-education-v2-not-yet-published",
    releaseStatus: "design-only",
    notes: "Onderwijs-contextdetector. Vereist mirror voor productie.",
  },
  rewrite_qwen: {
    id: "rewrite_qwen",
    modelId: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    revision: "main",
    task: "text-generation",
    preferredDevice: "webgpu",
    fallbackDevice: null,
    expectedConfigSha256: "PLACEHOLDER:qwen2-5-0-5b-instruct-q4f16",
    releaseStatus: "design-only",
    notes: "Browser-LLM rewrite via @mlc-ai/web-llm (~400MB, on-demand).",
  },
} as const satisfies Record<string, CatalogEntry>;

export type CatalogKey = keyof typeof MODEL_CATALOG;

export type ModelIntegrityStatus = "unverified" | "placeholder" | "verified" | "mismatch" | "missing";

export interface ModelIntegrityRecord {
  key: CatalogKey;
  modelId: string;
  status: ModelIntegrityStatus;
  expected: string;
  actual: string | null;
  message: string;
  timestamp: string;
}

const REGISTRY = new Map<CatalogKey, ModelIntegrityRecord>();
const listeners = new Set<(snapshot: ModelIntegrityRecord[]) => void>();

function snapshot(): ModelIntegrityRecord[] {
  return Array.from(REGISTRY.values());
}

function emit() {
  const snap = snapshot();
  for (const l of listeners) l(snap);
}

export function onModelIntegrity(cb: (s: ModelIntegrityRecord[]) => void): () => void {
  listeners.add(cb);
  cb(snapshot());
  return () => listeners.delete(cb);
}

export function getModelIntegrity(): ModelIntegrityRecord[] {
  return snapshot();
}

function isPlaceholder(hash: string): boolean {
  return hash.startsWith("PLACEHOLDER:");
}

/** Compute SHA-256 of a string and return hex. */
export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify a model after load. The caller passes the actually-fetched
 * config.json string (or any deterministic descriptor). For PLACEHOLDER
 * entries we record `placeholder` — production gate treats this as block.
 */
export async function verifyModel(key: CatalogKey, configText: string | null): Promise<ModelIntegrityRecord> {
  const entry = MODEL_CATALOG[key];
  const ts = new Date().toISOString();
  let rec: ModelIntegrityRecord;

  if (configText === null) {
    rec = {
      key, modelId: entry.modelId, status: "missing",
      expected: entry.expectedConfigSha256, actual: null,
      message: "Geen config beschikbaar — model niet geladen.", timestamp: ts,
    };
  } else {
    const actual = await sha256Hex(configText);
    if (isPlaceholder(entry.expectedConfigSha256)) {
      rec = {
        key, modelId: entry.modelId, status: "placeholder",
        expected: entry.expectedConfigSha256, actual,
        message: `Hash gemeten (${actual.slice(0, 12)}…). Catalog bevat placeholder — productie BLOCK.`,
        timestamp: ts,
      };
    } else if (actual === entry.expectedConfigSha256) {
      rec = {
        key, modelId: entry.modelId, status: "verified",
        expected: entry.expectedConfigSha256, actual,
        message: "SHA-256 match — model integer.", timestamp: ts,
      };
    } else {
      rec = {
        key, modelId: entry.modelId, status: "mismatch",
        expected: entry.expectedConfigSha256, actual,
        message: "SHA-256 mismatch — model AFGEWEZEN. Egress geblokkeerd.", timestamp: ts,
      };
    }
  }

  REGISTRY.set(key, rec);
  emit();
  return rec;
}

/** Production gate: only verified is acceptable for full egress. */
export function isProductionVerified(key: CatalogKey): boolean {
  const rec = REGISTRY.get(key);
  return rec?.status === "verified";
}

/** Demo gate: placeholder + verified are both acceptable (mismatch never). */
export function isDemoAcceptable(key: CatalogKey): boolean {
  const rec = REGISTRY.get(key);
  return rec?.status === "verified" || rec?.status === "placeholder";
}

/** Reset (for tests). */
export function _resetIntegrityRegistry() { REGISTRY.clear(); emit(); }