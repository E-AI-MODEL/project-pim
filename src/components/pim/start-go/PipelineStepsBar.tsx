import { useEffect, useState } from "react";
import { loadNerSlm, onNerStatus, type NerStatus } from "@/lib/pim/nerSlm";
import { loadRewriteLlm, onRewriteStatus, type RewriteStatus } from "@/lib/pim/rewriteLlm";
import { ChevronDown } from "lucide-react";

function useIsMobileLowMem(): { mobile: boolean; lowMem: boolean } {
  const [state, setState] = useState({ mobile: false, lowMem: false });
  useEffect(() => {
    const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const lowMem = typeof mem === "number" && mem < 4;
    setState({ mobile, lowMem });
  }, []);
  return state;
}

function StepPill({
  num, title, sub, status, pct, onClick, disabled, badge,
}: {
  num: number;
  title: string;
  sub: string;
  status: "ready" | "loading" | "idle" | "error";
  pct?: number;
  onClick?: () => void;
  disabled?: boolean;
  badge?: string;
}) {
  const color =
    status === "ready" ? "border-green-400/60 bg-green-400/5"
    : status === "loading" ? "border-amber-400/60 bg-amber-400/5"
    : status === "error" ? "border-red-400/60 bg-red-400/5"
    : "border-[#3b6fa0]/40 bg-[#0f1b3d]/40";
  const label =
    status === "ready" ? "actief"
    : status === "loading" ? (typeof pct === "number" ? `${pct}%` : "laden…")
    : status === "error" ? "fout"
    : "uit";

  return (
    <div className={`rounded-md border ${color} p-3 flex flex-col gap-2 min-w-0`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-plex-mono text-[10px] tracking-[0.18em] uppercase text-[#e8edf3]/55">
            Stap {num}
          </div>
          <div className="font-serif-display text-sm text-[#e8edf3] truncate">{title}</div>
        </div>
        <span className="font-plex-mono text-[10px] uppercase tracking-wider text-[#e8edf3]/70 whitespace-nowrap">
          {label}
        </span>
      </div>
      <div className="text-[11px] text-[#e8edf3]/60 leading-snug">{sub}</div>
      {badge && (
        <div className="text-[10px] text-amber-300/80 font-plex-mono">{badge}</div>
      )}
      {onClick && status !== "ready" && (
        <button
          onClick={onClick}
          disabled={disabled || status === "loading"}
          className="mt-1 text-[11px] font-plex-mono uppercase tracking-wider px-2 py-1 rounded bg-[#3b6fa0]/20 hover:bg-[#3b6fa0]/40 disabled:opacity-40 disabled:cursor-not-allowed text-[#e8edf3] transition-colors"
        >
          {status === "loading" ? "Bezig…" : "Inschakelen"}
        </button>
      )}
      {status === "loading" && typeof pct === "number" && (
        <div className="h-1 rounded bg-[#0f1b3d]/60 overflow-hidden">
          <div className="h-full bg-amber-400/70 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

export function PipelineStepsBar() {
  const [ner, setNer] = useState<NerStatus | null>(null);
  const [llm, setLlm] = useState<RewriteStatus | null>(null);
  const { mobile, lowMem } = useIsMobileLowMem();
  const [open, setOpen] = useState(false);

  useEffect(() => onNerStatus(setNer), []);
  useEffect(() => onRewriteStatus(setLlm), []);

  const nerStatus: "ready" | "loading" | "idle" | "error" =
    ner?.error ? "error" : ner?.ready ? "ready" : ner?.loading ? "loading" : "idle";
  const llmStatus: "ready" | "loading" | "idle" | "error" =
    llm?.error ? "error" : llm?.ready ? "ready" : llm?.loading ? "loading" : "idle";

  const nerPct = ner?.progress?.pct != null ? Math.round(ner.progress.pct * (ner.progress.pct > 1 ? 1 : 100)) : undefined;
  const llmPct = llm?.progress?.pct;

  const llmDisabled = mobile || lowMem;

  const readyCount =
    1 + (nerStatus === "ready" ? 1 : 0) + (llmStatus === "ready" ? 1 : 0);

  return (
    <div className="rounded-md border border-[#3b6fa0]/40 bg-[#0f1b3d]/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-[#3b6fa0]/10 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="font-plex-mono text-[10px] tracking-[0.18em] uppercase text-[#e8edf3]/70">
            Browser-modellen
          </span>
          <span className="font-plex-mono text-[10px] text-[#e8edf3]/55">
            {readyCount}/3 actief
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[#e8edf3]/60 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 border-t border-[#3b6fa0]/30">
      <StepPill
        num={1}
        title="Regex & regels"
        sub="Lokale patroon-detectie — altijd aan, geen download."
        status="ready"
      />
      <StepPill
        num={2}
        title="NER-SLM"
        sub="DistilBERT NER · ~100 MB · WebGPU/WASM"
        status={nerStatus}
        pct={nerPct}
        badge={mobile ? "Mobiel: eerste laad ~20-40s" : undefined}
        onClick={() => loadNerSlm().catch(() => {})}
      />
      <StepPill
        num={3}
        title="Generalisatie-LLM"
        sub="Qwen2.5-0.5B · ~400 MB · WebGPU"
        status={llmStatus}
        pct={llmPct}
        badge={llmDisabled ? "Alleen desktop met ≥4 GB RAM" : undefined}
        onClick={() => loadRewriteLlm().catch(() => {})}
        disabled={llmDisabled}
      />
        </div>
      )}
    </div>
  );
}