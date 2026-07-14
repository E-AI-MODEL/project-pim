import type { PipelineStep } from "@/hooks/usePipelineHeartbeat";

export type PipelineStepStatus = "idle" | "ok" | "found" | "warn" | "block" | "skip";

export interface PipelineStepView {
  id: string;
  index: number;
  title: string; // Human Dutch title, e.g. "Patroon-detectie"
  subtitle: string; // 3-6 words — what it does
  detail: string; // Semantic explanation based on current state
  status: PipelineStepStatus;
  badge?: string; // small chip e.g. "3 matches"
  lastTickMs: number;
  durationMs: number;
}

const STATUS_DOT: Record<PipelineStepStatus, string> = {
  idle: "bg-card border border-border/50",
  skip: "bg-card border border-border/40",
  ok: "bg-green",
  found: "bg-cyan",
  warn: "bg-orange",
  block: "bg-red",
};

const STATUS_RING: Record<PipelineStepStatus, string> = {
  idle: "border-border/40",
  skip: "border-border/40 opacity-60",
  ok: "border-green/40 bg-green/5",
  found: "border-cyan/40 bg-cyan/5",
  warn: "border-orange/50 bg-orange/5",
  block: "border-red/60 bg-red/5",
};

const STATUS_LABEL: Record<PipelineStepStatus, string> = {
  idle: "wacht",
  skip: "n.v.t.",
  ok: "ok",
  found: "actief",
  warn: "let op",
  block: "geblokkeerd",
};

interface Props {
  steps: PipelineStepView[];
  heartbeats?: PipelineStep[];
}

export function PipelineTimeline({ steps, heartbeats }: Props) {
  const now = performance.now();
  const beatMap = new Map((heartbeats ?? []).map((h) => [h.id, h]));
  return (
    <ol className="space-y-1.5">
      {steps.map((s, i) => {
        const hb = beatMap.get(s.id);
        const age = hb && hb.lastTickMs > 0 ? now - hb.lastTickMs : Infinity;
        const hot = age < 600;
        return (
          <li key={s.id}>
            <details
              className={`group rounded-lg border ${STATUS_RING[s.status]} transition-colors`}
            >
              <summary className="cursor-pointer list-none flex items-start gap-2.5 p-2.5 hover:bg-background/40">
                <div className="flex flex-col items-center pt-0.5 flex-shrink-0">
                  <span className="font-mono text-[9px] text-muted-foreground tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="relative h-3 w-3 mt-0.5 flex items-center justify-center">
                    {hot && (
                      <span className="absolute inset-0 rounded-full bg-cyan/50 animate-ping" />
                    )}
                    <span className={`relative h-2.5 w-2.5 rounded-full ${STATUS_DOT[s.status]}`} />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="font-display font-semibold text-[13px] leading-tight">
                      {s.title}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {s.badge && (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full border border-border/60 text-foreground/80">
                          {s.badge}
                        </span>
                      )}
                      <span
                        className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          s.status === "block"
                            ? "text-red"
                            : s.status === "warn"
                              ? "text-orange"
                              : s.status === "ok"
                                ? "text-green"
                                : s.status === "found"
                                  ? "text-cyan"
                                  : "text-muted-foreground/70"
                        }`}
                      >
                        {STATUS_LABEL[s.status]}
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
                    {s.subtitle}
                  </div>
                </div>
              </summary>
              <div className="px-2.5 pb-2.5 pt-0 pl-9">
                <p className="text-[11px] text-foreground/85 leading-relaxed">{s.detail}</p>
                <div className="mt-1.5 font-mono text-[9px] text-muted-foreground/70 tabular-nums">
                  step #{s.index} ·{" "}
                  {hb && hb.lastTickMs > 0
                    ? `${hb.durationMs.toFixed(0)}ms`
                    : "nog niet uitgevoerd"}
                </div>
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}
