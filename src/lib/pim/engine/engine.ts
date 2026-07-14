// Central PiM Evaluation Engine.
// Thin façade around detectors → risk → draft → policy → egress.
// UI must import this module (or ./selectors) and MUST NOT touch
// policy/risk/egressGuard/processing directly. See eslint guardrail.

import { computeSignals } from "../risk";
import { anonymize, draftCheck, pseudonymize } from "../processing";
import { repairAnonymousDraft } from "../contextualGeneralization";
import { decide } from "../policy";
import { executeAction } from "../egressGuard";
import { modelGateFor } from "../modelGate";
import type { CertifiedPayload, PayloadType } from "../types";
import {
  EMPTY_ENGINE_STATE,
  type ActionOutcome,
  type EngineConfig,
  type EngineInput,
  type EngineState,
  type RequestedAction,
} from "./types";

export interface PimEngine {
  getState(): EngineState;
  evaluate(input: EngineInput): EngineState;
  requestAction(req: RequestedAction): Promise<ActionOutcome>;
  reset(): EngineState;
  subscribe(listener: (state: EngineState) => void): () => void;
  updateConfig(patch: Partial<EngineConfig>): void;
}

function computePayloadType(
  mode: EngineInput["mode"],
  guardStatus: NonNullable<EngineState["guard"]>["status"],
): PayloadType {
  if (mode === "anonymous") {
    return guardStatus === "pass" ? "draft_anonymous_certified" : "unknown";
  }
  return "draft_pseudonymous_local";
}

function resolveModelVerified(
  config: EngineConfig,
  action: Parameters<typeof modelGateFor>[0],
): boolean {
  if (config.integrity) {
    return modelGateFor(action, config.detectionSettings, config.integrity).verified;
  }
  return config.modelVerified ?? true;
}

export function createEngine(initial: EngineConfig): PimEngine {
  let config: EngineConfig = {
    bertEnabled: true,
    strictMode: false,
    modelVerified: true,
    ...initial,
  };
  let state: EngineState = EMPTY_ENGINE_STATE;
  const listeners = new Set<(s: EngineState) => void>();
  const emit = () => {
    for (const l of listeners) l(state);
  };

  function evaluate(input: EngineInput): EngineState {
    const signals = computeSignals(
      input.text,
      input.extraSpans ?? [],
      config.detectionSettings,
      config.disabledCategories,
    );

    let initialDraft;
    let pseudoMapping: Map<string, string> | null = null;
    if (input.mode === "anonymous") {
      initialDraft = anonymize(input.text, signals);
    } else {
      const r = pseudonymize(input.text, signals);
      initialDraft = r.draft;
      pseudoMapping = r.mapping;
    }

    // Effective draft: anonymize/pseudonymize → optional repair → optional LLM override.
    let effectiveDraft = initialDraft;
    let repairApplied = false;
    let llmApplied = false;

    if (input.mode === "anonymous") {
      if (input.llmDraftText != null) {
        effectiveDraft = { ...initialDraft, text: input.llmDraftText };
        llmApplied = true;
      } else if (input.autoRepair) {
        const initialGuard = draftCheck(initialDraft, input.mode);
        if (initialGuard.status !== "pass") {
          const repairedText = repairAnonymousDraft(initialDraft.text, signals);
          if (repairedText !== initialDraft.text) {
            effectiveDraft = { ...initialDraft, text: repairedText };
            repairApplied = true;
          }
        }
      }
    }

    const guard = draftCheck(effectiveDraft, input.mode);
    const payloadType = computePayloadType(input.mode, guard.status);

    // Decision signals: for anonymous we re-score on the effective draft text
    // so the policy decision reflects what would actually leave the browser.
    const decisionSignals =
      input.mode === "anonymous"
        ? computeSignals(effectiveDraft.text, [], config.detectionSettings, config.disabledCategories)
        : signals;

    const displayDecision = decide({
      mode: input.mode,
      action: "display",
      signals: decisionSignals,
      draftCheck: guard,
      modelVerified: resolveModelVerified(config, "display"),
      detectionSettings: config.detectionSettings,
      profileId: config.profileId,
      payloadType,
      thresholdOverrides: config.thresholdOverrides,
      bertEnabled: config.bertEnabled,
      strictMode: config.strictMode,
    });

    state = {
      phase: "ready",
      input,
      signals,
      draft: effectiveDraft,
      initialDraft,
      repairApplied,
      llmApplied,
      decisionSignals,
      pseudoMapping,
      guard,
      payloadType,
      displayDecision,
    };
    emit();
    return state;
  }

  async function requestAction(req: RequestedAction): Promise<ActionOutcome> {
    if (state.phase !== "ready" || !state.input || !state.draft || !state.guard) {
      throw new Error("PimEngine.requestAction called before evaluate()");
    }
    const decision = decide({
      mode: state.input.mode,
      action: req.action,
      signals: state.decisionSignals ?? state.signals!,
      draftCheck: state.guard,
      modelVerified: resolveModelVerified(config, req.action),
      detectionSettings: config.detectionSettings,
      profileId: config.profileId,
      payloadType: state.payloadType,
      thresholdOverrides: config.thresholdOverrides,
      bertEnabled: config.bertEnabled,
      strictMode: config.strictMode,
    });

    const certified: CertifiedPayload = {
      text: req.payloadText ?? state.draft.text,
      mode: state.input.mode,
      payloadType: req.payloadType ?? state.payloadType,
      detectionSettings: config.detectionSettings,
      profileId: config.profileId,
      guardStatus: state.guard.status,
    };

    const result = await executeAction(decision, certified);
    return {
      decision,
      certified,
      executed: result.executed,
      reason: result.reason,
      verdict: decision.verdict,
    };
  }

  function reset(): EngineState {
    state = EMPTY_ENGINE_STATE;
    emit();
    return state;
  }

  return {
    getState: () => state,
    evaluate,
    requestAction,
    reset,
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },
    updateConfig(patch) {
      config = { ...config, ...patch };
    },
  };
}
