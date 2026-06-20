import type { Verdict } from "@/lib/pim/types";
import { COPY } from "@/lib/pim/copy";
import { Copy, AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  verdict: Verdict;
  onPrimary: () => void;
  busy?: boolean;
}

export function ResultActions({ verdict, onPrimary, busy }: Props) {
  const map = {
    ALLOW:              { label: COPY.buttonAllow,        Icon: Copy,           cls: "bg-primary text-primary-foreground hover:bg-primary/90" },
    ALLOW_WITH_WARNING: { label: COPY.buttonAllowWarning, Icon: AlertTriangle,  cls: "bg-orange-500 text-white hover:bg-orange-500/90" },
    BLOCK:              { label: COPY.buttonBlock,        Icon: RotateCcw,      cls: "bg-card border border-border hover:bg-accent/40" },
  }[verdict];
  const { Icon } = map;
  return (
    <button
      type="button"
      onClick={onPrimary}
      disabled={busy}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 ${map.cls}`}
    >
      <Icon className="h-4 w-4" />
      {busy ? "Bezig…" : map.label}
    </button>
  );
}