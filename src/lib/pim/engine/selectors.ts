import type { Action, PiiCategory, PiiSpan } from "../types";
import type { EngineState } from "./types";

export function findingsByCategory(state: EngineState): Map<PiiCategory, PiiSpan[]> {
  const out = new Map<PiiCategory, PiiSpan[]>();
  if (!state.signals) return out;
  for (const s of [...state.signals.directPii, ...state.signals.contextualPii]) {
    const bucket = out.get(s.category) ?? [];
    bucket.push(s);
    out.set(s.category, bucket);
  }
  return out;
}

export function bannerSeverity(state: EngineState): "none" | "info" | "warn" | "block" {
  const d = state.displayDecision;
  if (!d) return "none";
  if (d.verdict === "BLOCK") return "block";
  if (d.verdict === "ALLOW_WITH_WARNING") return "warn";
  return "info";
}

export function isActionAllowed(state: EngineState, action: Action): boolean {
  // Cheap read: only reliable for actions with the same policy shape as display.
  // For a real gate the caller should invoke engine.requestAction which runs decide().
  if (!state.displayDecision) return false;
  return state.displayDecision.verdict !== "BLOCK" || action === "display";
}
