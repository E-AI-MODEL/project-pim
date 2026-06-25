import { MODEL_CATALOG, type CatalogKey } from "./modelCatalog";

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
      key,
      modelId,
      status: "missing",
      expected: expectedHash,
      actual: null,
      message: "Geen config beschikbaar; model niet geverifieerd.",
      timestamp: ts,
    };
  } else {
    const actual = await sha256Hex(configText);
    if (isPlaceholder(expectedHash)) {
      rec = {
        key,
        modelId,
        status: "placeholder",
        expected: expectedHash,
        actual,
        message: `Hash gemeten (${actual.slice(0, 12)}...). Catalog bevat placeholder. Productie BLOCK.`,
        timestamp: ts,
      };
    } else if (isLocalPin(expectedHash)) {
      const pin = verifyLocalPin(expectedHash, actual);
      rec = {
        key,
        modelId,
        status: pin.status,
        expected: expectedHash,
        actual,
        message: pin.message,
        timestamp: ts,
      };
    } else if (actual === expectedHash) {
      rec = {
        key,
        modelId,
        status: "verified",
        expected: expectedHash,
        actual,
        message: "SHA-256 match; modelconfig integer.",
        timestamp: ts,
      };
    } else {
      rec = {
        key,
        modelId,
        status: "mismatch",
        expected: expectedHash,
        actual,
        message: "SHA-256 mismatch; model afgewezen. Egress geblokkeerd.",
        timestamp: ts,
      };
    }
  }

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
