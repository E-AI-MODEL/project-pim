// Lichtgewicht debug-emitter voor de Live Tech Monitor.
// Privacy: events bevatten ALLEEN lengtes, telcijfers, IDs en statussen —
// NOOIT ruwe input of mapping-waardes. UI-laag, geen netwerk.

export type DebugEventKind =
  | "pipeline.run"
  | "pipeline.execute"
  | "model.ner.status"
  | "model.llm.status"
  | "model.llm.rewrite"
  | "model.integrity"
  | "storage.clear"
  | "info";

export interface DebugEvent {
  ts: number;
  kind: DebugEventKind;
  msg: string;
  data?: Record<string, unknown>;
}

const BUFFER_MAX = 100;
const buffer: DebugEvent[] = [];
const listeners = new Set<(events: DebugEvent[]) => void>();

export function emitDebug(kind: DebugEventKind, msg: string, data?: Record<string, unknown>): void {
  const ev: DebugEvent = { ts: Date.now(), kind, msg, data };
  buffer.push(ev);
  if (buffer.length > BUFFER_MAX) buffer.shift();
  for (const l of listeners) l(buffer.slice());
}

export function subscribeDebug(cb: (events: DebugEvent[]) => void): () => void {
  listeners.add(cb);
  cb(buffer.slice());
  return () => { listeners.delete(cb); };
}

export function clearDebug(): void {
  buffer.length = 0;
  for (const l of listeners) l([]);
}