import { useProductShell } from "./ProductShellContext";

/**
 * Eén keuze voor beide schermen: kijkt PiM mee terwijl je typt, of pas als
 * jij het vraagt. De knop "Nu nakijken" blijft in beide gevallen bestaan.
 */
export function AnalysisModeToggle() {
  const { analysisMode, setAnalysisMode, runAnalysis } = useProductShell();
  const opts = [
    { id: "live" as const, label: "PiM kijkt mee terwijl ik typ" },
    { id: "manual" as const, label: "Pas kijken als ik klaar ben" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Wanneer kijkt PiM mee"
        className="inline-flex items-center rounded-lg border border-[#e5e7ef] bg-white p-0.5"
      >
        {opts.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={analysisMode === o.id}
            data-testid={`analysis-mode-${o.id}`}
            onClick={() => setAnalysisMode(o.id)}
            className={`rounded-md px-2.5 py-1 text-[12px] transition-colors ${
              analysisMode === o.id
                ? "bg-[#6d4aff]/10 text-[#6d4aff] font-medium"
                : "text-[#64748b] hover:text-[#0f172a]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        data-testid="run-analysis"
        onClick={runAnalysis}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#6d4aff] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#5b3dea]"
      >
        Nu nakijken
      </button>
    </div>
  );
}
