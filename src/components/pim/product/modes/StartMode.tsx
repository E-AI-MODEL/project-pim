import { useEffect, useMemo } from "react";
import { useProductShell } from "../ProductShellContext";
import { InputPanel } from "@/components/pim/start-go/InputPanel";
import { SafetyVerdictCard } from "@/components/pim/start-go/SafetyVerdictCard";
import { FindingChips } from "@/components/pim/start-go/FindingChips";
import type { Example } from "@/components/pim/start-go/ExamplePicker";

interface Step {
  id: string;
  title: string;
  subtitle: string;
  done: boolean;
  detail: string;
}

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
  } = useProductShell();

  useEffect(() => {
    if (!text.trim()) return;
    evaluate({ text, mode, autoRepair: true });
  }, [evaluate, text, mode]);

  const previewedDecision = useMemo(
    () => (state.signals ? previewDecision(action) : null),
    [previewDecision, action, state.signals],
  );

  const hits = (state.signals?.directPii.length ?? 0) + (state.signals?.contextualPii.length ?? 0);

  const steps: Step[] = [
    {
      id: "input",
      title: "1 · Tekst",
      subtitle: "Wat je wilt controleren",
      done: text.trim().length > 0,
      detail: text.trim() ? `${text.length} tekens ingevoerd` : "Plak of typ tekst hierboven.",
    },
    {
      id: "detect",
      title: "2 · Detectie",
      subtitle: "Regex, lexicon en context",
      done: !!state.signals,
      detail: state.signals
        ? `${hits} signalen, risico ${state.signals.riskLevel}`
        : "Wacht op tekst.",
    },
    {
      id: "anonymize",
      title: "3 · Anonimiseer",
      subtitle: "Vervang of vertoken",
      done: !!state.draft,
      detail: state.draft
        ? `${state.draft.text.length} tekens veilig — ${state.repairApplied ? "auto-repair toegepast" : "direct veilig"}`
        : "Volgt na detectie.",
    },
    {
      id: "guard",
      title: "4 · Draft-check",
      subtitle: "Zit er nog PII in?",
      done: !!state.guard,
      detail: state.guard ? `Status: ${state.guard.status}` : "Wacht op anonimisatie.",
    },
    {
      id: "decide",
      title: "5 · Beslissing",
      subtitle: `Voor doel · ${action}`,
      done: !!previewedDecision,
      detail: previewedDecision ? `Verdict: ${previewedDecision.verdict}` : "Wacht op draft-check.",
    },
    {
      id: "egress",
      title: "6 · Egress",
      subtitle: "Alleen als jij goedkeurt",
      done: false,
      detail:
        previewedDecision?.verdict === "ALLOW"
          ? "Klaar om te versturen."
          : "Niets verlaat je apparaat.",
    },
  ];

  return (
    <div className="space-y-6">
      <InputPanel
        text={text}
        onTextChange={setText}
        onStart={() => text.trim() && evaluate({ text, mode, autoRepair: true })}
        onExample={(e: Example) => setText(e.text)}
        compact
        mode={mode}
        onModeChange={setMode}
        action={action}
        onActionChange={setAction}
      />
      <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {steps.map((s) => (
          <li
            key={s.id}
            className={`rounded-md border p-3 ${
              s.done ? "border-green-400/40 bg-green-400/5" : "border-[#3b6fa0]/30 bg-[#0f1b3d]/40"
            }`}
          >
            <div className="font-plex-mono text-[10px] uppercase tracking-wider text-[#e8edf3]/60">
              {s.title}
            </div>
            <div className="mt-1 text-sm text-[#e8edf3]">{s.subtitle}</div>
            <div className="mt-2 text-xs text-[#e8edf3]/70">{s.detail}</div>
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
