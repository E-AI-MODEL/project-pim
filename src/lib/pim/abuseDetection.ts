// Abuse Detection — spec hfst 19 / v3-2.
// Doel: voorkomen dat de sandbox als anonimiseer-machine wordt gebruikt voor
// massa-PII of repetitieve scrape-achtige inputs. Heuristisch, lokaal, geen
// netwerkcalls. Resultaat is een score + reden die de UI/policy kan tonen.

import type { PrivacySignals } from "./types";

export type AbuseLevel = "ok" | "watch" | "throttle" | "block";

export interface AbuseSignal {
  level: AbuseLevel;
  score: number;        // 0..1
  reasons: string[];
  metrics: {
    submissionsPerMinute: number;
    duplicateRatio: number;
    piiDensity: number;   // PII-spans per 100 tokens
    inputLengthChars: number;
  };
}

const RATE_WINDOW_MS = 60_000;
const MAX_SAMPLES = 50;
const submissions: { ts: number; hash: string; len: number }[] = [];

function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16);
}

/**
 * Record a sandbox submission and compute the current abuse signal.
 * Pure-local: nothing leaves the browser.
 */
export function recordSubmission(text: string, signals: PrivacySignals): AbuseSignal {
  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  // GC oude entries
  while (submissions.length > 0 && submissions[0].ts < cutoff) submissions.shift();
  // Cap geheugengebruik
  if (submissions.length >= MAX_SAMPLES) submissions.shift();

  const hash = fnv1a(text.trim());
  submissions.push({ ts: now, hash, len: text.length });

  const recent = submissions.filter((s) => s.ts >= cutoff);
  const submissionsPerMinute = recent.length;
  const duplicates = recent.filter((s) => s.hash === hash).length;
  const duplicateRatio = recent.length > 0 ? duplicates / recent.length : 0;
  const tokens = Math.max(1, text.split(/\s+/).filter(Boolean).length);
  const piiCount = signals.directPii.length + signals.contextualPii.length;
  const piiDensity = (piiCount / tokens) * 100;

  const reasons: string[] = [];
  let score = 0;

  if (submissionsPerMinute > 30) { score += 0.5; reasons.push(`Hoge submission-rate: ${submissionsPerMinute}/min`); }
  else if (submissionsPerMinute > 15) { score += 0.25; reasons.push(`Verhoogde submission-rate: ${submissionsPerMinute}/min`); }

  if (duplicateRatio > 0.6 && recent.length > 5) {
    score += 0.3; reasons.push(`Hoge herhaling: ${(duplicateRatio * 100).toFixed(0)}% identieke inputs`);
  }

  if (piiDensity > 25) { score += 0.3; reasons.push(`Zeer hoge PII-dichtheid: ${piiDensity.toFixed(0)} per 100 tokens`); }
  else if (piiDensity > 12) { score += 0.15; reasons.push(`Verhoogde PII-dichtheid: ${piiDensity.toFixed(0)} per 100 tokens`); }

  if (text.length > 8000) { score += 0.15; reasons.push(`Zeer lange input (${text.length.toLocaleString("nl-NL")} chars)`); }

  const clamped = Math.min(1, score);
  const level: AbuseLevel =
    clamped >= 0.75 ? "block" :
    clamped >= 0.5  ? "throttle" :
    clamped >= 0.25 ? "watch" : "ok";

  return {
    level, score: clamped, reasons,
    metrics: { submissionsPerMinute, duplicateRatio, piiDensity, inputLengthChars: text.length },
  };
}

/** Reset (voor tests of expliciete user-clear). */
export function resetAbuseHistory(): void {
  submissions.length = 0;
}