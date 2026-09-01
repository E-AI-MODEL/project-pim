import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useProductShell } from "./ProductShellContext";

/**
 * Eenmalige uitnodiging om de lokale AI (NER) aan te zetten.
 * Gedeeld door Tekst nakijken en Zelf schrijven: één bron van waarheid
 * (`nerEnabled` / `startNer` uit de shell), dus geen dubbele modeldownload
 * en geen tweede activeerknop per scherm.
 */
export function LocalAiOffer() {
  const { usesNerSlm, nerEnabled, nerStatus, startNer } = useProductShell();
  const [dismissed, setDismissed] = useState(false);

  // AI staat uit in de instellingen, of draait al: geen uitnodiging.
  if (!usesNerSlm) return null;
  if (nerStatus?.working) return null;

  if (nerStatus?.loading) {
    const pct = nerStatus.progress?.pct;
    return (
      <div className="rounded-xl border border-[#e5e7ef] bg-white px-4 py-3 text-[13px] text-[#475569]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#6d4aff]" />
          <span>
            Lokale AI wordt geladen{typeof pct === "number" ? `, ${Math.round(pct)}%` : ""}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#eef0f5]">
          <div
            className="h-full rounded-full bg-[#6d4aff] transition-all"
            style={{ width: typeof pct === "number" ? `${Math.min(100, pct)}%` : "35%" }}
          />
        </div>
      </div>
    );
  }

  const failed = Boolean(nerStatus?.error || nerStatus?.healthError);
  if (dismissed && !failed) return null;
  if (nerEnabled && !failed) return null;

  return (
    <div className="relative rounded-xl border border-[#e5e7ef] bg-white px-4 py-3.5">
      <button
        type="button"
        aria-label="Uitnodiging sluiten"
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 rounded p-1 text-[#94a3b8] hover:bg-[#f6f7fb] hover:text-[#475569]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-2.5">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#6d4aff]" />
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#1e293b]">Zet de lokale AI aan</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-[#64748b]">
            {failed
              ? "Het model kon niet laden. Probeer het opnieuw, PiM werkt intussen door met vaste regels."
              : "Herkent ook namen die geen vaste vorm hebben. Eenmalige download van ongeveer 100 MB, daarna blijft alles in je browser."}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={startNer}
              className="rounded-lg bg-[#6d4aff] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#5b3dea]"
            >
              {failed ? "Opnieuw proberen" : "Zet lokale AI aan"}
            </button>
            <span className="text-[11px] text-[#94a3b8]">Werken zonder AI kan ook</span>
          </div>
        </div>
      </div>
    </div>
  );
}
