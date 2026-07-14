// §8.4, status → reden → highlights/veilige tekst → primaire actie → details dicht.
import { useEffect, useMemo, useState } from "react";
import type { PimDecision, PrivacySignals } from "@/lib/pim/types";
import type { ModelIntegrityRecord } from "@/lib/pim/modelCatalog";
import { SafetyVerdictCard } from "./SafetyVerdictCard";
import { ResultActions } from "./ResultActions";
import { FindingChips } from "./FindingChips";
import { DetailsDrawer } from "./DetailsDrawer";
import { TextHighlighter } from "./TextHighlighter";
import { MappingViewer } from "./MappingViewer";
import {
  computeSignals,
  draftCheck,
  decide,
  DEFAULT_DETECTION_SETTINGS,
  type DetectionLayerSettings,
  type PiiCategory,
  type Action,
} from "@/lib/pim";

interface Props {
  decision: PimDecision;
  safeText: string;
  originalText: string;
  signals: PrivacySignals;
  mapping: Map<string, string>;
  integrity: ModelIntegrityRecord[];
  onPrimary: (editedSafeText: string) => void;
  onCopy?: (editedSafeText: string) => Promise<{ executed: boolean; reason: string }>;
  onDownload?: (editedSafeText: string) => Promise<{ executed: boolean; reason: string }>;
  egressMsg: string | null;
  busy?: boolean;
  onOriginalChange?: (t: string) => void;
  detectionSettings?: DetectionLayerSettings;
  disabledCategories?: ReadonlySet<PiiCategory>;
  thresholdOverrides?: Partial<Record<Action, number>>;
}

export function ResultPanel({
  decision,
  safeText,
  originalText,
  signals,
  mapping,
  integrity,
  onPrimary,
  onCopy,
  onDownload,
  egressMsg,
  busy,
  onOriginalChange,
  detectionSettings = DEFAULT_DETECTION_SETTINGS,
  disabledCategories,
  thresholdOverrides,
}: Props) {
  const directSpans = signals.directPii;
  const allSpans = [...signals.directPii, ...signals.contextualPii];
  const [tab, setTab] = useState<"original" | "safe">(
    decision.verdict === "BLOCK" ? "original" : "safe",
  );
  const [editedSafe, setEditedSafe] = useState(safeText);
  useEffect(() => {
    setEditedSafe(safeText);
  }, [safeText]);
  const isEdited = editedSafe !== safeText;

  const liveSafeVerdict = useMemo(() => {
    if (!isEdited) return null;
    const disabled = disabledCategories ?? new Set<PiiCategory>();
    const sig = computeSignals(editedSafe, [], detectionSettings, disabled);
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
      detectionSettings,
      payloadType: decision.payloadType ?? "unknown",
      thresholdOverrides: thresholdOverrides ?? {},
    });
    return d.verdict;
  }, [
    editedSafe,
    isEdited,
    detectionSettings,
    disabledCategories,
    thresholdOverrides,
    decision,
    signals.directPii.length,
  ]);

  const liveOriginalSpans = useMemo(() => {
    if (!onOriginalChange) return allSpans;
    const disabled = disabledCategories ?? new Set<PiiCategory>();
    const sig = computeSignals(originalText, [], detectionSettings, disabled);
    return [...sig.directPii, ...sig.contextualPii];
  }, [originalText, onOriginalChange, detectionSettings, disabledCategories, allSpans]);

  return (
    <section className="space-y-4 animate-fade-in">
      <SafetyVerdictCard verdict={decision.verdict} reason={decision.reason} />
      {decision.verdict === "BLOCK" && directSpans.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">
            PiM herkende deze gegevens in je tekst
          </div>
          <FindingChips spans={directSpans} />
          <p className="text-[12px] text-[#475569] leading-relaxed">
            Verwijder deze gegevens of zet de modus op{" "}
            <span className="font-medium text-[#0f172a]">Anoniem</span>, PiM controleert opnieuw.
          </p>
        </div>
      )}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-[#e5e7ef] bg-[#f6f7fb] p-0.5">
            <button
              type="button"
              onClick={() => setTab("original")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === "original" ? "bg-white text-[#0f172a] shadow-sm" : "text-[#64748b] hover:text-[#0f172a]"}`}
            >
              Origineel
              {allSpans.length > 0 && (
                <span className="ml-1.5 text-[10px] font-plex-mono text-[#94a3b8]">
                  {allSpans.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setTab("safe")}
              disabled={decision.verdict === "BLOCK"}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === "safe" ? "bg-white text-[#0f172a] shadow-sm" : "text-[#64748b] hover:text-[#0f172a]"} disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              Veilig
            </button>
          </div>
          <div className="text-[10px] text-[#94a3b8]">
            {tab === "safe" && isEdited
              ? `Bewerkt · opnieuw beoordeeld: ${liveSafeVerdict ?? "-"}`
              : "Bewerkbaar, controle vernieuwt mee"}
          </div>
        </div>
        {tab === "original" ? (
          <div className="space-y-2">
            {onOriginalChange && (
              <textarea
                value={originalText}
                onChange={(e) => onOriginalChange(e.target.value)}
                className="w-full min-h-[120px] rounded-xl border border-[#e5e7ef] bg-white text-[#0f172a] p-3 text-sm outline-none focus:ring-2 focus:ring-[#6d4aff]/30"
              />
            )}
            <TextHighlighter text={originalText} spans={liveOriginalSpans} />
          </div>
        ) : (
          <textarea
            value={editedSafe}
            onChange={(e) => setEditedSafe(e.target.value)}
            className="w-full min-h-[160px] rounded-xl border border-[#e5e7ef] bg-white text-[#0f172a] p-3 text-sm outline-none focus:ring-2 focus:ring-[#6d4aff]/30"
          />
        )}
      </div>
      <ResultActions
        verdict={decision.verdict}
        liveVerdict={liveSafeVerdict}
        safeText={editedSafe}
        onPrimary={() => onPrimary(editedSafe)}
        onCopy={onCopy ? () => onCopy(editedSafe) : undefined}
        onDownload={onDownload ? () => onDownload(editedSafe) : undefined}
        busy={busy}
      />
      {egressMsg && (
        <div className="rounded-lg border border-[#e5e7ef] bg-white px-3 py-2 text-xs text-[#475569]">
          {egressMsg}
        </div>
      )}
      {mapping.size > 0 && <MappingViewer mapping={mapping} />}
      <DetailsDrawer decision={decision} signals={signals} integrity={integrity} />
    </section>
  );
}
