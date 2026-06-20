// §8.4 — status → reden → veilige tekst → primaire actie → details dicht.
import type { PimDecision, PrivacySignals } from "@/lib/pim/types";
import type { ModelIntegrityRecord } from "@/lib/pim/modelCatalog";
import { SafetyVerdictCard } from "./SafetyVerdictCard";
import { ResultActions } from "./ResultActions";
import { FindingChips } from "./FindingChips";
import { DetailsDrawer } from "./DetailsDrawer";

interface Props {
  decision: PimDecision;
  safeText: string;
  signals: PrivacySignals;
  integrity: ModelIntegrityRecord[];
  onPrimary: () => void;
  egressMsg: string | null;
  busy?: boolean;
}

export function ResultPanel({ decision, safeText, signals, integrity, onPrimary, egressMsg, busy }: Props) {
  const directSpans = signals.directPii;
  return (
    <section className="space-y-4">
      <SafetyVerdictCard verdict={decision.verdict} reason={decision.reason} />

      {decision.verdict === "BLOCK" && directSpans.length > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-red-300">Gevonden</div>
          <FindingChips spans={directSpans} />
          <div className="text-xs text-muted-foreground pt-1">
            Wat nu? Verwijder deze gegevens uit je tekst of kies een sterkere mode (Anoniem) en klik opnieuw op Start PiM.
          </div>
        </div>
      )}

      {decision.verdict !== "BLOCK" && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Veilige tekst</div>
          <pre className="rounded-lg border border-border/40 bg-card/40 p-3 text-sm font-mono whitespace-pre-wrap leading-relaxed max-h-[40vh] overflow-auto">{safeText}</pre>
        </div>
      )}

      <ResultActions verdict={decision.verdict} onPrimary={onPrimary} busy={busy} />

      {egressMsg && (
        <div className="text-xs text-muted-foreground border-l-2 border-border/60 pl-3">{egressMsg}</div>
      )}

      <DetailsDrawer decision={decision} signals={signals} integrity={integrity} />
    </section>
  );
}