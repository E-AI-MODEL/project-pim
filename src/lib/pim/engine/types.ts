import type {
  Action,
  CertifiedPayload,
  DraftCandidate,
  DraftCheckResult,
  Mode,
  PayloadType,
  PiiCategory,
  PimDecision,
  PiiSpan,
  PrivacySignals,
  Verdict,
} from "../types";
import type { DetectionLayerSettings } from "../detectionSettings";
import type { PipelineProfileId } from "../pipelineProfile";
import type { ModelIntegrityRecord } from "../modelIntegrity";

export interface EngineConfig {
  detectionSettings: DetectionLayerSettings;
  profileId?: PipelineProfileId;
  thresholdOverrides?: Partial<Record<Action, number>>;
  disabledCategories?: ReadonlySet<PiiCategory>;
  /** Default true, BERT (NER) active. */
  bertEnabled?: boolean;
  /** Default false, lock-principe strict mode. */
  strictMode?: boolean;
  /** Default true, model integrity gate verified. UI toggles this via modelGateFor. */
  modelVerified?: boolean;
  /**
   * When provided the engine computes the modelGate per action itself
   * (via modelGateFor). Takes precedence over the static `modelVerified`.
   */
  integrity?: ModelIntegrityRecord[];
}

export interface EngineInput {
  text: string;
  mode: Mode;
  /** Extra spans from external detectors (e.g. NER worker). */
  extraSpans?: PiiSpan[];
  /**
   * When true and mode = 'anonymous', apply rule-based repair
   * (repairAnonymousDraft) whenever the first draftCheck is not 'pass'.
   */
  autoRepair?: boolean;
  /**
   * Optional LLM-produced draft (mode = 'anonymous' only). When set,
   * this text overrides the anonymize/repair draft as the effective draft
   * that egress uses. Guard/decision are recomputed on this text.
   */
  llmDraftText?: string | null;
}

export type EnginePhase = "idle" | "ready";

export interface EngineState {
  phase: EnginePhase;
  input: EngineInput | null;
  signals: PrivacySignals | null;
  draft: DraftCandidate | null;
  /** Draft as produced by anonymize/pseudonymize, pre-repair/pre-LLM. */
  initialDraft: DraftCandidate | null;
  /** True when auto-repair changed the anonymous draft. */
  repairApplied: boolean;
  /** True when an llmDraftText was applied. */
  llmApplied: boolean;
  /**
   * Signals used for the policy decision:
   *  - anonymous mode: recomputed on the effective (post-repair/LLM) draft
   *  - pseudonymous mode: identical to `signals`
   */
  decisionSignals: PrivacySignals | null;
  /** Local-only pseudonymous mapping. Never leaves engine boundary. */
  pseudoMapping: Map<string, string> | null;
  guard: DraftCheckResult | null;
  payloadType: PayloadType;
  /** Decision for a hypothetical `display` action, always safe to compute. */
  displayDecision: PimDecision | null;
}

export interface RequestedAction {
  action: Action;
  /** Text that will actually leave (defaults to draft.text). */
  payloadText?: string;
  /** Override payload-type (e.g. 'restored' for the restore action). */
  payloadType?: PayloadType;
}

export interface ActionOutcome {
  decision: PimDecision;
  executed: boolean;
  reason: string;
  verdict: Verdict;
  certified: CertifiedPayload;
}

export const EMPTY_ENGINE_STATE: EngineState = {
  phase: "idle",
  input: null,
  signals: null,
  draft: null,
  initialDraft: null,
  repairApplied: false,
  llmApplied: false,
  decisionSignals: null,
  pseudoMapping: null,
  guard: null,
  payloadType: "unknown",
  displayDecision: null,
};
