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

export interface EngineConfig {
  detectionSettings: DetectionLayerSettings;
  profileId?: PipelineProfileId;
  thresholdOverrides?: Partial<Record<Action, number>>;
  disabledCategories?: ReadonlySet<PiiCategory>;
  /** Default true — BERT (NER) active. */
  bertEnabled?: boolean;
  /** Default false — lock-principe strict mode. */
  strictMode?: boolean;
  /** Default true — model integrity gate verified. UI toggles this via modelGateFor. */
  modelVerified?: boolean;
}

export interface EngineInput {
  text: string;
  mode: Mode;
  /** Extra spans from external detectors (e.g. NER worker). */
  extraSpans?: PiiSpan[];
}

export type EnginePhase = "idle" | "ready";

export interface EngineState {
  phase: EnginePhase;
  input: EngineInput | null;
  signals: PrivacySignals | null;
  draft: DraftCandidate | null;
  /** Local-only pseudonymous mapping. Never leaves engine boundary. */
  pseudoMapping: Map<string, string> | null;
  guard: DraftCheckResult | null;
  payloadType: PayloadType;
  /** Decision for a hypothetical `display` action — always safe to compute. */
  displayDecision: PimDecision | null;
}

export interface RequestedAction {
  action: Action;
  /** Text that will actually leave (defaults to draft.text). */
  payloadText?: string;
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
  pseudoMapping: null,
  guard: null,
  payloadType: "unknown",
  displayDecision: null,
};