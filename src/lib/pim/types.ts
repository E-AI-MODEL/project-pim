// Project PIM core types
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
  confidence: number;
  contextual: boolean;
}

export interface PrivacySignals {
  directPii: PiiSpan[];
  contextualPii: PiiSpan[];
  riskScore: number;
  riskLevel: RiskLevel;
  reasons: string[];
  ruleIds: string[];
}

export interface DraftCandidate {
  mode: Mode;
  text: string;
  expectedTokens?: string[];
  rawHadPii: boolean;
}

export interface DraftCheckResult {
  status: "pass" | "repair" | "fail";
  issues: string[];
  residualCategories?: string[];
  hallucinatedTokenCount?: number;
  modeMix?: boolean;
}

export type Verdict = "ALLOW" | "ALLOW_WITH_WARNING" | "BLOCK";

export type PayloadType =
  | "draft_anonymous_certified"
  | "draft_pseudonymous_local"
  | "raw_input"
  | "mapping"
  | "restored"
  | "unknown";

export type LegacyProfileId = import("./pipelineProfile").PipelineProfileId;

export interface CertifiedPayload {
  text: string;
  mode: Mode;
  payloadType: PayloadType;
  detectionSettings?: import("./detectionSettings").DetectionLayerSettings;
  profileId?: LegacyProfileId;
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
  flag?: string;
  detectionSettings?: import("./detectionSettings").DetectionLayerSettings;
  profileId?: LegacyProfileId;
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
