// §8.2 — textarea + voorbeeldknop + Start PiM + korte privacyregel.
import { COPY } from "@/lib/pim/copy";
import { ExamplePicker, type Example } from "./ExamplePicker";
import { Play, Cpu, Radio } from "lucide-react";

interface Props {
  text: string;
  onTextChange: (v: string) => void;
  onStart: () => void;
  onExample: (e: Example) => void;
  busy?: boolean;
  /** Compacte variant zonder hero — voor de Console-layout op /. */
  compact?: boolean;
}

export function InputPanel({ text, onTextChange, onStart, onExample, busy, compact }: Props) {
  return (
    <section className="space-y-5">
      {!compact && (
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary uppercase tracking-wider">
            {COPY.eyebrow}
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-5xl tracking-tight leading-[1.05]">
            {COPY.title} {COPY.titleLine2}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
            {COPY.subtitle}
          </p>
        </div>
      )}

      <div className="relative">
        <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder={COPY.placeholder}
        rows={compact ? 6 : 8}
        spellCheck={false}
          className={`w-full rounded-md border px-4 py-3 text-sm leading-relaxed focus:outline-none resize-y transition-colors ${
            compact
              ? "bg-[#0f1b3d]/60 border-[#3b6fa0]/25 focus:border-[#3b6fa0] text-[#e8edf3] placeholder:text-[#e8edf3]/35 font-plex-mono min-h-[160px]"
              : "bg-card/60 border-border/60 focus:ring-2 focus:ring-primary/40 focus:border-primary/40 font-mono min-h-[200px] shadow-inner"
          }`}
        />
        {text.trim().length > 0 && (
          <div className={`absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full backdrop-blur px-2 py-0.5 text-[10px] font-medium animate-fade-in ${
            compact
              ? "bg-[#0f1b3d]/80 text-[#3b6fa0] border border-[#3b6fa0]/40"
              : "bg-background/80 text-primary border border-primary/30"
          }`}>
            <Radio className="h-2.5 w-2.5 animate-pulse" />
            {COPY.liveBadge}
          </div>
        )}
      </div>

      <ExamplePicker onPick={onExample} />

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onStart}
          disabled={busy || text.trim().length === 0}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-md font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            compact
              ? "bg-[#3b6fa0] text-[#e8edf3] hover:brightness-110"
              : "rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_24px_oklch(0.78_0.16_230/0.35)] hover:shadow-[0_0_36px_oklch(0.78_0.16_230/0.5)]"
          }`}
        >
          <Play className="h-4 w-4" />
          {busy ? "Bezig…" : COPY.startButton}
        </button>
        <span className={`inline-flex items-center gap-1.5 text-[11px] ${compact ? "text-[#e8edf3]/55" : "text-muted-foreground"}`}>
          <Cpu className="h-3 w-3" />
          {COPY.privacyHint}
        </span>
      </div>
    </section>
  );
}