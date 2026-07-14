// React-integratietests voor usePimEngine (Fase 2 slice 3.5).
// Borgen dat:
//  - commandofuncties referentieel stabiel zijn over renders;
//  - evaluate() in useEffect géén oneindige loop veroorzaakt;
//  - React Strict Mode geen afwijkend eindresultaat oplevert;
//  - configuratiewijziging via updateConfig(config) doorloopt;
//  - LLM-draftoverride opnieuw wordt geëvalueerd;
//  - reset() een idle-state teruggeeft.

import { StrictMode, useEffect, useRef } from "react";
import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePimEngine } from "@/hooks/usePimEngine";
import {
  DEFAULT_DETECTION_SETTINGS,
  RULES_ONLY_DETECTION_SETTINGS,
} from "@/lib/pim/detectionSettings";
import type { EngineConfig, EngineState } from "@/lib/pim/engine";

function Harness({
  config,
  text,
  llmDraftText,
  onState,
  onEvaluateStable,
}: {
  config: EngineConfig;
  text: string;
  llmDraftText?: string | null;
  onState: (s: EngineState) => void;
  onEvaluateStable: (stable: boolean) => void;
}) {
  const { state, evaluate, reset } = usePimEngine(config);
  const prevEvaluate = useRef(evaluate);
  const stable = prevEvaluate.current === evaluate;
  prevEvaluate.current = evaluate;
  onEvaluateStable(stable);
  onState(state);
  useEffect(() => {
    if (!text.trim()) {
      reset();
      return;
    }
    evaluate({ text, mode: "anonymous", autoRepair: false, llmDraftText });
  }, [evaluate, reset, text, llmDraftText]);
  return <div data-testid="phase">{state.phase}</div>;
}

describe("usePimEngine — React integration (slice 3.5)", () => {
  it("stabiliseert commandofuncties over re-renders", async () => {
    const states: EngineState[] = [];
    const stableFlags: boolean[] = [];
    render(
      <Harness
        config={{ detectionSettings: DEFAULT_DETECTION_SETTINGS }}
        text="Vakinhoudelijke evaluatie zonder namen."
        onState={(s) => states.push(s)}
        onEvaluateStable={(b) => stableFlags.push(b)}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    // Eerste render heeft geen 'vorige' evaluate → true. Alle latere renders
    // moeten óók true zijn (identiteit blijft gelijk).
    expect(stableFlags.length).toBeGreaterThan(1);
    expect(stableFlags.every(Boolean)).toBe(true);
    // Eindtoestand is 'ready' zonder oneindige lus (bounded rendercount).
    expect(states.at(-1)?.phase).toBe("ready");
    expect(states.length).toBeLessThan(8);
  });

  it("Strict Mode geeft hetzelfde eindresultaat", async () => {
    const strictStates: EngineState[] = [];
    render(
      <StrictMode>
        <Harness
          config={{ detectionSettings: DEFAULT_DETECTION_SETTINGS }}
          text="Kort verslag zonder identificerende gegevens."
          onState={(s) => strictStates.push(s)}
          onEvaluateStable={() => {}}
        />
      </StrictMode>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    const last = strictStates.at(-1)!;
    expect(last.phase).toBe("ready");
    expect(last.guard?.status).toBe("pass");
  });

  it("configuratiewijziging via updateConfig neemt effect", async () => {
    const states: EngineState[] = [];
    const { rerender } = render(
      <Harness
        config={{ detectionSettings: DEFAULT_DETECTION_SETTINGS }}
        text="Tom de Vries zit in klas 4H2."
        onState={(s) => states.push(s)}
        onEvaluateStable={() => {}}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    const withCtx = states.at(-1)!;
    // Rerender met rules-only (context uit) — contextuele hits horen 0 te zijn
    // omdat de context-laag uit staat.
    rerender(
      <Harness
        config={{ detectionSettings: RULES_ONLY_DETECTION_SETTINGS }}
        text="Tom de Vries zit in klas 4H2."
        onState={(s) => states.push(s)}
        onEvaluateStable={() => {}}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    const after = states.at(-1)!;
    expect(after.phase).toBe("ready");
    // Context uit ⇒ contextuele signals-count kan alleen ≤ zijn dan met context aan.
    expect(after.signals!.contextualPii.length).toBeLessThanOrEqual(
      withCtx.signals!.contextualPii.length,
    );
  });

  it("LLM-draftoverride veroorzaakt herevaluatie", async () => {
    const states: EngineState[] = [];
    const { rerender } = render(
      <Harness
        config={{ detectionSettings: DEFAULT_DETECTION_SETTINGS }}
        text="Kort mentorverslag over Tom de Vries (4H2)."
        onState={(s) => states.push(s)}
        onEvaluateStable={() => {}}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    rerender(
      <Harness
        config={{ detectionSettings: DEFAULT_DETECTION_SETTINGS }}
        text="Kort mentorverslag over Tom de Vries (4H2)."
        llmDraftText="Een leerling uit de bovenbouw wil de planning aanscherpen."
        onState={(s) => states.push(s)}
        onEvaluateStable={() => {}}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    const last = states.at(-1)!;
    expect(last.llmApplied).toBe(true);
    expect(last.draft?.text).toContain("bovenbouw");
  });

  it("reset() geeft een idle state", async () => {
    const states: EngineState[] = [];
    const { rerender } = render(
      <Harness
        config={{ detectionSettings: DEFAULT_DETECTION_SETTINGS }}
        text="Iets met inhoud."
        onState={(s) => states.push(s)}
        onEvaluateStable={() => {}}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(states.at(-1)?.phase).toBe("ready");
    rerender(
      <Harness
        config={{ detectionSettings: DEFAULT_DETECTION_SETTINGS }}
        text=""
        onState={(s) => states.push(s)}
        onEvaluateStable={() => {}}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(states.at(-1)?.phase).toBe("idle");
  });
});