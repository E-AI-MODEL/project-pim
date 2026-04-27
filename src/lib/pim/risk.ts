import type { PiiSpan, PrivacySignals, RiskLevel } from "./types";
import { detectPii } from "./detectors";

const HIGH_SEVERITY: ReadonlySet<string> = new Set(["bsn", "iban", "email", "phone", "address"]);

export function computeSignals(text: string, extraSpans: PiiSpan[] = []): PrivacySignals {
  const ruleSpans = detectPii(text);
  // Merge SLM spans, drop overlaps with existing rule spans (rules win on tie).
  const merged: PiiSpan[] = [...ruleSpans];
  for (const ext of extraSpans) {
    const overlaps = merged.some((m) => !(ext.end <= m.start || ext.start >= m.end));
    if (!overlaps) merged.push(ext);
  }
  merged.sort((a, b) => a.start - b.start);
  const spans = merged;
  const direct = spans.filter((s) => !s.contextual);
  const ctx = spans.filter((s) => s.contextual);

  const reasons: string[] = [];
  const ruleIds: string[] = [];
  let score = 0;

  for (const s of direct) {
    score += HIGH_SEVERITY.has(s.category) ? 0.18 : 0.10;
    ruleIds.push(s.ruleId);
  }
  for (const s of ctx) {
    score += s.confidence * 0.12;
    ruleIds.push(s.ruleId);
  }

  // Combo amplifiers
  const cats = new Set(spans.map((s) => s.category));
  if (cats.has("name") && cats.has("school")) { score += 0.15; reasons.push("naam + school combinatie"); }
  if (cats.has("context_care") && cats.has("name")) { score += 0.20; reasons.push("zorgcontext + naam"); }
  if (cats.has("context_incident")) { score += 0.10; reasons.push("incident-context verhoogt herkenbaarheid"); }
  if (cats.has("context_small_group") && (cats.has("name") || cats.has("context_role"))) {
    score += 0.18; reasons.push("kleine groep met identifier — hoog herleidbaarheidsrisico");
  }

  if (direct.length > 0) reasons.push(`${direct.length} directe PII-detectie(s)`);
  if (ctx.length > 0) reasons.push(`${ctx.length} contextueel signaal(en)`);

  score = Math.min(1, score);
  const riskLevel: RiskLevel =
    score >= 0.65 ? "critical" : score >= 0.40 ? "high" : score >= 0.18 ? "medium" : "low";

  return {
    directPii: direct,
    contextualPii: ctx,
    riskScore: score,
    riskLevel,
    reasons,
    ruleIds: Array.from(new Set(ruleIds)),
  };
}
