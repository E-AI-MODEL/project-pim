// §8.4 — status → reden → highlights/veilige tekst → primaire actie → details dicht.
import { useEffect, useMemo, useState } from "react";
import type { PimDecision, PrivacySignals } from "@/lib/pim/types";
import type { ModelIntegrityRecord } from "@/lib/pim/modelCatalog";
import { SafetyVerdictCard } from "./SafetyVerdictCard";
import { ResultActions } from "./ResultActions";
import { FindingChips } from "./FindingChips";
import { DetailsDrawer } from "./DetailsDrawer";
import { TextHighlighter } from "./TextHighlighter";
import { MappingViewer } from "./MappingViewer";
import { computeSignals, draftCheck, decide, DEFAULT_PROFILE, type PipelineProfileId, type PiiCategory, type Action } from "@/lib/pim";

interface Props {
  decision: PimDecision;
  safeText: string;
  originalText: string;
  signals: PrivacySignals;
  mapping: Map<string, string>;
  integrity: ModelIntegrityRecord[];
  /** Wordt aangeroepen met de huidige (mogelijk bewerkte) veilige tekst. */
  onPrimary: (editedSafeText: string) => void;
  /** Egress-gated kopie van de bewerkte tekst. */
  onCopy?: (editedSafeText: string) => Promise<{ executed: boolean; reason: string }>;
  /** Egress-gated download van de bewerkte tekst. */
  onDownload?: (editedSafeText: string) => Promise<{ executed: boolean; reason: string }>;
  egressMsg: string | null;
  busy?: boolean;
  /** Live-bewerken van de origineel-tekst (gaat terug naar StartGoShell.text) */
  onOriginalChange?: (t: string) => void;
  /** Context voor live her-evaluatie van handmatig bewerkte veilige tekst */
  profileId?: PipelineProfileId;
  disabledCategories?: ReadonlySet<PiiCategory>;
  thresholdOverrides?: Partial<Record<Action, number>>;
}

export function ResultPanel({
  decision, safeText, originalText, signals, mapping, integrity, onPrimary, onCopy, onDownload, egressMsg, busy,
  onOriginalChange, profileId, disabledCategories, thresholdOverrides,
}: Props) {
  const directSpans = signals.directPii;
  const allSpans = [...signals.directPii, ...signals.contextualPii];
  const [tab, setTab] = useState<"original" | "safe">(
    decision.verdict === "BLOCK" ? "original" : "safe",
  );

  // Lokale bewerk-state voor de veilige versie. Reset zodra een nieuwe
  // automatische versie van boven binnenkomt.
  const [editedSafe, setEditedSafe] = useState(safeText);
  useEffect(() => { setEditedSafe(safeText); }, [safeText]);
  const isEdited = editedSafe !== safeText;

  // Live her-evaluatie van de bewerkte veilige tekst — zelfde codepad als
  // de automatische pipeline, maar zonder anonymize/pseudonymize (de
  // gebruiker is verantwoordelijk voor de inhoud).
  const liveSafeVerdict = useMemo(() => {
    if (!isEdited) return null;
    const pid = profileId ?? DEFAULT_PROFILE;
    const disabled = disabledCategories ?? new Set<PiiCategory>();
    const sig = computeSignals(editedSafe, [], pid, disabled);
    const guard = draftCheck(
      { text: editedSafe, mode: decision.mode, rawHadPii: signals.directPii.length > 0 },
      decision.mode,
    );
    const d = decide({
      mode: decision.mode,
      action: decision.action,
      signals: sig,
      draftCheck: guard,
      modelVerified: true,
      profileId: pid,
      payloadType: decision.payloadType ?? "unknown",
      thresholdOverrides: thresholdOverrides ?? {},
    });
    return d.verdict;
  }, [editedSafe, profileId, disabledCategories, thresholdOverrides, decision, signals.directPii.length]);

  // Live highlights voor de origineel-tab — herberekend op elke toetsaanslag.
  const liveOriginalSpans = useMemo(() => {
    if (!onOriginalChange) return allSpans;
    const pid = profileId ?? DEFAULT_PROFILE;
    const disabled = disabledCategories ?? new Set<PiiCategory>();
    const sig = computeSignals(originalText, [], pid, disabled);
    return [...sig.directPii, ...sig.contextualPii];
  }, [originalText, onOriginalChange, profileId, disabledCategories, allSpans]);
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
            {tab === "safe"
              ? (isEdited
                  ? `Handmatig bewerkt — live opnieuw beoordeeld: ${liveSafeVerdict ?? "—"}`
                  : "Bewerkbaar — wijzigingen worden direct opnieuw gecontroleerd")
              : "Bewerkbaar — markeringen verversen mee tijdens typen"}
          </div>
        </div>

        {tab === "original" ? (
          <div className="space-y-2">
            {onOriginalChange && (
              <textarea
                value={originalText}
                onChange={(e) => onOriginalChange(e.target.value)}
                rows={6}
                spellCheck={false}
                className="w-full rounded-xl border border-border/50 bg-card/50 px-4 py-3 text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 min-h-[140px]"
              />
            )}
            <TextHighlighter text={originalText} spans={liveOriginalSpans} />
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={editedSafe}
              onChange={(e) => setEditedSafe(e.target.value)}
              rows={8}
              spellCheck={false}
              className={`w-full rounded-xl border bg-card/60 px-4 py-3 text-sm font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 min-h-[180px] max-h-[50vh] overflow-auto ${
                isEdited
                  ? "border-amber-400/50 focus:ring-amber-400/40 focus:border-amber-400/50"
                  : "border-primary/20 focus:ring-primary/40 focus:border-primary/40"
              }`}
            />
            {isEdited && (
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-amber-300/80">
                  Bewerkte versie — kopie/download/uitvoeren gebruikt jouw aangepaste tekst.
                </span>
                <button
                  type="button"
                  onClick={() => setEditedSafe(safeText)}
                  className="text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Terug naar PiM-versie
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pseudoniem-mapping (alleen lokaal) */}
      {decision.mode === "pseudonymous" && mapping.size > 0 && (
        <MappingViewer mapping={mapping} />
      )}

      <ResultActions
        verdict={isEdited && liveSafeVerdict ? liveSafeVerdict : decision.verdict}
        liveVerdict={isEdited ? liveSafeVerdict : null}
        onPrimary={() => onPrimary(editedSafe)}
        onCopy={onCopy ? () => onCopy(editedSafe) : undefined}
        onDownload={onDownload ? () => onDownload(editedSafe) : undefined}
        safeText={editedSafe}
        busy={busy}
      />

      {egressMsg && (
        <div className="text-xs text-muted-foreground border-l-2 border-border/60 pl-3">{egressMsg}</div>
      )}

      <DetailsDrawer decision={decision} signals={signals} integrity={integrity} />
    </section>
  );
}