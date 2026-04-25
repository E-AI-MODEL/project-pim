import type { Action, Mode, PimDecision, PrivacySignals, DraftCheckResult } from "./types";

export const POLICY_VERSION = "pim.policy/v2.0";

const ANON_THRESHOLDS: Record<Action, number> = {
  send_external_ai: 0.18,
  export_file: 0.25,
  print: 0.30,
  copy: 0.30,
  share: 0.30,
  save_local: 0.55,
  display: 0.65,
  restore: 0, // not allowed in anonymous anyway
};

interface DecideInput {
  mode: Mode;
  action: Action;
  signals: PrivacySignals;
  draftCheck: DraftCheckResult;
  modelVerified: boolean;
}

export function decide({ mode, action, signals, draftCheck, modelVerified }: DecideInput): PimDecision {
  const base = {
    policyVersion: POLICY_VERSION,
    riskLevel: signals.riskLevel,
    mode,
    action,
    timestamp: new Date().toISOString(),
  };

  // Fail-closed: integrity gate
  if (!modelVerified) {
    return { ...base, verdict: "BLOCK", reason: "Model integrity gate failed — required model not verified.", reasonCode: "MODEL_INTEGRITY_FAIL", ruleId: "pim.gate.model" };
  }
  if (draftCheck.status === "fail") {
    return { ...base, verdict: "BLOCK", reason: `Draft Check Guard failed: ${draftCheck.issues[0]}`, reasonCode: "DRAFT_GUARD_FAIL", ruleId: "pim.gate.draft" };
  }

  // Pseudonymous rules — egress forbidden
  if (mode === "pseudonymous") {
    const forbidden: Action[] = ["copy", "export_file", "print", "share", "send_external_ai"];
    if (forbidden.includes(action)) {
      return { ...base, verdict: "BLOCK", reason: "Pseudonieme output mag de browser niet verlaten. Mapping en tokens blijven lokaal.", reasonCode: "PSEUDO_EGRESS_FORBIDDEN", ruleId: "pim.mode.pseudo.egress" };
    }
    if (action === "display" || action === "save_local" || action === "restore") {
      return { ...base, verdict: "ALLOW_WITH_WARNING", reason: "Pseudonieme verwerking is alleen lokaal toegestaan. Niet exporteren of delen.", reasonCode: "PSEUDO_LOCAL_ONLY", ruleId: "pim.mode.pseudo.local" };
    }
  }

  // Anonymous rules
  if (mode === "anonymous") {
    if (action === "restore") {
      return { ...base, verdict: "BLOCK", reason: "Anonymous mode heeft geen mapping. Restore is per ontwerp onmogelijk.", reasonCode: "ANON_NO_MAPPING", ruleId: "pim.mode.anon.restore" };
    }
    const threshold = ANON_THRESHOLDS[action];
    if (signals.riskScore > threshold) {
      return { ...base, verdict: "BLOCK", reason: `Risk score ${(signals.riskScore * 100).toFixed(0)}% boven drempel ${(threshold * 100).toFixed(0)}% voor "${action}".`, reasonCode: "RISK_ABOVE_THRESHOLD", ruleId: `pim.threshold.${action}` };
    }
    if (signals.riskScore > threshold * 0.7) {
      return { ...base, verdict: "ALLOW_WITH_WARNING", reason: "Risk dicht bij drempel — handmatige review aanbevolen.", reasonCode: "RISK_NEAR_THRESHOLD", ruleId: `pim.threshold.${action}.warn` };
    }
  }

  if (draftCheck.status === "repair") {
    return { ...base, verdict: "ALLOW_WITH_WARNING", reason: `Draft kan verbeterd worden: ${draftCheck.issues[0]}`, reasonCode: "DRAFT_REPAIR", ruleId: "pim.gate.draft.repair" };
  }

  return { ...base, verdict: "ALLOW", reason: "Toegestaan binnen huidige modus, drempel en guards.", reasonCode: "OK", ruleId: "pim.allow" };
}
