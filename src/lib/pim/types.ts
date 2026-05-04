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
  | "context_small_group"
  | "context_care"
  | "context_incident"
  | "context_role";

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
}

export type Verdict = "ALLOW" | "ALLOW_WITH_WARNING" | "BLOCK";

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
