import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useProductShell } from "../ProductShellContext";
import { AnalysisModeToggle } from "../AnalysisModeToggle";
import { AnalysisStatus, type AnalysisState } from "../AnalysisStatus";
import { InputPanel } from "@/components/pim/start-go/InputPanel";
import { ResultPanel } from "@/components/pim/start-go/ResultPanel";
import type { Example } from "@/components/pim/start-go/ExamplePicker";

/**
 * Tekst nakijken. Eén scherm voor wat vroeger "Snel checken" en
 * "Stap voor stap" was: zelfde invoerveld, zelfde motor, zelfde uitkomst.
 * De stappenbalk zit in een uitklapper onder de uitkomst.
 */
export function CheckMode() {
  const {
    engineState,
    evaluate,
    previewDecision,
    requestAction,
    settings,
    text,
    setText,
    mode,
    setMode,
    action,
    setAction,
    nerSpans,
    analysisMode,
    analysisTick,
    runAnalysis,
    isStale,
  } = useProductShell();
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [egressMsg, setEgressMsg] = useState<string | null>(null);

  // Laatste waarden buiten de effect-deps houden, zodat de handmatige
  // analyse alleen op de knop reageert en niet op elke toetsaanslag.
  const latest = useRef({ text, mode, nerSpans });
  latest.current = { text, mode, nerSpans };

  // Meelezen terwijl je typt.
  useEffect(() => {
    if (analysisMode !== "live") return;
    if (!text.trim()) {
      setShown(false);
      setBusy(false);
      return;
    }
    setBusy(true);
    const t = setTimeout(() => {
      evaluate({ text, mode, extraSpans: nerSpans, autoRepair: true });
      setShown(true);
      setBusy(false);
    }, 400);
    return () => clearTimeout(t);
  }, [analysisMode, evaluate, text, mode, nerSpans]);

  // Handmatig nakijken, één gedeelde trigger.
  useEffect(() => {
    if (analysisTick === 0) return;
    const { text: t, mode: m, nerSpans: spans } = latest.current;
    if (!t.trim()) return;
    evaluate({ text: t, mode: m, extraSpans: spans, autoRepair: true });
    setShown(true);
    setEgressMsg(null);
  }, [analysisTick, evaluate]);

  const result = useMemo(() => {
    if (!shown) return null;
    if (!engineState.signals || !engineState.guard || !engineState.draft) return null;
    return {
      decision: previewDecision(action),
      safeText: engineState.draft.text,
      signals: engineState.signals,
      mapping: engineState.pseudoMapping ?? new Map<string, string>(),
    };
  }, [
    shown,
    previewDecision,
    action,
    engineState.signals,
    engineState.guard,
    engineState.draft,
    engineState.pseudoMapping,
  ]);

  const status: AnalysisState = busy ? "busy" : isStale ? "stale" : result ? "ready" : "idle";

  const steps = [
    { label: "Tekst", done: text.trim().length > 0 },
    { label: "Gegevens gevonden", done: !!engineState.signals },
    { label: "Weggehaald", done: !!engineState.draft },
    { label: "Nagekeken", done: !!engineState.guard },
    { label: "Uitspraak", done: !!result },
    { label: "Delen mag", done: result?.decision.verdict === "ALLOW" },
  ];

  const runCheckAction = async (payload: string, act: typeof action) => {
    const outcome = await requestAction({ action: act, payloadText: payload });
    return { executed: outcome.executed, reason: outcome.reason };
  };

  return (
    <div className="space-y-5">
      <div className="hidden flex-wrap items-center justify-between gap-3 sm:flex">
        <AnalysisModeToggle />
        <AnalysisStatus state={status} />
      </div>

      <InputPanel
        text={text}
        onTextChange={(v) => {
          setText(v);
          setEgressMsg(null);
        }}
        onStart={runAnalysis}
        onExample={(e: Example) => {
          setText(e.text);
          setEgressMsg(null);
        }}
        compact
        mode={mode}
        onModeChange={setMode}
        action={action}
        onActionChange={setAction}
      />


      {result && (
        <div className={isStale ? "opacity-50 transition-opacity" : "transition-opacity"}>
          <ResultPanel
            decision={result.decision}
            safeText={result.safeText}
            originalText={text}
            signals={result.signals}
            mapping={result.mapping}
            integrity={settings.integrity}
            onPrimary={async (edited) => {
              const r = await runCheckAction(edited, action);
              setEgressMsg(r.executed ? r.reason : r.reason);
            }}
            onCopy={(t) => runCheckAction(t, "copy")}
            onDownload={(t) => runCheckAction(t, "export_file")}
            egressMsg={egressMsg}
            onOriginalChange={(v) => {
              setText(v);
              setEgressMsg(null);
            }}
            detectionSettings={settings.detectionSettings}
            disabledCategories={settings.disabledCategories}
            thresholdOverrides={settings.thresholdOverrides}
          />
          <details className="mt-3 rounded-xl border border-[#e5e7ef] bg-white px-3 py-2">
            <summary className="flex cursor-pointer items-center gap-1.5 text-[12px] text-[#64748b]">
              <ChevronDown className="h-3.5 w-3.5" />
              Hoe PiM dit heeft bekeken
            </summary>
            <ol className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] text-[#64748b]">
              {steps.map((s, i) => (
                <li key={s.label} className="inline-flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ${
                      s.done ? "bg-emerald-50 text-emerald-700" : "bg-[#f1f2f7] text-[#94a3b8]"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${s.done ? "bg-emerald-500" : "bg-[#cbd5e1]"}`}
                    />
                    {s.label}
                  </span>
                  {i < steps.length - 1 && <span className="text-[#cbd5e1]">›</span>}
                </li>
              ))}
            </ol>
          </details>
        </div>
      )}
    </div>
  );
}
