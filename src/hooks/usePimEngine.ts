import { useEffect, useMemo, useRef, useState } from "react";
import {
  createEngine,
  EMPTY_ENGINE_STATE,
  type EngineConfig,
  type EngineInput,
  type EngineState,
  type PimEngine,
} from "@/lib/pim/engine";

export interface UsePimEngineResult {
  state: EngineState;
  evaluate: PimEngine["evaluate"];
  requestAction: PimEngine["requestAction"];
  reset: PimEngine["reset"];
}

/**
 * React adapter around the central PiM engine.
 * The engine holds its own state; this hook only bridges into React.
 */
export function usePimEngine(config: EngineConfig): UsePimEngineResult {
  const engineRef = useRef<PimEngine | null>(null);
  if (engineRef.current === null) {
    engineRef.current = createEngine(config);
  }
  const engine = engineRef.current;

  const [state, setState] = useState<EngineState>(() => engine.getState() ?? EMPTY_ENGINE_STATE);

  useEffect(() => engine.subscribe(setState), [engine]);
  useEffect(() => {
    engine.updateConfig(config);
  }, [engine, config]);

  return useMemo(
    () => ({
      state,
      evaluate: (input: EngineInput) => engine.evaluate(input),
      requestAction: (req) => engine.requestAction(req),
      reset: () => engine.reset(),
    }),
    [state, engine],
  );
}