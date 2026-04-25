// Secure Mapping Container — AES-GCM via WebCrypto.
// Spec hfst 20: mapping mag NOOIT in gewone state. UI krijgt alleen een handle.

const KEY_USAGES: KeyUsage[] = ["encrypt", "decrypt"];

export interface MappingHandle {
  id: string;            // opaque handle naar de container
  tokenCount: number;    // aantal tokens (metadata, geen inhoud)
  createdAt: string;
}

interface InternalContainer {
  key: CryptoKey;
  // Map<token, ciphertext>; iv per entry
  entries: Map<string, { iv: Uint8Array; ct: ArrayBuffer }>;
}

// Module-private register — niet exporteerbaar, niet in React state.
const REGISTER = new Map<string, InternalContainer>();

function randomId(): string {
  const buf = new Uint8Array(12);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, KEY_USAGES);
}

const enc = new TextEncoder();
const dec = new TextDecoder();

export async function createMappingContainer(plain: Map<string, string>): Promise<MappingHandle> {
  const key = await generateKey();
  const entries = new Map<string, { iv: Uint8Array; ct: ArrayBuffer }>();
  for (const [token, original] of plain) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(original));
    entries.set(token, { iv, ct });
  }
  const id = randomId();
  REGISTER.set(id, { key, entries });
  return { id, tokenCount: entries.size, createdAt: new Date().toISOString() };
}

/** Restore is alleen lokaal en alleen via de handle. */
export async function restoreFromContainer(handle: MappingHandle, draft: string): Promise<string> {
  const c = REGISTER.get(handle.id);
  if (!c) throw new Error("[PIM] Container not found — restore blocked.");
  let out = draft;
  // Decrypt every token referenced in draft
  for (const [token, { iv, ct }] of c.entries) {
    if (out.indexOf(token) === -1) continue;
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, c.key, ct);
    const original = dec.decode(pt);
    out = out.split(token).join(original);
  }
  return out;
}

/** Inspectie: alleen tokens (sleutels), nooit originelen. */
export function listTokens(handle: MappingHandle): string[] {
  const c = REGISTER.get(handle.id);
  return c ? [...c.entries.keys()] : [];
}

export function destroyContainer(handle: MappingHandle): void {
  REGISTER.delete(handle.id);
}

export function containerExists(handle: MappingHandle): boolean {
  return REGISTER.has(handle.id);
}
