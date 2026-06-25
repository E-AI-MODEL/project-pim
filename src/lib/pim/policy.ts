import type { Action, Mode, PimDecision, PrivacySignals, DraftCheckResult, PayloadType } from "./types";
import { PIM_FLAGS, type PimFlagCode } from "./flags";
import { DEFAULT_DETECTION_SETTINGS, type DetectionLayerSettings } from "./detectionSettings";

export const POLICY_VERSION = "pim.policy/v3-profile-free";

export const DEFAULT_ANON_THRESHOLDS: Record<Action, number> = {
  send_external_ai: 0.18,
  export_file: 0.25,
  print: 0.30,
  copy: 0.30,
  share: 0.30,
  save_local: 0.55,
  display: 0.65,
  restore: 0,
};

export interface DecideInput {
  mode: Mode;
  action: Action;
  signals: PrivacySignals;
  draftCheck: DraftCheckResult;
  modelVerified: boolean;
  detectionSettings?: DetectionLayerSettings;
  /** Type payload waarvoor besluit gevraagd wordt (spec §4.7). */
  payloadType: PayloadType;
  /** Optionele runtime-overrides van de risico-drempels per actie (Techdetails). */
  thresholdOverrides?: Partial<Record<Action, number>>;
}

function fromFlag(
  code: PimFlagCode,
  base: Pick<PimDecision, "mode" | "action" | "riskLevel" | "policyVersion" | "timestamp" | "payloadType" | "detectionSettings">,
  reason?: string,
): PimDecision {
  const f = PIM_FLAGS[code];
  return {
    ...base,
    verdict: f.verdict,
    reason: reason ?? f.description,
    reasonCode: f.reasonCode,
    ruleId: f.ruleId,
    flag: code,
  };
}

const EGRESS_ACTIONS: ReadonlySet<Action> = new Set([
  "copy", "export_file", "print", "share", "send_external_ai",
]);

export function decide({
  mode, action, signals, draftCheck, modelVerified,
  detectionSettings = DEFAULT_DETECTION_SETTINGS,
  payloadType, thresholdOverrides,
}: DecideInput): PimDecision {
  const base = {
    policyVersion: POLICY_VERSION,
    riskLevel: signals.riskLevel,
    mode,
    action,
    timestamp: new Date().toISOString(),
    detectionSettings,
    payloadType,
  };

  const isEgressAction = EGRESS_ACTIONS.has(action);

  // Payload-gate: alleen certified anonymous drafts mogen de browser uit.
  if (isEgressAction && payloadType !== "draft_anonymous_certified") {
    return fromFlag("PIM_PAYLOAD_TYPE_EGRESS_BLOCK", base,
      `Payload-type '${payloadType}' mag de browser niet verlaten — alleen 'draft_anonymous_certified'.`);
  }

  // Fail-closed gates first.
  if (!modelVerified) return fromFlag("PIM_MODEL_INTEGRITY_BLOCK", base);
  if (draftCheck.status === "fail") {
    const issue = draftCheck.issues[0] ?? "";
    if (issue.toLowerCase().includes("residuele")) return fromFlag("PIM_RAW_PII_BLOCK", base, issue);
    if (issue.toLowerCase().includes("mode-mix")) return fromFlag("PIM_MODE_STATUS_MISMATCH", base, issue);
    return fromFlag("PIM_GUARD_FAILURE_BLOCK", base, issue);
  }

  // Pseudonymous stays local.
  if (mode === "pseudonymous") {
    if (action === "send_external_ai") return fromFlag("PIM_PSEUDONYM_EXTERNAL_AI_BLOCK", base);
    const forbidden: Action[] = ["copy", "export_file", "print", "share"];
    if (forbidden.includes(action)) return fromFlag("PIM_PSEUDONYM_EGRESS_BLOCK", base);
    if (action === "display" || action === "save_local" || action === "restore") {
      return fromFlag("PIM_PSEUDO_LOCAL_ONLY_WARN", base);
    }
  }

  // Anonymous.
  if (mode === "anonymous") {
    if (action === "restore") return fromFlag("PIM_ANONYMOUS_RESTORE_BLOCK", base);

    const cats = new Set([...signals.directPii, ...signals.contextualPii].map((s) => s.category));
    const specialCombo = cats.has("context_small_group") && (cats.has("context_care") || cats.has("context_incident"));
    if (specialCombo && isEgressAction) return fromFlag("PIM_SPECIAL_CONTEXT_EGRESS_BLOCK", base);

    const threshold = thresholdOverrides?.[action] ?? DEFAULT_ANON_THRESHOLDS[action];
    if (signals.riskScore > threshold) {
      const code: PimFlagCode =
        action === "send_external_ai" ? "PIM_EXTERNAL_AI_RISK_BLOCK" :
        action === "export_file" ? "PIM_EXPORT_RISK_BLOCK" :
        ["copy","print","share"].includes(action) ? "PIM_COPY_SHARE_RISK_BLOCK" :
        "PIM_DEFAULT_BLOCK";
      return fromFlag(code, base, `Risk ${(signals.riskScore * 100).toFixed(0)}% > drempel ${(threshold * 100).toFixed(0)}% voor "${action}".`);
    }
    if (signals.riskScore > threshold * 0.7 && threshold > 0) {
      return fromFlag("PIM_RISK_NEAR_THRESHOLD_WARN", base);
    }
  }

  if (draftCheck.status === "repair") return fromFlag("PIM_DRAFT_REPAIR_WARN", base, draftCheck.issues[0]);

  return fromFlag("PIM_OK", base);
}
