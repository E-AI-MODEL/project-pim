// Characterisation tests voor de WriterShell.tsx migratie (Fase 2 slice 4).
// WriterShell gebruikt de engine alleen voor detectie (signals) in scan()
// en de export-drempel. Deze tests borgen dat de engine dezelfde signals
// produceert als de directe pipeline die WriterShell vóór de migratie
// zelf aanriep, inclusief NER extraSpans en disabledCategories.

import { describe, expect, it } from "vitest";
import { createEngine } from "../engine";
import { computeSignals } from "../../risk";
import { DEFAULT_DETECTION_SETTINGS } from "../../detectionSettings";
import type { PiiCategory, PiiSpan } from "../../types";

const CLEAN = "De methode werkt beter. Leerlingen scoren gemiddeld hoger op de weektoets.";
const CONTEXT = "Kort mentorverslag over Tom de Vries (4H2), planning aanscherpen.";
const HEAVY = "Sarah Jansen, groep 6, De Wilg te Utrecht. BSN 123456782, mail jansen@voorbeeld.nl.";

function baseline(text: string, extraSpans: PiiSpan[] = [], disabled?: Set<PiiCategory>) {
  return computeSignals(text, extraSpans, DEFAULT_DETECTION_SETTINGS, disabled);
}
function engineSignals(text: string, extraSpans: PiiSpan[] = [], disabled?: Set<PiiCategory>) {
  const engine = createEngine({
    detectionSettings: DEFAULT_DETECTION_SETTINGS,
    disabledCategories: disabled,
  });
  const s = engine.evaluate({ text, mode: "anonymous", extraSpans });
  return s.signals!;
}

describe("WriterShell parity, engine signals equal direct computeSignals", () => {
  it.each([
    ["clean", CLEAN],
    ["context", CONTEXT],
    ["heavy pii", HEAVY],
  ])("%s document", (_l, text) => {
    const b = baseline(text);
    const e = engineSignals(text);
    expect(e.riskLevel).toBe(b.riskLevel);
    expect(e.directPii.length).toBe(b.directPii.length);
    expect(e.contextualPii.length).toBe(b.contextualPii.length);
  });

  it("passes NER extraSpans through evaluate()", () => {
    const ner: PiiSpan[] = [
      {
        category: "name",
        text: "Tom de Vries",
        start: CONTEXT.indexOf("Tom de Vries"),
        end: CONTEXT.indexOf("Tom de Vries") + "Tom de Vries".length,
        confidence: 0.9,
        ruleId: "ner:test",
        contextual: false,
      },
    ];
    const b = baseline(CONTEXT, ner);
    const e = engineSignals(CONTEXT, ner);
    expect(e.directPii.length).toBe(b.directPii.length);
    expect(e.riskLevel).toBe(b.riskLevel);
  });

  it("respects disabledCategories via engine config", () => {
    const disabled = new Set<PiiCategory>(["email"]);
    const b = baseline(HEAVY, [], disabled);
    const e = engineSignals(HEAVY, [], disabled);
    expect(e.directPii.map((s) => s.category)).toEqual(b.directPii.map((s) => s.category));
  });

  it("empty text evaluates without throwing and returns empty signals", () => {
    const e = engineSignals("");
    expect(e.directPii.length).toBe(0);
    expect(e.contextualPii.length).toBe(0);
  });

  it("rapid successive evaluate() calls remain stable (no loop, no throw)", () => {
    const engine = createEngine({ detectionSettings: DEFAULT_DETECTION_SETTINGS });
    for (let i = 0; i < 25; i++) {
      const s = engine.evaluate({ text: HEAVY + " " + i, mode: "anonymous" });
      expect(s.phase).toBe("ready");
    }
  });
});
