import { useEffect, useMemo } from "react";
import { useProductShell } from "../ProductShellContext";
import { InputPanel } from "@/components/pim/start-go/InputPanel";
import { SafetyVerdictCard } from "@/components/pim/start-go/SafetyVerdictCard";
import { FindingChips } from "@/components/pim/start-go/FindingChips";
import type { Example } from "@/components/pim/start-go/ExamplePicker";

/**
 * Start & Go: begeleid overzicht van de zes engine-stappen op basis van de
 * gedeelde engine-state. Geen eigen engine, geen dubbele header/monitor.
 */
export function StartMode() {
  const {
    engineState: state,
    evaluate,
    previewDecision,
    text,
    setText,
    mode,
    setMode,
    action,
    setAction,
    nerSpans,
  } = useProductShell();

  useEffect(() => {
    if (!text.trim()) return;
    evaluate({ text, mode, extraSpans: nerSpans, autoRepair: true });
  }, [evaluate, text, mode, nerSpans]);

  const previewedDecision = useMemo(
    () => (state.signals ? previewDecision(action) : null),
    [previewDecision, action, state.signals],
  );

  const steps = [
    { label: "Tekst", done: text.trim().length > 0 },
    { label: "Detectie", done: !!state.signals },
    { label: "Anonimiseer", done: !!state.draft },
    { label: "Draft-check", done: !!state.guard },
    { label: "Beslissing", done: !!previewedDecision },
    { label: "Egress", done: previewedDecision?.verdict === "ALLOW" },
  ];

  return (
    <div className="space-y-6">
      <InputPanel
        text={text}
        onTextChange={setText}
        onStart={() =>
          text.trim() && evaluate({ text, mode, extraSpans: nerSpans, autoRepair: true })
        }
        onExample={(e: Example) => setText(e.text)}
        compact
        mode={mode}
        onModeChange={setMode}
        action={action}
        onActionChange={setAction}
      />
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] text-[#64748b]">
        {steps.map((s, i) => (
          <li key={s.label} className="inline-flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ${
                s.done
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-[#f1f2f7] text-[#94a3b8]"
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
      {state.signals && previewedDecision && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SafetyVerdictCard
            verdict={previewedDecision.verdict}
            reason={previewedDecision.reason}
          />
          <FindingChips spans={[...state.signals.directPii, ...state.signals.contextualPii]} />
        </div>
      )}
    </div>
  );
}
