import type { PiiSpan, PiiCategory, PrivacySignals, RiskLevel } from "./types";
import { runRegistrySync } from "./detectorRegistry";
import { mergeSpans } from "./mergeSpans";
import { DEFAULT_PROFILE, type PipelineProfileId } from "./pipelineProfile";

const HIGH_SEVERITY: ReadonlySet<string> = new Set([
  "bsn", "iban", "email", "phone", "address", "student_id",
  "credit_card", "license_plate", "birthdate_text", "id_document",
]);

export function computeSignals(
  text: string,
  extraSpans: PiiSpan[] = [],
  profileId: PipelineProfileId = DEFAULT_PROFILE,
  disabledCategories?: ReadonlySet<PiiCategory>,
): PrivacySignals {
  // Sync registry: regex + special lexicon + heuristic contextSlm (per profiel).
  const baseSpans = runRegistrySync(text, profileId);
  // Bron-bewuste merge (spoor A): regex-identifiers autoritair, naam-dekking
  // van regex + SLM versterkt elkaar i.p.v. te concurreren op confidence.
  const spans = mergeSpans([...baseSpans, ...extraSpans], disabledCategories);
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
  // Bijzondere persoonsgegevens (GDPR Art 9) — verhoogt drastisch.
  if (cats.has("context_protected_class")) {
    score += 0.25; reasons.push("bijzondere persoonsgegevens (etniciteit/religie/oriëntatie) — GDPR Art 9");
  }
  if (cats.has("context_health")) {
    score += 0.20; reasons.push("gezondheidsinformatie — GDPR Art 9");
  }
  if (cats.has("context_legal")) {
    score += 0.22; reasons.push("justitie-/politiecontext — gevoelig");
  }
  if (cats.has("context_family")) {
    score += 0.15; reasons.push("familie-/thuiscontext verhoogt herleidbaarheid");
  }
  if (cats.has("context_financial")) {
    score += 0.10; reasons.push("financiële context");
  }
  if (cats.has("context_performance") && cats.has("name")) {
    score += 0.15; reasons.push("schoolprestatie + naam — direct herleidbaar");
  }
  if (cats.has("context_location_specific") && cats.has("context_small_group")) {
    score += 0.10; reasons.push("specifieke locatie + kleine groep");
  }
  // Algemene combo: ≥3 contextuele signalen → herleidbaarheid loopt hard op.
  if (ctx.length >= 3) {
    score += 0.10; reasons.push(`${ctx.length} contextsignalen stapelen — herleidbaarheid stijgt`);
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
