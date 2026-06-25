// Project PIM — core types
export type Mode = "anonymous" | "pseudonymous";
export type Action =
  | "display"
  | "copy"
  | "save_local"
  | "restore"
  | "export_file"
  | "send_external_ai"
  | "print"
  | "share";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type PiiCategory =
  | "email"
  | "phone"
  | "bsn"
  | "iban"
  | "postcode"
  | "name"
  | "school"
  | "date"
  | "address"
  | "student_id"
  | "class_code"
  | "id_document"
  | "credit_card"
  | "license_plate"
  | "url"
  | "ip_address"
  | "social_handle"
  | "birthdate_text"
  | "context_small_group"
  | "context_care"
  | "context_incident"
  | "context_role"
  | "context_health"
  | "context_family"
  | "context_legal"
  | "context_financial"
  | "context_protected_class"
  | "context_performance"
  | "context_location_specific";

export interface PiiSpan {
  start: number;
  end: number;
  text: string;
  category: PiiCategory;
  ruleId: string;
  confidence: number; // 0..1
  contextual: boolean;
}

export interface PrivacySignals {
  directPii: PiiSpan[];
  contextualPii: PiiSpan[];
  riskScore: number; // 0..1
  riskLevel: RiskLevel;
  reasons: string[];
  ruleIds: string[];
}

export interface DraftCandidate {
  mode: Mode;
  text: string;
  expectedTokens?: string[]; // for pseudonymous
  rawHadPii: boolean;
}

export interface DraftCheckResult {
  status: "pass" | "repair" | "fail";
  issues: string[];
  /** Categorieën van residuele directe PII gevonden in output (zonder ruwe tekst). */
  residualCategories?: string[];
  /** Aantal halucinerende tokens (alleen pseudonymous). */
  hallucinatedTokenCount?: number;
  /** True als output mode-mix bevat (anon-output met pseudo-tokens etc.). */
  modeMix?: boolean;
}

export type Verdict = "ALLOW" | "ALLOW_WITH_WARNING" | "BLOCK";

/**
 * PayloadType — spec hfst 28 + derde analyse §4.7.
 * Egress mag ALLEEN `draft_anonymous_certified` doorlaten. Elk ander type
 * (raw input, mapping, restored, pseudonieme draft, of `unknown`) wordt
 * door de egress guard fail-closed afgewezen, ongeacht het PIM-besluit.
 */
export type PayloadType =
  | "draft_anonymous_certified"   // anoniem + draftCheck status=pass
  | "draft_pseudonymous_local"    // pseudoniem — alleen lokaal toegestaan
  | "raw_input"                   // ruwe gebruikersinvoer
  | "mapping"                     // token→original mapping (NEVER egress)
  | "restored"                    // na restore — bevat originele PII
  | "unknown";                    // type kon niet worden vastgesteld

/**
 * CertifiedPayload — het ENIGE objecttype dat de egress guard accepteert.
 * Bevat tekst + metadata waarop fail-closed beslist kan worden.
 */
export interface CertifiedPayload {
  text: string;
  mode: Mode;
  payloadType: PayloadType;
  detectionSettings: import("./detectionSettings").DetectionLayerSettings;
  guardStatus: DraftCheckResult["status"];
}

export interface PimDecision {
  verdict: Verdict;
  reason: string;
  reasonCode: string;
  ruleId: string;
  policyVersion: string;
  riskLevel: RiskLevel;
  mode: Mode;
  action: Action;
  timestamp: string;
  flag?: string; // PIM_* flag code
  detectionSettings?: import("./detectionSettings").DetectionLayerSettings;
  /** Type payload waarvoor besluit gold (spec §4.7). */
  payloadType?: PayloadType;
}

export interface AuditEvent {
  ts: string;
  action: Action;
  mode: Mode;
  verdict: Verdict;
  reasonCode: string;
  ruleId: string;
  riskLevel: RiskLevel;
  policyVersion: string;
}
