// Gedeelde NER-modelkiezer: compact (DistilBERT) ↔ volledig (mBERT).
// De variant is een globale singleton in nerSlm, dus elke render leest de
// actuele keuze via getNerVariant(). Twee tonen zodat de kiezer past in zowel
// de donkere homepage-monitor als het lichte schrijfmodus-paneel.
import { useState } from "react";
import { getNerVariant, setNerVariant, NER_VARIANTS, type NerVariantKey } from "@/lib/pim";

export function NerVariantPicker({
  onChange,
  tone = "light",
}: {
  /** Aangeroepen ná het wisselen, caller kan opnieuw laden indien NER actief was. */
  onChange?: (v: NerVariantKey) => void;
  tone?: "light" | "dark";
}) {
  const [variant, setVariant] = useState<NerVariantKey>(getNerVariant());
  const dark = tone === "dark";

  const select = (v: NerVariantKey) => {
    if (v === variant) return;
    setNerVariant(v); // reset de pipeline → status springt naar idle
    setVariant(v);
    onChange?.(v);
  };

  return (
    <div
      className={
        dark
          ? "flex items-center justify-between gap-2 rounded-lg border border-[#e5e7ef] bg-white/45 px-2.5 py-1.5"
          : "flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background/30 px-2.5 py-1.5"
      }
    >
      <span
        className={
          dark
            ? "font-plex-mono text-[10px] uppercase tracking-wider text-[#64748b]"
            : "text-[11px] uppercase tracking-wider text-muted-foreground"
        }
      >
        NER-model
      </span>
      <div
        className={`inline-flex overflow-hidden rounded-md border text-[11px] ${
          dark ? "border-[#e5e7ef]" : "border-border/50"
        }`}
      >
        {(Object.keys(NER_VARIANTS) as NerVariantKey[]).map((v) => {
          const active = variant === v;
          const activeCls = dark
            ? "bg-[#3b6fa0]/40 text-[#0f172a] font-semibold"
            : "bg-primary text-primary-foreground font-semibold";
          const idleCls = dark
            ? "text-[#0f172a]/65 hover:bg-[#f1f2f7]"
            : "text-muted-foreground hover:bg-accent/40";
          return (
            <button
              key={v}
              type="button"
              onClick={() => select(v)}
              aria-pressed={active}
              title={NER_VARIANTS[v].notes}
              className={`px-2.5 py-1 transition-colors ${active ? activeCls : idleCls}`}
            >
              {NER_VARIANTS[v].label} · {NER_VARIANTS[v].sizeLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
