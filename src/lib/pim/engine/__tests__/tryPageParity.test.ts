// Characterisation tests voor de try.tsx migratie (Fase 2 slice 2).
// Deze tests borgen dat de centrale engine dezelfde signals / guard /
// decision produceert als een directe aanroep van
// computeSignals + anonymize + draftCheck + (repair) + decide.
// Als deze parity breekt, is het zichtbare gedrag van try.tsx veranderd.

import { describe, expect, it } from "vitest";
import { createEngine } from "../engine";
import { computeSignals } from "../../risk";
import { anonymize, draftCheck } from "../../processing";
import { repairAnonymousDraft } from "../../contextualGeneralization";
import { decide } from "../../policy";
import { DEFAULT_DETECTION_SETTINGS } from "../../detectionSettings";
import type { Action } from "../../types";

const CLEAN = "De methode werkt beter. Leerlingen scoren gemiddeld hoger op de weektoets.";
const REPAIR = "Kort mentorverslag over Tom de Vries (4H2) — planning aanscherpen.";
const BLOCK = "Sarah Jansen, groep 6, De Wilg te Utrecht. BSN 123456782, mail jansen@voorbeeld.nl.";

function baseline(text: string, action: Action) {
  const signals = computeSignals(text, [], DEFAULT_DETECTION_SETTINGS);
  const initialDraft = anonymize(text, signals);
  const initialGuard = draftCheck(initialDraft, "anonymous");
  let draftText = initialDraft.text;
  if (initialGuard.status !== "pass") {
    const repaired = repairAnonymousDraft(initialDraft.text, signals);
    if (repaired !== initialDraft.text) draftText = repaired;
  }
  const effective = { ...initialDraft, text: draftText };
  const guard = draftCheck(effective, "anonymous");
  const decisionSignals = computeSignals(draftText, [], DEFAULT_DETECTION_SETTINGS);
  const payloadType = guard.status === "pass" ? "draft_anonymous_certified" : ("unknown" as const);
  const decision = decide({
    mode: "anonymous",
    action,
    signals: decisionSignals,
    draftCheck: guard,
    modelVerified: true,
    payloadType,
  });
  return { signals, guard, decisionSignals, payloadType, decision };
}

function engineRun(text: string, action: Action) {
  const engine = createEngine({
    detectionSettings: DEFAULT_DETECTION_SETTINGS,
    modelVerified: true,
  });
  engine.evaluate({ mode: "anonymous", text, autoRepair: true });
  const decision = engine.previewDecision(action);
  return { state: engine.getState(), decision };
}

describe.each([
  ["clean", CLEAN, "display" as Action],
  ["repair", REPAIR, "copy" as Action],
  ["block", BLOCK, "send_external_ai" as Action],
])("try.tsx parity — %s", (_label, text, action) => {
  it("engine matches direct pipeline", () => {
    const b = baseline(text, action);
    const e = engineRun(text, action);

    expect(e.state.signals?.riskLevel).toBe(b.signals.riskLevel);
    expect(e.state.signals?.directPii.length).toBe(b.signals.directPii.length);
    expect(e.state.signals?.contextualPii.length).toBe(b.signals.contextualPii.length);

    expect(e.state.guard?.status).toBe(b.guard.status);
    expect(e.state.payloadType).toBe(b.payloadType);
    expect(e.state.decisionSignals?.riskLevel).toBe(b.decisionSignals.riskLevel);

    expect(e.decision.verdict).toBe(b.decision.verdict);
    expect(e.decision.reasonCode).toBe(b.decision.reasonCode);
    expect(e.decision.ruleId).toBe(b.decision.ruleId);
  });
});

describe("try.tsx parity — extras", () => {
  it("llmDraftText replaces the anonymize draft and re-guards", () => {
    const engine = createEngine({ detectionSettings: DEFAULT_DETECTION_SETTINGS });
    engine.evaluate({
      mode: "anonymous",
      text: REPAIR,
      autoRepair: true,
      llmDraftText: "Een leerling uit de bovenbouw wil de planning aanscherpen.",
    });
    const s = engine.getState();
    expect(s.llmApplied).toBe(true);
    expect(s.draft?.text).toContain("bovenbouw");
    expect(s.guard?.status).toBe("pass");
    expect(s.payloadType).toBe("draft_anonymous_certified");
  });

  it("pseudonymous copy is BLOCKed by payload-type gate", () => {
    const engine = createEngine({ detectionSettings: DEFAULT_DETECTION_SETTINGS });
    engine.evaluate({ mode: "pseudonymous", text: REPAIR });
    const d = engine.previewDecision("copy");
    expect(d.verdict).toBe("BLOCK");
  });
});
