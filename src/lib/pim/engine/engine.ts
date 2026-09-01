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
  /**
   * Compute the PIM decision for a given action WITHOUT executing egress.
   * Uses the last `evaluate()` state. Throws when called before evaluate.
   */
  previewDecision(action: Parameters<typeof modelGateFor>[0]): import("../types").PimDecision;
  requestAction(req: RequestedAction): Promise<ActionOutcome>;
  /**
   * Voer een actie uit op een andere tekst dan de laatst geëvalueerde, zonder
   * de gedeelde state te overschrijven. De engine draait de volledige
   * pipeline (detectie, anonimisering, guard, policy) op die tekst en leidt
   * payload en payload-type zelf af. Zo hoeft geen enkele UI nog ruwe tekst
   * als "gecertificeerd" aan te bieden.
   */
  requestActionForText(text: string, action: RequestedAction["action"]): Promise<ActionOutcome>;
  reset(): EngineState;
  subscribe(listener: (state: EngineState) => void): () => void;
  updateConfig(patch: Partial<EngineConfig>): void;
}

/**
 * Zet spans die op een oudere tekst zijn gemeten om naar de nieuwe tekst.
 * Klopt de positie niet meer, dan zoeken we het exacte fragment opnieuw op.
 * Vinden we het niet (of meerdere keren dubbelzinnig), dan valt de span weg:
 * de reguliere detectie draait toch opnieuw over de nieuwe tekst.
 */
function remapSpans(spans: EngineInput["extraSpans"], text: string): EngineInput["extraSpans"] {
  if (!spans || spans.length === 0) return [];
  const out: NonNullable<EngineInput["extraSpans"]> = [];
  for (const span of spans) {
    if (!span.text) continue;
    if (text.slice(span.start, span.end) === span.text) {
      out.push(span);
      continue;
    }
    const idx = text.indexOf(span.text);
    if (idx === -1) continue;
    if (text.indexOf(span.text, idx + 1) !== -1) continue;
    out.push({ ...span, start: idx, end: idx + span.text.length });
  }
  return out;
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
        ? computeSignals(
            effectiveDraft.text,
            [],
            config.detectionSettings,
            config.disabledCategories,
          )
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

    // De engine leidt payload en payload-type zelf af. Een meegegeven
    // payloadText is alleen een controle: wijkt hij af, dan geen egress.
    const certified: CertifiedPayload = {
      text: state.draft.text,
      mode: state.input.mode,
      payloadType: state.payloadType,
      detectionSettings: config.detectionSettings,
      profileId: config.profileId,
      guardStatus: state.guard.status,
    };

    if (req.payloadText != null && req.payloadText !== state.draft.text) {
      return {
        decision,
        certified,
        executed: false,
        reason:
          "Geblokkeerd: de aangeboden tekst komt niet overeen met de door PiM gecertificeerde tekst.",
        verdict: decision.verdict,
      };
    }

    const result = await executeAction(decision, certified);
    return {
      decision,
      certified,
      executed: result.executed,
      reason: result.reason,
      verdict: decision.verdict,
    };
  }

  async function requestActionForText(
    text: string,
    action: RequestedAction["action"],
  ): Promise<ActionOutcome> {
    if (state.phase !== "ready" || !state.input) {
      throw new Error("PimEngine.requestActionForText called before evaluate()");
    }
    const prev = state;
    try {
      evaluate({
        ...(prev.input as EngineInput),
        text,
        // Posities uit een eerdere tekst mogen niet blind op nieuwe tekst
        // worden toegepast; anders knipt de anonimisering er middenin.
        extraSpans: remapSpans((prev.input as EngineInput).extraSpans ?? [], text),
        llmDraftText: undefined,
      });
      return await requestAction({ action });
    } finally {
      state = prev;
      emit();
    }
  }

  function reset(): EngineState {
    state = EMPTY_ENGINE_STATE;
    emit();
    return state;
  }

  function previewDecision(action: Parameters<typeof modelGateFor>[0]) {
    if (state.phase !== "ready" || !state.input || !state.guard) {
      throw new Error("PimEngine.previewDecision called before evaluate()");
    }
    return decide({
      mode: state.input.mode,
      action: action as Parameters<typeof decide>[0]["action"],
      signals: state.decisionSignals ?? state.signals!,
      draftCheck: state.guard,
      modelVerified: resolveModelVerified(config, action),
      detectionSettings: config.detectionSettings,
      profileId: config.profileId,
      payloadType: state.payloadType,
      thresholdOverrides: config.thresholdOverrides,
      bertEnabled: config.bertEnabled,
      strictMode: config.strictMode,
    });
  }

  return {
    getState: () => state,
    evaluate,
    previewDecision,
    requestAction,
    requestActionForText,
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
