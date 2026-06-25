// Model Catalog + Integrity Gate — spec hfst 9 / 14 / v3-2.
//
// Privacyregel: modelintegriteit mag nooit ruwe tekst, drafts of mappings
// versturen. Alleen publieke modelmetadata zoals config.json wordt opgehaald.
//
// Release-1 gebruikt browser-local config pins:
//   1. bij eerste succesvolle load wordt SHA-256(config.json) lokaal opgeslagen;
//   2. latere loads moeten exact dezelfde hash opleveren;
//   3. mismatch = block voor egress.
//
// Dit is sterker dan een descriptor-hash en blijft volledig browser-lokaal. Voor
// streng reproduceerbare distributies kan LOCAL_PIN later vervangen worden door
// een statische SHA-256 over een immutable modelrevision.

export type ModelTask = "token-classification" | "text-classification" | "text-generation";
export type ModelDevice = "webgpu" | "wasm";

export interface CatalogEntry {
  id: string;
  modelId: string;
  revision: string;
  task: ModelTask;
  preferredDevice: ModelDevice;
  fallbackDevice: ModelDevice | null;
  /** Concrete SHA-256, PLACEHOLDER:* or LOCAL_PIN:* */
  expectedConfigSha256: string;
  releaseStatus: "release-1" | "design-only";
  notes: string;
}

export const MODEL_CATALOG = {
  ner_multilingual: {
    id: "ner_multilingual",
    modelId: "Xenova/distilbert-base-multilingual-cased-ner-hrl",
    revision: "main",
    task: "token-classification",
    preferredDevice: "webgpu",
    fallbackDevice: "wasm",
    expectedConfigSha256: "LOCAL_PIN:Xenova/distilbert-base-multilingual-cased-ner-hrl@main/config.json",
    releaseStatus: "release-1",
    notes: "Multilingual DistilBERT NER (PER/ORG/LOC). Browser-local config pin, ~100 MB.",
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

export type NerVariantKey = "small" | "large";

export interface NerVariant {
  key: NerVariantKey;
  modelId: string;
  revision: string;
  expectedConfigSha256: string;
  label: string;
  sizeLabel: string;
  notes: string;
}

export const NER_VARIANTS: Record<NerVariantKey, NerVariant> = {
  small: {
    key: "small",
    modelId: "Xenova/distilbert-base-multilingual-cased-ner-hrl",
    revision: "main",
    expectedConfigSha256: "LOCAL_PIN:Xenova/distilbert-base-multilingual-cased-ner-hrl@main/config.json",
    label: "Compact (DistilBERT)",
    sizeLabel: "~100 MB",
    notes: "Lichter en sneller; iets lagere recall. Standaard.",
  },
  large: {
    key: "large",
    modelId: "Xenova/bert-base-multilingual-cased-ner-hrl",
    revision: "main",
    expectedConfigSha256: "LOCAL_PIN:Xenova/bert-base-multilingual-cased-ner-hrl@main/config.json",
    label: "Volledig (mBERT)",
    sizeLabel: "~180 MB",
    notes: "Zwaarder maar hogere recall; vindt meer namen/organisaties.",
  },
};

export const DEFAULT_NER_VARIANT: NerVariantKey = "small";

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

const MODEL_PIN_PREFIX = "pim:model-integrity:config-sha256:";

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

function isLocalPin(hash: string): boolean {
  return hash.startsWith("LOCAL_PIN:");
}

function getStorage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

function pinStorageKey(expectedHash: string): string {
  return `${MODEL_PIN_PREFIX}${expectedHash}`;
}

function verifyLocalPin(expectedHash: string, actual: string): { status: "verified" | "mismatch" | "missing"; message: string } {
  const storage = getStorage();
  if (!storage) {
    return {
      status: "missing",
      message: "Browser-local modelpin niet beschikbaar. Productie-egress blijft geblokkeerd.",
    };
  }

  const storageKey = pinStorageKey(expectedHash);
  const pinned = storage.getItem(storageKey);
  if (!pinned) {
    storage.setItem(storageKey, actual);
    return {
      status: "verified",
      message: `Config-hash lokaal gepind (${actual.slice(0, 12)}...).`,
    };
  }

  if (pinned === actual) {
    return {
      status: "verified",
      message: "Config-hash matcht de browser-local pin.",
    };
  }

  return {
    status: "mismatch",
    message: "Config-hash wijkt af van de browser-local pin. Egress geblokkeerd.",
  };
}

/** Compute SHA-256 of a string and return hex. */
export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verify a model after load. The caller passes the fetched config.json string.
 * - PLACEHOLDER:* records placeholder and blocks production egress.
 * - LOCAL_PIN:* stores/verifies the hash in browser localStorage.
 * - concrete SHA-256 requires exact match.
 */
export async function verifyModel(
  key: CatalogKey,
  configText: string | null,
  opts?: { modelId?: string; expected?: string },
): Promise<ModelIntegrityRecord> {
  const entry = MODEL_CATALOG[key];
  const modelId = opts?.modelId ?? entry.modelId;
  const expectedHash = opts?.expected ?? entry.expectedConfigSha256;
  const ts = new Date().toISOString();
  let rec: ModelIntegrityRecord;

  if (configText === null) {
    rec = {
      key, modelId, status: "missing",
      expected: expectedHash, actual: null,
      message: "Geen config beschikbaar; model niet geverifieerd.", timestamp: ts,
    };
  } else {
    const actual = await sha256Hex(configText);
    if (isPlaceholder(expectedHash)) {
      rec = {
        key, modelId, status: "placeholder",
        expected: expectedHash, actual,
        message: `Hash gemeten (${actual.slice(0, 12)}...). Catalog bevat placeholder. Productie BLOCK.`,
        timestamp: ts,
      };
    } else if (isLocalPin(expectedHash)) {
      const pin = verifyLocalPin(expectedHash, actual);
      rec = {
        key, modelId, status: pin.status,
        expected: expectedHash, actual,
        message: pin.message,
        timestamp: ts,
      };
    } else if (actual === expectedHash) {
      rec = {
        key, modelId, status: "verified",
        expected: expectedHash, actual,
        message: "SHA-256 match; modelconfig integer.", timestamp: ts,
      };
    } else {
      rec = {
        key, modelId, status: "mismatch",
        expected: expectedHash, actual,
        message: "SHA-256 mismatch; model afgewezen. Egress geblokkeerd.", timestamp: ts,
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
