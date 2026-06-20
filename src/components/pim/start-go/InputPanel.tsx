// §8.2 — textarea + voorbeeldknop + Start PiM + korte privacyregel.
import { COPY } from "@/lib/pim/copy";
import { ExamplePicker, type Example } from "./ExamplePicker";
import { Play } from "lucide-react";

interface Props {
  text: string;
  onTextChange: (v: string) => void;
  onStart: () => void;
  onExample: (e: Example) => void;
  busy?: boolean;
}

export function InputPanel({ text, onTextChange, onStart, onExample, busy }: Props) {
  return (
    <section className="space-y-3">
      <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight">
        {COPY.title}
      </h1>
      <p className="text-sm text-muted-foreground">{COPY.subtitle}</p>

      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder={COPY.placeholder}
        rows={8}
        spellCheck={false}
        className="w-full rounded-lg border border-border/60 bg-card/50 px-3 py-2.5 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y min-h-[180px]"
      />

      <ExamplePicker onPick={onExample} />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onStart}
          disabled={busy || text.trim().length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          {busy ? "Bezig…" : COPY.startButton}
        </button>
        <span className="text-[11px] text-muted-foreground">{COPY.privacyHint}</span>
      </div>
    </section>
  );
}