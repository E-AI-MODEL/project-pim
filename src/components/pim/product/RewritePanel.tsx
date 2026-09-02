import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  onRewriteStatus,
  loadRewriteLlm,
  rewriteAnonymousDraftStream,
  type RewriteStatus,
} from "@/lib/pim/rewriteLlm";
import { hasPseudonymTokens } from "@/lib/pim/pseudonymTokens";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** De reeds nagekeken, anonieme tekst. */
  sourceText: string;
  onAccept: (text: string) => void;
}

/**
 * Los venster voor herschrijven. Het herschrijfmodel is een aparte, optionele
 * download (~400 MB) en start pas na een expliciete klik. Herschrijven gebeurt
 * alleen op een al schoongemaakte tekst; het resultaat gaat terug de werkruimte
 * in en wordt daar opnieuw nagekeken.
 */
export function RewritePanel({ open, onOpenChange, sourceText, onAccept }: Props) {
  const [status, setStatus] = useState<RewriteStatus | null>(null);
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => onRewriteStatus(setStatus), []);
  useEffect(() => {
    if (!open) {
      startedRef.current = false;
      setOutput("");
      setError(null);
    }
  }, [open]);

  const blocked = hasPseudonymTokens(sourceText);
  const empty = sourceText.trim().length === 0;

  const start = async () => {
    if (blocked || empty || busy) return;
    setBusy(true);
    setError(null);
    setOutput("");
    startedRef.current = true;
    try {
      const eng = await loadRewriteLlm();
      if (!eng) {
        setError("Het herschrijfmodel kon niet geladen worden.");
        return;
      }
      const res = await rewriteAnonymousDraftStream(sourceText, (_chunk, acc) => setOutput(acc));
      setOutput(res.text);
      if (!res.usedLlm) setError(res.reason);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Herschrijven lukte niet.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        data-testid="rewrite-panel"
        className="w-full sm:max-w-xl overflow-y-auto border-[#e5e7ef] bg-[#f6f7fb] p-4"
      >
        <SheetHeader className="pb-2 text-left">
          <SheetTitle className="text-[15px] text-[#0f172a]">Tekst laten herschrijven</SheetTitle>
        </SheetHeader>

        <div className="space-y-3">
          <p className="text-[12px] leading-relaxed text-[#475569]">
            Een klein taalmodel draait in je browser en maakt de nagekeken tekst vlotter en minder
            herleidbaar. De eerste keer wordt het model gedownload (ongeveer 400 MB). Er gaat geen
            tekst naar buiten.
          </p>

          {blocked && (
            <div
              data-testid="rewrite-blocked"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700"
            >
              Deze tekst bevat pseudoniemcodes. Zet PiM op weghalen (anoniem) voordat je laat
              herschrijven.
            </div>
          )}
          {empty && !blocked && (
            <div className="rounded-lg border border-[#e5e7ef] bg-white px-3 py-2 text-[12px] text-[#475569]">
              Kijk je tekst eerst na, daarna kan PiM hem herschrijven.
            </div>
          )}

          <button
            type="button"
            data-testid="rewrite-start"
            onClick={() => void start()}
            disabled={blocked || empty || busy}
            className="w-full rounded-lg bg-[#6d4aff] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {status?.ready ? "Herschrijven" : "Model downloaden en herschrijven"}
          </button>

          {status?.loading && (
            <div className="rounded-lg border border-[#e5e7ef] bg-white px-3 py-2 text-[12px] text-[#475569]">
              {status.progress?.text ?? "Model laden"}
              {typeof status.progress?.pct === "number" && (
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#eef0f5]">
                  <div
                    className="h-full bg-[#6d4aff]"
                    style={{ width: `${status.progress.pct}%` }}
                  />
                </div>
              )}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
              {error}
            </div>
          )}

          {(output || busy) && (
            <div className="rounded-xl border border-[#e5e7ef] bg-white p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">
                Voorstel
              </div>
              <pre
                data-testid="rewrite-output"
                className="mt-2 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[#0f172a]"
              >
                {output}
              </pre>
            </div>
          )}

          {output && !busy && (
            <button
              type="button"
              data-testid="rewrite-accept"
              onClick={() => {
                onAccept(output);
                onOpenChange(false);
              }}
              className="w-full rounded-lg border border-[#e5e7ef] bg-white px-4 py-2 text-[13px] font-medium text-[#334155] hover:bg-[#f6f7fb]"
            >
              Overnemen in de werkruimte
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
