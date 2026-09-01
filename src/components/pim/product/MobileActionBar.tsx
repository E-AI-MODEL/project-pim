import { useIsMobile } from "@/hooks/use-mobile";
import { useProductShell } from "./ProductShellContext";
import { AnalysisStatus, type AnalysisState } from "./AnalysisStatus";

/**
 * Vaste actiebalk onderaan het mobiele scherm: één knop om na te kijken en
 * één statusregel. Op mobiel start analyse altijd handmatig.
 */
export function MobileActionBar({
  state,
  label = "Kijk mijn tekst na",
  disabled,
}: {
  state: AnalysisState;
  label?: string;
  disabled?: boolean;
}) {
  const { runAnalysis } = useProductShell();
  const isMobile = useIsMobile();
  if (!isMobile) return null;
  return (
    <div
      data-testid="mobile-action-bar"
      className="sticky bottom-0 z-30 -mx-4 mt-4 border-t border-[#e5e7ef] bg-white/95 px-4 py-2.5 backdrop-blur"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0 truncate">
          <AnalysisStatus state={state} />
        </div>
        <button
          type="button"
          data-testid="run-analysis-mobile"
          onClick={runAnalysis}
          disabled={disabled}
          className="shrink-0 rounded-lg bg-[#6d4aff] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
        >
          {label}
        </button>
      </div>
    </div>
  );
}
