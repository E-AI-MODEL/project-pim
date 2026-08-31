// In-screen resetknop, vervangt het oude burgermenu-item "Begin met een
// lege tekst". Zelfde gedrag: bevestigen als de schrijfruimte inhoud heeft,
// daarna engine + invoer resetten en focus terug naar het tekstveld.
import { FilePlus2 } from "lucide-react";

export function NewTextButton() {
  const handleNewText = () => {
    const hasContent =
      typeof document !== "undefined" &&
      document.body.getAttribute("data-pim-writer-has-content") === "1";
    if (hasContent) {
      const ok = window.confirm(
        "Er staat tekst in de schrijfmodus. Weet je zeker dat je alles wilt " +
          "wissen en met een nieuwe tekst wilt beginnen?",
      );
      if (!ok) return;
    }
    window.dispatchEvent(new CustomEvent("pim:reset"));
    setTimeout(() => window.dispatchEvent(new CustomEvent("pim:focus-primary")), 80);
  };

  return (
    <button
      type="button"
      data-testid="new-text"
      onClick={handleNewText}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[#e5e7ef] bg-white px-2.5 py-1.5 text-[12px] font-medium text-[#64748b] shadow-sm transition-colors hover:bg-[#f1f2f7] hover:text-[#0f172a]"
    >
      <FilePlus2 className="h-3.5 w-3.5" />
      Nieuwe tekst
    </button>
  );
}
