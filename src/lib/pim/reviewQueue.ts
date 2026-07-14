// Review Queue, spec hfst 18 / 31.
// Wanneer de Draft Check Guard "repair" of "fail" geeft, kan de UI het
// geval naar de queue sturen. Inhoud blijft altijd lokaal (geen egress).
// Bewaart alleen metadata + de geredacteerde draft; nooit het origineel.

import type { Mode, DraftCheckResult, RiskLevel } from "./types";

export interface ReviewItem {
  id: string;
  ts: string;
  mode: Mode;
  riskLevel: RiskLevel;
  guardStatus: DraftCheckResult["status"];
  issues: string[];
  /** Laatste draft (anonymous of pseudonymous), nooit het origineel. */
  draftPreview: string;
  resolved: boolean;
}

const items = new Map<string, ReviewItem>();
const listeners = new Set<(snapshot: ReviewItem[]) => void>();

function snapshot(): ReviewItem[] {
  return Array.from(items.values()).sort((a, b) => (a.ts < b.ts ? 1 : -1));
}

function emit() {
  const s = snapshot();
  for (const l of listeners) l(s);
}

export function onReviewQueue(cb: (s: ReviewItem[]) => void): () => void {
  listeners.add(cb);
  cb(snapshot());
  return () => listeners.delete(cb);
}

export function getReviewQueue(): ReviewItem[] {
  return snapshot();
}

export function enqueueReview(input: Omit<ReviewItem, "id" | "ts" | "resolved">): ReviewItem {
  const id =
    (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ??
    `r-${Math.random().toString(36).slice(2)}`;
  const item: ReviewItem = {
    ...input,
    id,
    ts: new Date().toISOString(),
    resolved: false,
    // Hard cap op preview lengte zodat queue nooit een dossier wordt.
    draftPreview: input.draftPreview.slice(0, 400),
  };
  items.set(id, item);
  emit();
  return item;
}

export function resolveReview(id: string): void {
  const it = items.get(id);
  if (!it) return;
  items.set(id, { ...it, resolved: true });
  emit();
}

export function clearReviewQueue(): void {
  items.clear();
  emit();
}
