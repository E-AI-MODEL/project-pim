import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Info,
  Workflow,
  Layers,
  Flag,
  ShieldCheck,
  CheckCircle,
  Trash2,
  Loader2,
} from "lucide-react";
import { COPY } from "@/lib/pim/copy";
import { clearAllLocalData } from "@/lib/pim";

const LINKS = [
  { to: "/over", label: COPY.menuAbout, icon: <Info className="h-4 w-4" /> },
  { to: "/pipeline", label: COPY.menuPipeline, icon: <Workflow className="h-4 w-4" /> },
  { to: "/modes", label: COPY.menuModes, icon: <Layers className="h-4 w-4" /> },
  { to: "/flags", label: COPY.menuFlags, icon: <Flag className="h-4 w-4" /> },
  { to: "/trust", label: COPY.menuTrust, icon: <ShieldCheck className="h-4 w-4" /> },
  { to: "/compliance", label: COPY.menuCompliance, icon: <CheckCircle className="h-4 w-4" /> },
];

/**
 * Tabblad "Over": korte uitleg, achtergrondpagina's en lokale opslag wissen.
 * Vervangt het losse burgermenu-overlay.
 */
export function AboutTab({ onNavigate }: { onNavigate?: () => void }) {
  const [clearing, setClearing] = useState(false);

  const handleClearStorage = async () => {
    if (clearing) return;
    const includeModels = window.confirm(
      "Lokale opslag wissen?\n\n" +
        "Dit ruimt je werkdata op: token-mappings, de review-queue, en lokale " +
        "opslag van deze browser. Klik OK om ook de gedownloade modellen " +
        "(NER ~100 MB, Qwen ~400 MB) te wissen. Die worden dan opnieuw " +
        "gedownload zodra je ze weer aanzet.\n\n" +
        "Annuleer om niets te wissen.",
    );
    if (!includeModels && !window.confirm("Alleen werkdata wissen, modellen behouden?")) {
      return;
    }
    setClearing(true);
    try {
      const r = await clearAllLocalData({ includeModels });
      window.dispatchEvent(new CustomEvent("pim:reset"));
      const parts = [
        `${r.localStorage + r.sessionStorage} opslagsleutels`,
        r.modelsCleared ? `${r.caches} caches · ${r.indexedDb} databases` : "modellen behouden",
      ];
      window.alert(
        `Lokale opslag gewist (${parts.join(", ")}).` +
          (r.errors.length
            ? `\n\nLet op: ${r.errors.length} onderdeel kon niet volledig worden gewist.`
            : ""),
      );
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-3" data-testid="about-tab">
      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-3">
        <div className="text-[13px] font-semibold text-[#0f172a]">Privacy Integrity Monitor</div>
        <p className="mt-1 text-[12px] leading-relaxed text-[#475569]">
          PiM kijkt mee met je tekst en markeert persoonsgegevens. Alles gebeurt op dit apparaat; je
          tekst wordt niet verstuurd.
        </p>
      </div>

      <nav className="rounded-2xl border border-[#e2e8f0] bg-white p-1.5">
        <ul>
          {LINKS.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                onClick={onNavigate}
                className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] font-medium text-[#334155] hover:bg-[#f1f2f7] hover:text-[#0f172a]"
              >
                <span className="text-[#94a3b8]">{l.icon}</span>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <button
        type="button"
        onClick={handleClearStorage}
        disabled={clearing}
        data-testid="clear-storage"
        className="flex w-full items-center gap-3 rounded-2xl border border-[#e2e8f0] bg-white px-3 py-2.5 text-left text-[13px] font-medium text-[#334155] hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
      >
        <span className="text-[#94a3b8]">
          {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </span>
        {clearing ? "Bezig met wissen…" : COPY.menuClearStorage}
      </button>
    </div>
  );
}
