import type { PiiSpan, PiiCategory, PrivacySignals, RiskLevel } from "./types";
import { runRegistrySync } from "./detectorRegistry";
import { mergeSpans } from "./mergeSpans";
import { DEFAULT_DETECTION_SETTINGS, coerceDetectionSettings, type DetectionLayerSettings } from "./detectionSettings";

const HIGH_SEVERITY: ReadonlySet<string> = new Set([
  "bsn", "iban", "email", "phone", "address", "student_id",
  "credit_card", "license_plate", "birthdate_text", "id_document",
]);

export function computeSignals(
  text: string,
  extraSpans: PiiSpan[] = [],
  detectionSettings: DetectionLayerSettings | string = DEFAULT_DETECTION_SETTINGS,
  disabledCategories?: ReadonlySet<PiiCategory>,
): PrivacySignals {
  const settings = coerceDetectionSettings(detectionSettings);
  // Sync registry: Regex + Lexicon + Context. BERT spans are passed as extraSpans.
  const baseSpans = runRegistrySync(text, settings);
  // Source-aware merge: hard regex identifiers stay authoritative; BERT can add
  // coverage and wider name/location spans instead of replacing structured hits.
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

  const cats = new Set(spans.map((s) => s.category));
  if (cats.has("name") && cats.has("school")) { score += 0.15; reasons.push("naam + school"); }
  if (cats.has("context_care") && cats.has("name")) { score += 0.20; reasons.push("zorg + naam"); }
  if (cats.has("context_incident")) { score += 0.10; reasons.push("incident-context"); }
  if (cats.has("context_small_group") && (cats.has("name") || cats.has("context_role"))) {
    score += 0.18; reasons.push("kleine groep + identifier");
  }
  if (cats.has("context_protected_class")) {
    score += 0.25; reasons.push("bijzondere persoonsgegevens");
  }
  if (cats.has("context_health")) {
    score += 0.20; reasons.push("gezondheidsinformatie");
  }
  if (cats.has("context_legal")) {
    score += 0.22; reasons.push("justitie-/politiecontext");
  }
  if (cats.has("context_family")) {
    score += 0.15; reasons.push("familie-/thuiscontext");
  }
  if (cats.has("context_financial")) {
    score += 0.10; reasons.push("financiële context");
  }
  if (cats.has("context_performance") && cats.has("name")) {
    score += 0.15; reasons.push("schoolprestatie + naam");
  }
  if (cats.has("context_location_specific") && cats.has("context_small_group")) {
    score += 0.10; reasons.push("specifieke locatie + kleine groep");
  }
  if (ctx.length >= 3) {
    score += 0.10; reasons.push(`${ctx.length} contextsignalen`);
  }

  if (direct.length > 0) reasons.push(`${direct.length} directe detectie(s)`);
  if (ctx.length > 0) reasons.push(`${ctx.length} contextsignaal/signalen`);

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
