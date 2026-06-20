// §8.3 — Anoniem | Pseudoniem-lokaal + doel-keuze.
import type { Mode, Action } from "@/lib/pim/types";
import { COPY } from "@/lib/pim/copy";

interface Props {
  mode: Mode; onModeChange: (m: Mode) => void;
  action: Action; onActionChange: (a: Action) => void;
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
    <div className="space-y-2.5 rounded-lg border border-border/40 bg-card/30 p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Mode:</span>
        <Toggle on={mode === "anonymous"} onClick={() => onModeChange("anonymous")}>
          {COPY.modeAnonymous}
        </Toggle>
        <Toggle on={mode === "pseudonymous"} onClick={() => onModeChange("pseudonymous")}>
          {COPY.modePseudonymous}
        </Toggle>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">{COPY.targetLabel}:</span>
        <select
          value={action}
          onChange={(e) => onActionChange(e.target.value as Action)}
          className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs"
        >
          {TARGETS.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
        on
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card/40 border-border/60 hover:bg-card"
      }`}
    >
      {children}
    </button>
  );
}