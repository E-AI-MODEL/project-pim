import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { COPY } from "@/lib/pim/copy";
import { clearAllLocalData } from "@/lib/pim";

/**
 * Lokale opslag wissen. Zit als los item in het gedeelde zijpaneel, zodat het
 * menu compact blijft en er maar één plek is waar je opruimt.
 */
export function ClearStorageButton({ className }: { className?: string }) {
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
    <button
      type="button"
      onClick={handleClearStorage}
      disabled={clearing}
      data-testid="clear-storage"
      className={[className ?? "", "hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"].join(
        " ",
      )}
    >
      <span className="text-[#94a3b8]">
        {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </span>
      {clearing ? "Bezig met wissen…" : COPY.menuClearStorage}
    </button>
  );
}
