import { MODEL_CATALOG, type CatalogKey } from "./modelCatalog";

export type ModelIntegrityStatus =
  | "unverified"
  | "placeholder"
  | "verified"
  | "mismatch"
  | "missing";

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
  for (const listener of listeners) listener(snap);
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

/**
 * True als een verwachte hash een echte, statische productiehash is
 * (dus geen browser-local pin en geen placeholder).
 */
export function hasStaticProductionHash(expected: string): boolean {
  return !isLocalPin(expected) && !isPlaceholder(expected);
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

function verifyLocalPin(
  expectedHash: string,
  actual: string,
): { status: "verified" | "mismatch" | "missing"; message: string } {
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

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

interface ArtifactVerdict {
  status: ModelIntegrityStatus;
  actual: string | null;
  message: string;
}

/** Vergelijkt één artefact (config of tokenizer) met zijn verwachte hash. */
async function evaluateArtifact(
  label: string,
  expectedHash: string,
  text: string | null,
): Promise<ArtifactVerdict> {
  if (text === null) {
    return {
      status: "missing",
      actual: null,
      message: `Geen ${label} beschikbaar; model niet geverifieerd.`,
    };
  }

  const actual = await sha256Hex(text);

  if (isPlaceholder(expectedHash)) {
    return {
      status: "placeholder",
      actual,
      message: `Hash ${label} gemeten (${actual.slice(0, 12)}...). Catalog bevat placeholder. Productie BLOCK.`,
    };
  }
  if (isLocalPin(expectedHash)) {
    const pin = verifyLocalPin(expectedHash, actual);
    return { status: pin.status, actual, message: pin.message };
  }
  if (actual === expectedHash) {
    return { status: "verified", actual, message: `SHA-256 match; ${label} integer.` };
  }
  return {
    status: "mismatch",
    actual,
    message: `SHA-256 mismatch op ${label}; model afgewezen. Egress geblokkeerd.`,
  };
}

export async function verifyModel(
  key: CatalogKey,
  configText: string | null,
  opts?: {
    modelId?: string;
    expected?: string;
    /** Tokenizerbestand; alleen meegegeven wanneer de catalogus er een hash voor kent. */
    tokenizerText?: string | null;
    expectedTokenizer?: string;
  },
): Promise<ModelIntegrityRecord> {
  const entry = MODEL_CATALOG[key];
  const modelId = opts?.modelId ?? entry.modelId;
  const expectedHash = opts?.expected ?? entry.expectedConfigSha256;
  const ts = new Date().toISOString();

  const config = await evaluateArtifact("config.json", expectedHash, configText);

  let status = config.status;
  let message = config.message;
  let expected = expectedHash;
  let actual = config.actual;

  if (opts?.expectedTokenizer) {
    const tokenizer = await evaluateArtifact(
      "tokenizer.json",
      opts.expectedTokenizer,
      opts.tokenizerText ?? null,
    );
    expected = `${expectedHash}+${opts.expectedTokenizer}`;
    actual = actual === null ? null : `${actual}+${tokenizer.actual ?? "null"}`;
    if (tokenizer.status !== "verified") {
      status = tokenizer.status;
      message = tokenizer.message;
    } else if (status === "verified") {
      message = "SHA-256 match; config.json en tokenizer.json integer.";
    }
  }

  const rec: ModelIntegrityRecord = {
    key,
    modelId,
    status,
    expected,
    actual,
    message,
    timestamp: ts,
  };

  REGISTRY.set(key, rec);
  emit();
  return rec;
}

export function isProductionVerified(key: CatalogKey): boolean {
  const rec = REGISTRY.get(key);
  return rec?.status === "verified";
}

export function isDemoAcceptable(key: CatalogKey): boolean {
  const rec = REGISTRY.get(key);
  return rec?.status === "verified" || rec?.status === "placeholder";
}

export function _resetIntegrityRegistry() {
  REGISTRY.clear();
  emit();
}
