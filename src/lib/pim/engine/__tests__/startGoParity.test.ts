// Characterisation tests voor de StartGoShell.tsx migratie (Fase 2 slice 3).
// Deze tests borgen dat de centrale engine dezelfde signals / guard /
// decision / egress produceert als de directe pipeline die StartGoShell
// vóór de migratie zelf aanriep.

import { describe, expect, it } from "vitest";
import { createEngine } from "../engine";
import { computeSignals } from "../../risk";
import { anonymize, pseudonymize, draftCheck } from "../../processing";
import { decide } from "../../policy";
import { DEFAULT_DETECTION_SETTINGS } from "../../detectionSettings";
import { executeAction } from "../../egressGuard";
import type { Action, Mode, PayloadType } from "../../types";

const CLEAN = "De methode werkt beter. Leerlingen scoren gemiddeld hoger op de weektoets.";
const CONTEXT = "Kort mentorverslag over Tom de Vries (4H2), planning aanscherpen.";
const HEAVY = "Sarah Jansen, groep 6, De Wilg te Utrecht. BSN 123456782, mail jansen@voorbeeld.nl.";

function baselineStartGo(text: string, mode: Mode, action: Action) {
  const signals = computeSignals(text, [], DEFAULT_DETECTION_SETTINGS);
  const draft = mode === "anonymous" ? anonymize(text, signals) : pseudonymize(text, signals).draft;
  const guard = draftCheck(draft, mode);
  const payloadType: PayloadType =
    mode === "anonymous" && guard.status === "pass"
      ? "draft_anonymous_certified"
      : mode === "pseudonymous"
        ? "draft_pseudonymous_local"
        : "unknown";
  const decisionSignals = computeSignals(draft.text, [], DEFAULT_DETECTION_SETTINGS);
  const decision = decide({
    mode,
    action,
    signals: decisionSignals,
    draftCheck: guard,
    modelVerified: true,
    detectionSettings: DEFAULT_DETECTION_SETTINGS,
    payloadType,
  });
  return { signals, draft, guard, payloadType, decision };
}

function engineRun(text: string, mode: Mode, action: Action) {
  const engine = createEngine({ detectionSettings: DEFAULT_DETECTION_SETTINGS });
  engine.evaluate({ text, mode, autoRepair: false });
  const decision = engine.previewDecision(action);
  return { state: engine.getState(), decision, engine };
}

describe.each([
  ["clean anonymous", CLEAN, "anonymous" as Mode, "display" as Action],
  ["repair-flow anonymous", CONTEXT, "anonymous" as Mode, "copy" as Action],
  ["pseudonymous local", CONTEXT, "pseudonymous" as Mode, "save_local" as Action],
  ["blocked egress", HEAVY, "anonymous" as Mode, "send_external_ai" as Action],
])("StartGoShell parity, %s", (_label, text, mode, action) => {
  it("engine matches direct pipeline", () => {
    const b = baselineStartGo(text, mode, action);
    const e = engineRun(text, mode, action);
    expect(e.state.signals?.riskLevel).toBe(b.signals.riskLevel);
    expect(e.state.guard?.status).toBe(b.guard.status);
    expect(e.state.payloadType).toBe(b.payloadType);
    expect(e.decision.verdict).toBe(b.decision.verdict);
    expect(e.decision.reasonCode).toBe(b.decision.reasonCode);
  });
});

describe("StartGoShell parity, extras", () => {
  it("model-integriteitsblokkade blokkeert egress", async () => {
    const engine = createEngine({
      detectionSettings: DEFAULT_DETECTION_SETTINGS,
      modelVerified: false,
    });
    engine.evaluate({ text: CLEAN, mode: "anonymous" });
    const outcome = await engine.requestAction({ action: "copy" });
    expect(outcome.executed).toBe(false);
    expect(outcome.decision.verdict).toBe("BLOCK");
  });

  it("reset en herevaluatie geven nieuwe signals", () => {
    const engine = createEngine({ detectionSettings: DEFAULT_DETECTION_SETTINGS });
    engine.evaluate({ text: HEAVY, mode: "anonymous" });
    expect(engine.getState().signals?.directPii.length ?? 0).toBeGreaterThan(0);
    engine.reset();
    expect(engine.getState().phase).toBe("idle");
    engine.evaluate({ text: CLEAN, mode: "anonymous" });
    expect(engine.getState().signals?.directPii.length ?? 0).toBe(0);
  });

  it("quick action gebruikt geldige certified payload (parity met executeAction)", async () => {
    const b = baselineStartGo(CLEAN, "anonymous", "copy");
    const direct = await executeAction(b.decision, {
      text: b.draft.text,
      mode: "anonymous",
      payloadType: b.payloadType,
      detectionSettings: DEFAULT_DETECTION_SETTINGS,
      guardStatus: b.guard.status,
    });
    const e = engineRun(CLEAN, "anonymous", "copy");
    const outcome = await e.engine.requestAction({ action: "copy" });
    expect(outcome.executed).toBe(direct.executed);
    expect(outcome.decision.verdict).toBe(b.decision.verdict);
  });

  it("llm-override herbeoordeelt draft en decision (rewriteCurrentResult-flow)", () => {
    const engine = createEngine({ detectionSettings: DEFAULT_DETECTION_SETTINGS });
    engine.evaluate({
      text: CONTEXT,
      mode: "anonymous",
      llmDraftText: "Een leerling uit de bovenbouw wil de planning aanscherpen.",
    });
    const s = engine.getState();
    expect(s.llmApplied).toBe(true);
    expect(s.draft?.text).toContain("bovenbouw");
    expect(s.guard?.status).toBe("pass");
  });
});
