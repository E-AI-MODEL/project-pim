// §8.3 — Anoniem | Pseudoniem-lokaal + doel-keuze.
import type { Mode, Action } from "@/lib/pim/types";
import { COPY } from "@/lib/pim/copy";

interface Props {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  action: Action;
  onActionChange: (a: Action) => void;
}

const TARGETS: { id: Action; label: string }[] = [
  { id: "send_external_ai", label: COPY.targetExternalAi },
  { id: "copy", label: COPY.targetCopy },
  { id: "export_file", label: COPY.targetExport },
  { id: "print", label: COPY.targetPrint },
  { id: "share", label: COPY.targetShare },
  { id: "display", label: COPY.targetDisplay },
];

export function ModeTargetBar({ mode, onModeChange, action, onActionChange }: Props) {
  return (
    <div className="space-y-3 rounded-xl border border-border/40 bg-card/40 p-4">
      <div className="space-y-1.5">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Hoe verwerken
        </span>
        <div className="flex flex-wrap gap-2">
          <Toggle
            on={mode === "anonymous"}
            onClick={() => onModeChange("anonymous")}
            hint={COPY.modeAnonymousHint}
          >
            {COPY.modeAnonymous}
          </Toggle>
          <Toggle
            on={mode === "pseudonymous"}
            onClick={() => onModeChange("pseudonymous")}
            hint={COPY.modePseudonymousHint}
          >
            {COPY.modePseudonymous}
          </Toggle>
        </div>
      </div>
      <div className="space-y-1.5">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {COPY.targetLabel}
        </span>
        <select
          value={action}
          onChange={(e) => onActionChange(e.target.value as Action)}
          className="w-full sm:w-auto rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          {TARGETS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Toggle({
  on,
  onClick,
  children,
  hint,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
        on
          ? "bg-primary text-primary-foreground border-primary shadow-[0_0_16px_oklch(0.78_0.16_230/0.4)]"
          : "bg-card/40 border-border/60 hover:bg-card"
      }`}
    >
      {children}
      {hint && <span className="ml-1.5 text-[10px] opacity-70">{hint}</span>}
    </button>
  );
}
