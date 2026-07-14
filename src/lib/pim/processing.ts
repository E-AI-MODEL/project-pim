import type { DraftCandidate, Mode, PrivacySignals, PiiSpan, DraftCheckResult } from "./types";
import { detectPii } from "./detectors";
import { runRegistry, runRegistrySync } from "./detectorRegistry";
import {
  DEFAULT_DETECTION_SETTINGS,
  coerceDetectionSettings,
  type DetectionLayerSettings,
} from "./detectionSettings";

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
  id_document: "[documentnummer]",
  credit_card: "[creditcard]",
  license_plate: "[kenteken]",
  url: "[link]",
  ip_address: "[ip-adres]",
  social_handle: "[handle]",
  birthdate_text: "[geboortedatum]",
  context_small_group: "[groep]",
  context_care: "[zorgcontext]",
  context_incident: "[incident]",
  context_role: "[rol]",
  context_health: "[gezondheid]",
  context_family: "[gezinscontext]",
  context_legal: "[justitiecontext]",
  context_financial: "[financiële context]",
  context_protected_class: "[bijzondere categorie]",
  context_performance: "[schoolprestatie]",
  context_location_specific: "[locatie]",
};

function applySpans(
  text: string,
  spans: PiiSpan[],
  replace: (s: PiiSpan, i: number) => string,
): string {
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
    issues.push(
      `Residuele directe PII gedetecteerd in output: ${residual.map((r) => r.category).join(", ")}`,
    );
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
      issues.push(
        `Hallucinerende tokens (niet uit mapping): ${hallucinated.slice(0, 3).join(", ")}`,
      );
    }
  }

  if (issues.length === 0) return { status: "pass", issues: [] };
  const hardFail = issues.some((i) => i.includes("Residuele") || i.includes("mode-mix"));
  const residualCategories = residual.map((r) => r.category as string);
  const halluCount =
    mode === "pseudonymous" && draft.expectedTokens
      ? tokens.filter((t) => !new Set(draft.expectedTokens!).has(t)).length
      : 0;
  return {
    status: hardFail ? "fail" : "repair",
    issues,
    residualCategories: residualCategories.length ? residualCategories : undefined,
    hallucinatedTokenCount: halluCount || undefined,
    modeMix: mode === "anonymous" && tokens.length > 0,
  };
}

/**
 * DraftCheck via detectorRegistry so output checks use the same layers as input.
 */
export async function draftCheckWithRegistry(
  draft: DraftCandidate,
  mode: Mode,
  detectionSettings: DetectionLayerSettings | string = DEFAULT_DETECTION_SETTINGS,
  options: { async?: boolean } = {},
): Promise<DraftCheckResult> {
  const settings = coerceDetectionSettings(detectionSettings);
  const enableAsync = options.async ?? true;
  const spans = enableAsync
    ? await runRegistry(draft.text, { detectionSettings: settings, enableAsync: true })
    : runRegistrySync(draft.text, settings);
  const residual = spans.filter((s) => !s.contextual);
  const issues: string[] = [];
  if (residual.length > 0) {
    issues.push(
      `Residuele directe PII gedetecteerd in output: ${residual.map((r) => r.category).join(", ")}`,
    );
  }
  const tokenLikePattern = /\[[A-Z_]+_\d{3}\]/g;
  const tokens = draft.text.match(tokenLikePattern) ?? [];
  if (mode === "anonymous" && tokens.length > 0) {
    issues.push("Pseudonieme tokens gevonden in anonymous output (mode-mix)");
  }
  let halluCount = 0;
  if (mode === "pseudonymous" && draft.expectedTokens) {
    const expected = new Set(draft.expectedTokens);
    const hallu = tokens.filter((t) => !expected.has(t));
    halluCount = hallu.length;
    if (hallu.length > 0) {
      issues.push(`Hallucinerende tokens (niet uit mapping): ${hallu.slice(0, 3).join(", ")}`);
    }
  }
  if (issues.length === 0) return { status: "pass", issues: [] };
  const hardFail = issues.some((i) => i.includes("Residuele") || i.includes("mode-mix"));
  return {
    status: hardFail ? "fail" : "repair",
    issues,
    residualCategories: residual.map((r) => r.category as string),
    hallucinatedTokenCount: halluCount || undefined,
    modeMix: mode === "anonymous" && tokens.length > 0,
  };
}
