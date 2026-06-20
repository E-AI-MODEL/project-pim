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
    <section className="space-y-4 animate-fade-in">
      <SafetyVerdictCard verdict={decision.verdict} reason={decision.reason} />

      {decision.verdict === "BLOCK" && directSpans.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-red-300">PiM herkende deze gegevens in je tekst</div>
          <FindingChips spans={directSpans} />
          <div className="text-xs text-muted-foreground pt-1 leading-relaxed">
            <span className="text-foreground font-medium">Volgende stap:</span> verwijder deze gegevens, of zet de modus op <span className="text-foreground font-medium">Anoniem</span> — PiM voert de controle dan automatisch opnieuw uit.
          </div>
        </div>
      )}

      {decision.verdict !== "BLOCK" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">De veilige versie van je tekst</div>
            <div className="text-[10px] text-muted-foreground">Gereed voor de gekozen actie</div>
          </div>
          <pre className="rounded-xl border border-primary/20 bg-card/60 p-4 text-sm font-mono whitespace-pre-wrap leading-relaxed max-h-[40vh] overflow-auto">{safeText}</pre>
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