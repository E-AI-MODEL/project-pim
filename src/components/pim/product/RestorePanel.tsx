import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { logLocalKeyAccess } from "@/lib/pim/engine";
import { restoreTextWithMapping } from "@/lib/pim/restore";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mapping: ReadonlyMap<string, string> | null;
}

/**
 * Zet een AI-antwoord met codes terug naar de echte namen. Werkt alleen met
 * de sleutel uit deze sessie; niets wordt opgeslagen of verstuurd.
 */
export function RestorePanel({ open, onOpenChange, mapping }: Props) {
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setInput("");
      setMsg(null);
    }
  }, [open]);

  const result = useMemo(
    () => (mapping && input.trim() ? restoreTextWithMapping(input, mapping) : null),
    [input, mapping],
  );

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.text);
      logLocalKeyAccess(`AI-antwoord teruggezet (${result.restored} codes), alleen lokaal`);
      setMsg("Gekopieerd. Plak het in je dossier of document.");
    } catch {
      setMsg("Kopiëren lukte niet, probeer het opnieuw.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg bg-white text-[#0f172a] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="text-[#0f172a]">Namen terugzetten</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3 text-[13px] text-[#334155]" data-testid="restore-panel">
          {!mapping || mapping.size === 0 ? (
            <p>
              Er is nog geen sleutel in deze sessie. Kies eerst "Codes" en laat je tekst nakijken.
            </p>
          ) : (
            <>
              <p>
                Plak het antwoord dat je van ChatGPT of Copilot terugkreeg. PiM zet de codes terug
                met de sleutel van deze sessie.
              </p>
              <textarea
                data-testid="restore-input"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setMsg(null);
                }}
                rows={7}
                placeholder="Plak hier het AI-antwoord"
                className="w-full rounded-lg border border-[#e5e7ef] bg-white p-3 text-[13px] text-[#0f172a] focus:outline-none focus:ring-2 focus:ring-[#6d4aff]/30"
              />
              {result && (
                <>
                  <div className="text-[12px] text-[#64748b]" data-testid="restore-summary">
                    {result.restored === 0
                      ? "Geen bekende codes gevonden in deze tekst."
                      : `${result.restored} ${result.restored === 1 ? "code" : "codes"} teruggezet.`}
                    {result.unknown.length > 0 && (
                      <span className="block text-amber-700">
                        Niet in de sleutel: {result.unknown.join(", ")}. Die blijven staan.
                      </span>
                    )}
                  </div>
                  <div
                    data-testid="restore-output"
                    className="whitespace-pre-wrap rounded-lg border border-[#e5e7ef] bg-[#f6f7fb] p-3 text-[13px] text-[#0f172a]"
                  >
                    {result.text}
                  </div>
                  <button
                    type="button"
                    onClick={copy}
                    className="w-full rounded-lg bg-[#0f172a] px-3 py-2 text-[12px] font-medium text-white hover:bg-[#1e293b]"
                  >
                    Kopieer teruggezette tekst
                  </button>
                </>
              )}
              {msg && <p className="text-[12px] text-[#334155]">{msg}</p>}
              <p className="text-[11px] text-[#94a3b8]">
                De sleutel verdwijnt als je dit tabblad sluit of een nieuwe tekst begint.
              </p>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
