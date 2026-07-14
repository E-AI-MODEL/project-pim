import type { Verdict } from "@/lib/pim/types";
import { COPY } from "@/lib/pim/copy";
import { Copy, AlertTriangle, RotateCcw, Check, Download, FileText, Shield } from "lucide-react";
import { useState } from "react";

interface Props {
  verdict: Verdict;
  /** Live-her-evaluatie van bewerkte tekst. BLOCK disablet kopie/download. */
  liveVerdict?: Verdict | null;
  onPrimary: () => void;
  /** Egress-gated copy via executeAction in StartGoShell. */
  onCopy?: () => Promise<{ executed: boolean; reason: string }>;
  /** Egress-gated download via executeAction in StartGoShell. */
  onDownload?: () => Promise<{ executed: boolean; reason: string }>;
  safeText?: string;
  busy?: boolean;
}

export function ResultActions({
  verdict,
  liveVerdict,
  onPrimary,
  onCopy,
  onDownload,
  safeText,
  busy,
}: Props) {
  const map = {
    ALLOW: {
      label: COPY.buttonAllow,
      Icon: Copy,
      cls: "bg-primary text-primary-foreground hover:bg-primary/90",
    },
    ALLOW_WITH_WARNING: {
      label: COPY.buttonAllowWarning,
      Icon: AlertTriangle,
      cls: "bg-orange-500 text-white hover:bg-orange-500/90",
    },
    BLOCK: {
      label: COPY.buttonBlock,
      Icon: RotateCcw,
      cls: "bg-card border border-border hover:bg-accent/40",
    },
  }[verdict];
  const { Icon } = map;

  const [copied, setCopied] = useState(false);
  const [shortMsg, setShortMsg] = useState<string | null>(null);
  // Quick-copy/download geldt voor de BEWERKTE veilige tekst. Wanneer de
  // gebruiker daar PII in terugzet, levert liveVerdict BLOCK op en blokt
  // de gate de actie — knoppen worden dan visueel disabled.
  const effectiveVerdict = liveVerdict ?? verdict;
  const canCopyOrDownload =
    effectiveVerdict !== "BLOCK" && !!safeText && safeText.trim().length > 0;
  const blockedByEdit = liveVerdict === "BLOCK" && verdict !== "BLOCK";

  async function copySafe() {
    if (!safeText || !onCopy) return;
    const r = await onCopy();
    if (r.executed) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      setShortMsg(`Geblokt door egress-gate: ${r.reason}`);
      setTimeout(() => setShortMsg(null), 3500);
    }
  }

  async function downloadSafe() {
    if (!safeText || !onDownload) return;
    const r = await onDownload();
    if (!r.executed) {
      setShortMsg(`Geblokt door egress-gate: ${r.reason}`);
      setTimeout(() => setShortMsg(null), 3500);
    }
  }

  function newCheck() {
    window.dispatchEvent(new CustomEvent("pim:reset"));
  }

  return (
    <div className="space-y-1.5">
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
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
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

        {blockedByEdit && (
          <button
            type="button"
            disabled
            title="Egress-gate blokt: bewerkte tekst is opnieuw beoordeeld als BLOCK."
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-200 text-sm font-medium opacity-70 cursor-not-allowed"
          >
            <Shield className="h-4 w-4" />
            Kopie/download geblokt
          </button>
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
      {shortMsg && <div className="text-[11px] text-rose-300 px-1">{shortMsg}</div>}
    </div>
  );
}
