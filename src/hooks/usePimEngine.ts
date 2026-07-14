import { useCallback, useEffect, useRef, useState } from "react";
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
  previewDecision: PimEngine["previewDecision"];
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

  // Commando's zijn referentieel stabiel zolang `engine` gelijk blijft.
  // Consumenten mogen ze dus veilig als useEffect-dependency gebruiken
  // zonder oneindige loops te veroorzaken.
  const evaluate = useCallback((input: EngineInput) => engine.evaluate(input), [engine]);
  const previewDecision = useCallback<PimEngine["previewDecision"]>(
    (action) => engine.previewDecision(action),
    [engine],
  );
  const requestAction = useCallback<PimEngine["requestAction"]>(
    (req) => engine.requestAction(req),
    [engine],
  );
  const reset = useCallback(() => engine.reset(), [engine]);

  return { state, evaluate, previewDecision, requestAction, reset };
}
