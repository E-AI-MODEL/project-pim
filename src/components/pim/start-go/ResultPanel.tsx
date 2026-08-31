// §8.4, status → reden → bevindingen → primaire actie → details dicht.
// De tekst zelf staat één keer in beeld, in het tekstvlak van CheckMode.
import { useMemo } from "react";
import type { PimDecision, PrivacySignals } from "@/lib/pim/types";
import type { ModelIntegrityRecord } from "@/lib/pim/modelCatalog";
import { SafetyVerdictCard } from "./SafetyVerdictCard";
import { ResultActions } from "./ResultActions";
import { FindingChips } from "./FindingChips";
import { DetailsDrawer } from "./DetailsDrawer";
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
  /** De schone tekst zoals de motor hem maakte. */
  safeText: string;
  /** De schone tekst zoals hij nu in het tekstvlak staat (mag bewerkt zijn). */
  editedSafeText?: string;
  signals: PrivacySignals;
  mapping: Map<string, string>;
  integrity: ModelIntegrityRecord[];
  onPrimary: (editedSafeText: string) => void;
  onCopy?: (editedSafeText: string) => Promise<{ executed: boolean; reason: string }>;
  onDownload?: (editedSafeText: string) => Promise<{ executed: boolean; reason: string }>;
  egressMsg: string | null;
  busy?: boolean;
  detectionSettings?: DetectionLayerSettings;
  disabledCategories?: ReadonlySet<PiiCategory>;
  thresholdOverrides?: Partial<Record<Action, number>>;
}

export function ResultPanel({
  decision,
  safeText,
  editedSafeText,
  signals,
  mapping,
  integrity,
  onPrimary,
  onCopy,
  onDownload,
  egressMsg,
  busy,
  detectionSettings = DEFAULT_DETECTION_SETTINGS,
  disabledCategories,
  thresholdOverrides,
}: Props) {
  const directSpans = signals.directPii;
  const editedSafe = editedSafeText ?? safeText;
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
      {decision.verdict !== "BLOCK" && directSpans.length > 0 && (
        <FindingChips spans={directSpans} />
      )}
      {isEdited && (
        <div className="text-[11px] text-[#64748b]">
          Je hebt de veilige versie aangepast. Opnieuw beoordeeld: {liveSafeVerdict ?? "-"}
        </div>
      )}
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
