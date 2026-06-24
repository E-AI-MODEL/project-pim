import { useCallback, useEffect, useRef, useState } from "react";

export interface PipelineStep {
  id: string;
  label: string;
  lastTickMs: number; // performance.now() of last activity
  durationMs: number; // duration of last activity
  active: boolean;   // currently considered "live"
}

export type StepId =
  | "input" | "regex" | "lex" | "slm" | "ctx"
  | "repair" | "guard" | "decide" | "llm";

const STEP_LABELS: Record<StepId, string> = {
  input: "input",
  regex: "regex",
  lex: "lex",
  slm: "slm",
  ctx: "ctx",
  repair: "repair",
  guard: "guard",
  decide: "decide",
  llm: "llm",
};

/**
 * Lightweight heartbeat for live pipeline visualisation.
 * Each pipeline stage calls `tick(stepId, durationMs?)` whenever it recomputes.
 * The hook re-renders periodically so ping/pulse classes can decay over time.
 */
export function usePipelineHeartbeat(stepIds: StepId[]) {
  const ticksRef = useRef<Map<StepId, { last: number; dur: number }>>(new Map());
  const [, setNow] = useState(0);

  // Re-render alleen zolang er recente activiteit is (binnen 2,5 s).
  // Voorheen draaide setInterval(220ms) ook bij volledig idle pagina's en
  // forceerde dat onnodige re-renders op /try en in PipelineStepsBar.
  useEffect(() => {
    let raf = 0;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const now = performance.now();
      const map = ticksRef.current;
      let active = false;
      for (const v of map.values()) {
        if (now - v.last < 2500) { active = true; break; }
      }
      if (active) {
        setNow(now);
        raf = requestAnimationFrame(tick);
      } else {
        // Idle: re-check goedkoop elke 600 ms via timeout.
        raf = window.setTimeout(tick, 600) as unknown as number;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      clearTimeout(raf);
    };
  }, []);

  const tick = useCallback((id: StepId, durationMs = 0) => {
    ticksRef.current.set(id, { last: performance.now(), dur: durationMs });
    setNow(performance.now());
  }, []);

  const now = performance.now();
  const steps: PipelineStep[] = stepIds.map((id) => {
    const rec = ticksRef.current.get(id);
    const last = rec?.last ?? 0;
    const age = last === 0 ? Infinity : now - last;
    return {
      id,
      label: STEP_LABELS[id] ?? id,
      lastTickMs: last,
      durationMs: rec?.dur ?? 0,
      active: age < 2000,
    };
  });

  return { steps, tick };
}