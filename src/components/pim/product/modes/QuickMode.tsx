import { useEffect, useMemo, useState } from "react";
import { useProductShell } from "../ProductShellContext";
import { InputPanel } from "@/components/pim/start-go/InputPanel";
import { ResultPanel } from "@/components/pim/start-go/ResultPanel";
import type { Example } from "@/components/pim/start-go/ExamplePicker";

/**
 * Snel proberen: plak tekst, engine evalueert live, resultaat verschijnt na
 * korte debounce. Gebruikt de gedeelde engine uit ProductShell — geen eigen
 * usePimEngine, geen eigen header/footer, geen advanced panel of modelkaarten.
 */
export function QuickMode() {
  const { engine, settings, text, setText, mode, setMode, action, setAction } = useProductShell();
  const { state: engineState, evaluate, previewDecision } = engine;
  const [committed, setCommitted] = useState(false);
  const [egressMsg, setEgressMsg] = useState<string | null>(null);

  // Live evaluate op tekst/mode.
  useEffect(() => {
    if (!text.trim()) return;
    evaluate({ text, mode, autoRepair: false });
  }, [evaluate, text, mode]);

  // Debounced commit — bepaalt wanneer ResultPanel verschijnt.
  useEffect(() => {
    setCommitted(false);
    setEgressMsg(null);
    if (!text.trim()) return;
    const t = setTimeout(() => setCommitted(true), 400);
    return () => clearTimeout(t);
  }, [text, mode, action]);

  const result = useMemo(() => {
    if (!committed) return null;
    if (!engineState.signals || !engineState.guard || !engineState.draft) return null;
    return {
      decision: previewDecision(action),
      safeText: engineState.draft.text,
      signals: engineState.signals,
      mapping: engineState.pseudoMapping ?? new Map<string, string>(),
    };
  }, [
    committed,
    previewDecision,
    action,
    engineState.signals,
    engineState.guard,
    engineState.draft,
    engineState.pseudoMapping,
  ]);

  const onExample = (e: Example) => {
    setText(e.text);
    setEgressMsg(null);
  };

  const runQuickAction = async (payload: string, act: typeof action) => {
    const outcome = await engine.requestAction({ action: act, payloadText: payload });
    return { executed: outcome.executed, reason: outcome.reason };
  };

  return (
    <div className="space-y-6">
      <InputPanel
        text={text}
        onTextChange={(v) => {
          setText(v);
          setEgressMsg(null);
        }}
        onStart={() => text.trim() && setCommitted(true)}
        onExample={onExample}
        compact
        mode={mode}
        onModeChange={setMode}
        action={action}
        onActionChange={setAction}
      />
      {!result && text.trim().length > 0 && (
        <div className="text-xs text-[#e8edf3]/60 border-l-2 border-[#3b6fa0]/50 pl-3 animate-pulse">
          PiM leest mee…
        </div>
      )}
      {result && (
        <ResultPanel
          decision={result.decision}
          safeText={result.safeText}
          originalText={text}
          signals={result.signals}
          mapping={result.mapping}
          integrity={settings.integrity}
          onPrimary={async (edited) => {
            const r = await runQuickAction(edited, action);
            setEgressMsg(r.executed ? `✓ ${r.reason}` : `✗ ${r.reason}`);
          }}
          onCopy={(t) => runQuickAction(t, "copy")}
          onDownload={(t) => runQuickAction(t, "export_file")}
          egressMsg={egressMsg}
          onOriginalChange={(v) => {
            setText(v);
            setEgressMsg(null);
          }}
          detectionSettings={settings.detectionSettings}
          disabledCategories={settings.disabledCategories}
          thresholdOverrides={settings.thresholdOverrides}
        />
      )}
    </div>
  );
}
