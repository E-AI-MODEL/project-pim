import { useState } from "react";
import { Gauge } from "lucide-react";
import { runDetectionBenchmark, type BenchmarkResult } from "@/lib/pim/benchmark";

const VERDICT_TEXT: Record<BenchmarkResult["verdict"], string> = {
  snel: "Snel genoeg voor meelezen tijdens het typen.",
  bruikbaar: "Bruikbaar; nakijken op knopdruk gaat vlot, meelezen kan haperen.",
  traag: "Traag op dit apparaat; kies nakijken op knopdruk in plaats van meelezen.",
};

/**
 * Snelheidsmeting op het apparaat zelf. De auditomgeving heeft geen WebGPU,
 * dus deze meting hoort thuis op de hardware van de school. Alles blijft lokaal.
 */
export function PerfBenchmark() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await runDetectionBenchmark());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Meting mislukt");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded border border-[#e5e7ef] p-3 space-y-2" data-testid="perf-benchmark">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px] font-medium text-[#0f172a]">
          <Gauge className="h-3.5 w-3.5 text-[#64748b]" />
          Snelheid op dit apparaat
        </div>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          data-testid="perf-benchmark-run"
          className="rounded-lg border border-[#e2e8f0] bg-white px-2.5 py-1 text-[11px] font-medium text-[#334155] hover:bg-[#f1f2f7] disabled:opacity-50"
        >
          {busy ? "Meten…" : "Meet nu"}
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-[#64748b]">
        Draait een vaste voorbeeldtekst door de detectie en meet de rekentijd. De uitkomst blijft op
        dit apparaat.
      </p>

      {error && <div className="text-[11px] text-red-700">{error}</div>}

      {result && (
        <div className="space-y-1.5" data-testid="perf-benchmark-result">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-plex-mono text-[11px]">
            <span className="text-[#64748b]">tekstlengte</span>
            <span className="text-right">{result.chars} tekens</span>
            <span className="text-[#64748b]">regels en lijsten</span>
            <span className="text-right">{result.rulesMsAvg.toFixed(1)} ms</span>
            <span className="text-[#64748b]">tekens per seconde</span>
            <span className="text-right">{result.rulesCharsPerSec.toLocaleString("nl-NL")}</span>
            <span className="text-[#64748b]">taalmodel</span>
            <span className="text-right">
              {result.nerMsAvg == null ? "niet geladen" : `${result.nerMsAvg.toFixed(0)} ms`}
            </span>
            <span className="text-[#64748b]">rekenwijze</span>
            <span className="text-right">{result.nerRuntime ?? "regels alleen"}</span>
          </div>
          <div className="rounded bg-[#f1f2f7] px-2 py-1.5 text-[11px] text-[#334155]">
            {VERDICT_TEXT[result.verdict]}
          </div>
        </div>
      )}
    </div>
  );
}
