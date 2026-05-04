import type { DraftCandidate, Mode, PrivacySignals, PiiSpan, DraftCheckResult } from "./types";
import { detectPii } from "./detectors";

const GENERALIZATIONS: Record<string, string> = {
  email: "[email]",
  phone: "[telefoonnummer]",
  bsn: "[bsn]",
  iban: "[iban]",
  postcode: "[postcode]",
  name: "[persoon]",
  school: "[school]",
  date: "[datum]",
  address: "[adres]",
  student_id: "[leerlingnummer]",
  class_code: "[klas]",
  context_small_group: "[groep]",
  context_care: "[zorgcontext]",
  context_incident: "[incident]",
  context_role: "[rol]",
};

function applySpans(text: string, spans: PiiSpan[], replace: (s: PiiSpan, i: number) => string): string {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  let out = "";
  let cursor = 0;
  sorted.forEach((s, i) => {
    if (s.start < cursor) return;
    out += text.slice(cursor, s.start) + replace(s, i);
    cursor = s.end;
  });
  out += text.slice(cursor);
  return out;
}

export function anonymize(text: string, signals: PrivacySignals): DraftCandidate {
  const all = [...signals.directPii, ...signals.contextualPii];
  const out = applySpans(text, all, (s) => GENERALIZATIONS[s.category] ?? "[geredacteerd]");
  return { mode: "anonymous", text: out, rawHadPii: all.length > 0 };
}

export interface PseudoResult {
  draft: DraftCandidate;
  mapping: Map<string, string>; // token -> original (LOCAL ONLY)
}

export function pseudonymize(text: string, signals: PrivacySignals): PseudoResult {
  const mapping = new Map<string, string>();
  const counters: Record<string, number> = {};
  const seen = new Map<string, string>(); // dedup key → token
  const all = [...signals.directPii, ...signals.contextualPii];
  const tokens: string[] = [];

  const out = applySpans(text, all, (s) => {
    const key = `${s.category}:${s.text.toLowerCase()}`;
    let token = seen.get(key);
    if (!token) {
      counters[s.category] = (counters[s.category] ?? 0) + 1;
      token = `[${s.category.toUpperCase()}_${String(counters[s.category]).padStart(3, "0")}]`;
      seen.set(key, token);
      mapping.set(token, s.text);
    }
    tokens.push(token);
    return token;
  });

  return {
    draft: { mode: "pseudonymous", text: out, expectedTokens: tokens, rawHadPii: all.length > 0 },
    mapping,
  };
}

// Draft Check Guard — runs detection on the OUTPUT
export function draftCheck(draft: DraftCandidate, mode: Mode): DraftCheckResult {
  const issues: string[] = [];
  const residual = detectPii(draft.text).filter((s) => !s.contextual);

  if (residual.length > 0) {
    issues.push(`Residuele directe PII gedetecteerd in output: ${residual.map((r) => r.category).join(", ")}`);
  }

  const tokenLikePattern = /\[[A-Z_]+_\d{3}\]/g;
  const tokens = draft.text.match(tokenLikePattern) ?? [];

  if (mode === "anonymous" && tokens.length > 0) {
    issues.push("Pseudonieme tokens gevonden in anonymous output (mode-mix)");
  }
  if (mode === "pseudonymous" && draft.expectedTokens) {
    const expectedSet = new Set(draft.expectedTokens);
    const hallucinated = tokens.filter((t) => !expectedSet.has(t));
    if (hallucinated.length > 0) {
      issues.push(`Hallucinerende tokens (niet uit mapping): ${hallucinated.slice(0, 3).join(", ")}`);
    }
  }

  if (issues.length === 0) return { status: "pass", issues: [] };
  // Residual direct PII = fail hard. Mode-mix = fail. Hallucination = repair.
  const hardFail = issues.some((i) => i.includes("Residuele") || i.includes("mode-mix"));
  return { status: hardFail ? "fail" : "repair", issues };
}
