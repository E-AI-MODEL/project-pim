// Project PIM — gestandaardiseerde flag table (spec hfst 37)
// Elke flag = ruleId, reasonCode, severity, default verdict.
// Geen flag bevat ooit inhoud.

export type Severity = "info" | "warn" | "block";
export type FlagVerdict = "ALLOW" | "ALLOW_WITH_WARNING" | "BLOCK";

export interface PimFlag {
  flag: PimFlagCode;
  ruleId: string;
  reasonCode: string;
  severity: Severity;
  verdict: FlagVerdict;
  description: string;
}

export const PIM_FLAGS = {
  PIM_DEBUG_LOG_BLOCK: {
    ruleId: "pim.debug.log.block",
    reasonCode: "DEBUG_LOG_FORBIDDEN",
    severity: "block",
    verdict: "BLOCK",
    description: "Debug logging van inhoud is altijd geblokkeerd.",
  },
  PIM_MODEL_INTEGRITY_BLOCK: {
    ruleId: "pim.model.integrity.block",
    reasonCode: "MODEL_INTEGRITY_FAIL",
    severity: "block",
    verdict: "BLOCK",
    description: "Verplicht model is niet verified (hash/versie/bron).",
  },
  PIM_GUARD_FAILURE_BLOCK: {
    ruleId: "pim.guard.failure.block",
    reasonCode: "GUARD_FAILED",
    severity: "block",
    verdict: "BLOCK",
    description: "Een upstream guard faalde.",
  },
  PIM_MAPPING_BLOCK: {
    ruleId: "pim.mapping.block",
    reasonCode: "MAPPING_LEAK",
    severity: "block",
    verdict: "BLOCK",
    description: "Mapping- of token-spoor in payload buiten lokale container.",
  },
  PIM_RAW_PII_BLOCK: {
    ruleId: "pim.raw.pii.block",
    reasonCode: "RAW_PII_IN_OUTPUT",
    severity: "block",
    verdict: "BLOCK",
    description: "Residuele directe PII gedetecteerd in output.",
  },
  PIM_DRAFT_NOT_CERTIFIED: {
    ruleId: "pim.draft.not.certified",
    reasonCode: "DRAFT_NOT_CERTIFIED",
    severity: "block",
    verdict: "BLOCK",
    description: "Draft Check Guard heeft draft niet gecertificeerd.",
  },
  PIM_MODE_STATUS_MISMATCH: {
    ruleId: "pim.mode.status.mismatch",
    reasonCode: "MODE_MIX",
    severity: "block",
    verdict: "BLOCK",
    description: "Mode-mix: tokens in anonymous of anonymous content in pseudonymous.",
  },
  PIM_PSEUDONYM_EXTERNAL_AI_BLOCK: {
    ruleId: "pim.pseudo.external.ai.block",
    reasonCode: "PSEUDO_EXTERNAL_AI",
    severity: "block",
    verdict: "BLOCK",
    description: "Pseudonieme output mag nooit naar externe AI.",
  },
  PIM_PSEUDONYM_EGRESS_BLOCK: {
    ruleId: "pim.pseudo.egress.block",
    reasonCode: "PSEUDO_EGRESS",
    severity: "block",
    verdict: "BLOCK",
    description: "Pseudonieme output mag de browser niet verlaten.",
  },
  PIM_PSEUDONYM_SAVE_REQUIRES_ENCRYPTION: {
    ruleId: "pim.pseudo.save.encryption",
    reasonCode: "PSEUDO_SAVE_PLAIN",
    severity: "block",
    verdict: "BLOCK",
    description: "Pseudonieme save vereist AES-GCM encryptie.",
  },
  PIM_TOKEN_IN_ANONYMOUS_BLOCK: {
    ruleId: "pim.token.in.anonymous.block",
    reasonCode: "TOKEN_IN_ANON",
    severity: "block",
    verdict: "BLOCK",
    description: "Pseudonieme token gevonden in anonymous output.",
  },
  PIM_ANONYMOUS_RESTORE_BLOCK: {
    ruleId: "pim.anon.restore.block",
    reasonCode: "ANON_NO_MAPPING",
    severity: "block",
    verdict: "BLOCK",
    description: "Anonymous mode heeft geen mapping — restore is per ontwerp onmogelijk.",
  },
  PIM_EXTERNAL_AI_RISK_BLOCK: {
    ruleId: "pim.external.ai.risk.block",
    reasonCode: "EXTERNAL_AI_RISK",
    severity: "block",
    verdict: "BLOCK",
    description: "Risk score boven drempel voor externe AI.",
  },
  PIM_EXPORT_RISK_BLOCK: {
    ruleId: "pim.export.risk.block",
    reasonCode: "EXPORT_RISK",
    severity: "block",
    verdict: "BLOCK",
    description: "Risk score boven drempel voor export.",
  },
  PIM_COPY_SHARE_RISK_BLOCK: {
    ruleId: "pim.copy.share.risk.block",
    reasonCode: "COPY_SHARE_RISK",
    severity: "block",
    verdict: "BLOCK",
    description: "Risk score boven drempel voor copy/share/print.",
  },
  PIM_SPECIAL_CONTEXT_EGRESS_BLOCK: {
    ruleId: "pim.special.context.egress",
    reasonCode: "SPECIAL_CONTEXT",
    severity: "block",
    verdict: "BLOCK",
    description: "Speciale onderwijscontext blokkeert egress (kleine groep + zorg).",
  },
  PIM_DEFAULT_BLOCK: {
    ruleId: "pim.default.block",
    reasonCode: "DEFAULT_BLOCK",
    severity: "block",
    verdict: "BLOCK",
    description: "Bij twijfel — fail-closed default.",
  },
  PIM_RISK_NEAR_THRESHOLD_WARN: {
    ruleId: "pim.risk.near.threshold",
    reasonCode: "RISK_NEAR_THRESHOLD",
    severity: "warn",
    verdict: "ALLOW_WITH_WARNING",
    description: "Risk dicht bij drempel — handmatige review aanbevolen.",
  },
  PIM_PSEUDO_LOCAL_ONLY_WARN: {
    ruleId: "pim.pseudo.local.only",
    reasonCode: "PSEUDO_LOCAL_ONLY",
    severity: "warn",
    verdict: "ALLOW_WITH_WARNING",
    description: "Pseudonieme verwerking — alleen lokaal toegestaan.",
  },
  PIM_DRAFT_REPAIR_WARN: {
    ruleId: "pim.draft.repair",
    reasonCode: "DRAFT_REPAIR",
    severity: "warn",
    verdict: "ALLOW_WITH_WARNING",
    description: "Draft kan verbeterd worden — repair loop voorgesteld.",
  },
  PIM_OK: {
    ruleId: "pim.ok",
    reasonCode: "OK",
    severity: "info",
    verdict: "ALLOW",
    description: "Toegestaan binnen huidige modus, drempel en guards.",
  },
  PIM_RULES_ONLY_EXTERNAL_AI_BLOCK: {
    ruleId: "pim.rules.only.external.ai",
    reasonCode: "RULES_ONLY_NO_EXTERNAL",
    severity: "block",
    verdict: "BLOCK",
    description: "Rules-only profiel mag geen externe AI gebruiken — modelcoverage te beperkt.",
  },
  PIM_RULES_ONLY_EXPORT_BLOCK: {
    ruleId: "pim.rules.only.export",
    reasonCode: "RULES_ONLY_NO_EXPORT",
    severity: "block",
    verdict: "BLOCK",
    description: "Rules-only profiel mag geen bestanden exporteren — beperkte detectie.",
  },
  PIM_PROFILE_DESIGN_ONLY_BLOCK: {
    ruleId: "pim.profile.design.only",
    reasonCode: "PROFILE_DESIGN_ONLY",
    severity: "block",
    verdict: "BLOCK",
    description: "Profiel is ontwerpvoorbereiding — geen egress toegestaan.",
  },
  PIM_PAYLOAD_TYPE_EGRESS_BLOCK: {
    ruleId: "pim.payload.type.egress",
    reasonCode: "PAYLOAD_TYPE_FORBIDDEN",
    severity: "block",
    verdict: "BLOCK",
    description: "Alleen `draft_anonymous_certified` mag de browser verlaten.",
  },
  PIM_BERT_OFF_EGRESS_WARN: {
    ruleId: "pim.bert.off.egress.warn",
    reasonCode: "BERT_OFF_EGRESS",
    severity: "warn",
    verdict: "ALLOW_WITH_WARNING",
    description:
      "BERT staat uit — detectie is mogelijk niet volledig. Zet strikte modus aan om dit te blokkeren.",
  },
} as const satisfies Record<string, Omit<PimFlag, "flag">>;

export type PimFlagCode = keyof typeof PIM_FLAGS;

export function flag(code: PimFlagCode): PimFlag {
  return { flag: code, ...PIM_FLAGS[code] };
}
