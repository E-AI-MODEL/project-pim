import type { Verdict } from "@/lib/pim/types";
import { COPY } from "@/lib/pim/copy";
import { Copy, AlertTriangle, RotateCcw, Check, Download, FileText } from "lucide-react";
import { useState } from "react";

interface Props {
  verdict: Verdict;
  onPrimary: () => void;
  safeText?: string;
  busy?: boolean;
}

export function ResultActions({ verdict, onPrimary, safeText, busy }: Props) {
  const map = {
    ALLOW:              { label: COPY.buttonAllow,        Icon: Copy,           cls: "bg-primary text-primary-foreground hover:bg-primary/90" },
    ALLOW_WITH_WARNING: { label: COPY.buttonAllowWarning, Icon: AlertTriangle,  cls: "bg-orange-500 text-white hover:bg-orange-500/90" },
    BLOCK:              { label: COPY.buttonBlock,        Icon: RotateCcw,      cls: "bg-card border border-border hover:bg-accent/40" },
  }[verdict];
  const { Icon } = map;

  const [copied, setCopied] = useState(false);
  const canCopyOrDownload = verdict !== "BLOCK" && !!safeText && safeText.trim().length > 0;

  async function copySafe() {
    if (!safeText) return;
    try {
      await navigator.clipboard.writeText(safeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard kan geweigerd zijn — stilzwijgend negeren */
    }
  }

  function downloadSafe() {
    if (!safeText) return;
    const blob = new Blob([safeText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pim-veilige-tekst-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function newCheck() {
    window.dispatchEvent(new CustomEvent("pim:reset"));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onPrimary}
        disabled={busy}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 ${map.cls}`}
      >
        <Icon className="h-4 w-4" />
        {busy ? "Bezig…" : map.label}
      </button>

      {canCopyOrDownload && (
        <>
          <button
            type="button"
            onClick={copySafe}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/60 bg-card/40 hover:bg-accent/40 text-sm font-medium transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-green-400" /> : <FileText className="h-4 w-4" />}
            {copied ? "Gekopieerd" : "Kopieer veilige tekst"}
          </button>
          <button
            type="button"
            onClick={downloadSafe}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/60 bg-card/40 hover:bg-accent/40 text-sm font-medium transition-colors"
          >
            <Download className="h-4 w-4" />
            Download .txt
          </button>
        </>
      )}

      <button
        type="button"
        onClick={newCheck}
        className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/60 bg-card/40 hover:bg-accent/40 text-sm font-medium transition-colors"
      >
        <RotateCcw className="h-4 w-4" />
        Nieuwe controle
      </button>
    </div>
  );
}