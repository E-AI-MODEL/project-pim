import type { PipelineStep } from "@/hooks/usePipelineHeartbeat";

interface Props {
  steps: PipelineStep[];
}

export function PipelineTimeline({ steps }: Props) {
  const now = performance.now();
  return (
    <div className="relative overflow-x-auto">
      <div className="flex items-stretch gap-1 min-w-max">
        {steps.map((s, i) => {
          const age = s.lastTickMs === 0 ? Infinity : now - s.lastTickMs;
          const hot = age < 450;
          const warm = age < 2000;
          const dotColor = hot
            ? "bg-cyan"
            : warm
            ? "bg-primary"
            : "bg-card border border-border/60";
          return (
            <div key={s.id} className="flex items-center gap-1">
              <div className="flex flex-col items-center gap-1.5 px-2.5 py-1 min-w-[64px]">
                <div className="relative h-3 w-3 flex items-center justify-center">
                  {hot && (
                    <span className="absolute inset-0 rounded-full bg-cyan/60 animate-ping" />
                  )}
                  <span className={`relative h-2.5 w-2.5 rounded-full ${dotColor} ${warm && !hot ? "animate-pulse" : ""}`} />
                </div>
                <div className={`font-mono text-[10px] uppercase tracking-wider ${warm ? "text-foreground" : "text-muted-foreground/60"}`}>
                  {s.label}
                </div>
                <div className="font-mono text-[9px] text-muted-foreground/70 tabular-nums">
                  {s.lastTickMs === 0 ? "—" : `${s.durationMs.toFixed(0)}ms`}
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-px w-4 ${warm ? "bg-primary/40" : "bg-border/40"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}