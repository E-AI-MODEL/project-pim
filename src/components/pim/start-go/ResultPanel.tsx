// §8.4 — status → reden → highlights/veilige tekst → primaire actie → details dicht.
import { useState } from "react";
import type { PimDecision, PrivacySignals } from "@/lib/pim/types";
import type { ModelIntegrityRecord } from "@/lib/pim/modelCatalog";
import { SafetyVerdictCard } from "./SafetyVerdictCard";
import { ResultActions } from "./ResultActions";
import { FindingChips } from "./FindingChips";
import { DetailsDrawer } from "./DetailsDrawer";
import { TextHighlighter } from "./TextHighlighter";
import { MappingViewer } from "./MappingViewer";

interface Props {
  decision: PimDecision;
  safeText: string;
  originalText: string;
  signals: PrivacySignals;
  mapping: Map<string, string>;
  integrity: ModelIntegrityRecord[];
  onPrimary: () => void;
  egressMsg: string | null;
  busy?: boolean;
}

export function ResultPanel({ decision, safeText, originalText, signals, mapping, integrity, onPrimary, egressMsg, busy }: Props) {
  const directSpans = signals.directPii;
  const allSpans = [...signals.directPii, ...signals.contextualPii];
  const [tab, setTab] = useState<"original" | "safe">(
    decision.verdict === "BLOCK" ? "original" : "safe",
  );
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

      {/* Tab-switcher: origineel met highlights vs veilige versie */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-border/50 bg-card/40 p-0.5">
            <button
              type="button"
              onClick={() => setTab("original")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === "original" ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Origineel met markeringen
              {allSpans.length > 0 && (
                <span className="ml-1.5 text-[10px] font-plex-mono text-muted-foreground">{allSpans.length}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setTab("safe")}
              disabled={decision.verdict === "BLOCK"}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === "safe" ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:text-foreground"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              Veilige versie
            </button>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {tab === "safe" ? "Gereed voor de gekozen actie" : "Hover een markering voor categorie + confidence"}
          </div>
        </div>

        {tab === "original" ? (
          <TextHighlighter text={originalText} spans={allSpans} />
        ) : (
          <pre className="rounded-xl border border-primary/20 bg-card/60 p-4 text-sm font-mono whitespace-pre-wrap leading-relaxed max-h-[40vh] overflow-auto">{safeText}</pre>
        )}
      </div>

      {/* Pseudoniem-mapping (alleen lokaal) */}
      {decision.mode === "pseudonymous" && mapping.size > 0 && (
        <MappingViewer mapping={mapping} />
      )}

      <ResultActions verdict={decision.verdict} onPrimary={onPrimary} safeText={safeText} busy={busy} />

      {egressMsg && (
        <div className="text-xs text-muted-foreground border-l-2 border-border/60 pl-3">{egressMsg}</div>
      )}

      <DetailsDrawer decision={decision} signals={signals} integrity={integrity} />
    </section>
  );
}