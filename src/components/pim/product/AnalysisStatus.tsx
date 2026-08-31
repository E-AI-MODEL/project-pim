import { Check, Loader2, RefreshCw, AlertCircle } from "lucide-react";

export type AnalysisState = "idle" | "busy" | "ready" | "stale" | "error";

const MAP: Record<AnalysisState, { text: string; cls: string; icon: React.ReactNode }> = {
  idle: {
    text: "Nog niet nagekeken",
    cls: "text-[#64748b]",
    icon: <Check className="h-3.5 w-3.5 text-[#cbd5e1]" />,
  },
  busy: {
    text: "PiM kijkt je tekst na",
    cls: "text-[#6d4aff]",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  },
  ready: {
    text: "Nagekeken",
    cls: "text-emerald-700",
    icon: <Check className="h-3.5 w-3.5" />,
  },
  stale: {
    text: "Je tekst is veranderd, kijk hem opnieuw na",
    cls: "text-amber-700",
    icon: <RefreshCw className="h-3.5 w-3.5" />,
  },
  error: {
    text: "Er ging iets mis, probeer het opnieuw",
    cls: "text-rose-700",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
};

/** Eén statusregel voor beide schermen: klaar, bezig, veranderd, fout. */
export function AnalysisStatus({ state }: { state: AnalysisState }) {
  const s = MAP[state];
  return (
    <span
      data-testid="analysis-status"
      data-state={state}
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 text-[12px] ${s.cls}`}
    >
      {s.icon}
      {s.text}
    </span>
  );
}
