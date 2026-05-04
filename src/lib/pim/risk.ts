import type { PiiSpan, PrivacySignals, RiskLevel } from "./types";
import { runRegistrySync } from "./detectorRegistry";
import { DEFAULT_PROFILE, type PipelineProfileId } from "./pipelineProfile";

const HIGH_SEVERITY: ReadonlySet<string> = new Set(["bsn", "iban", "email", "phone", "address", "student_id"]);

export function computeSignals(
  text: string,
  extraSpans: PiiSpan[] = [],
  profileId: PipelineProfileId = DEFAULT_PROFILE,
): PrivacySignals {
  // Sync registry: regex + special lexicon + heuristic contextSlm (per profiel).
  const baseSpans = runRegistrySync(text, profileId);
  // Merge alle spans (base + async/SLM extras). Bij overlap wint hoogste confidence.
  const all: PiiSpan[] = [...baseSpans, ...extraSpans];
  all.sort((a, b) => a.start - b.start || b.confidence - a.confidence);
  const merged: PiiSpan[] = [];
  for (const s of all) {
    const last = merged[merged.length - 1];
    if (last && s.start < last.end) {
      if (s.confidence > last.confidence) merged[merged.length - 1] = s;
      continue;
    }
    merged.push(s);
  }
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
