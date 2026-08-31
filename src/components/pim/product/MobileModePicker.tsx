import { Link } from "@tanstack/react-router";
import { ShieldCheck, PenLine } from "lucide-react";
import { PRODUCT_MODES, MODE_LABEL, type ProductMode } from "./types";

const MOBILE_EXPECTATION: Record<ProductMode, string> = {
  check: "Plak een tekst. PiM zegt of je hem kunt delen.",
  write: "Schrijf zelf. PiM markeert persoonsgegevens in je tekst.",
};

const ICON: Record<ProductMode, React.ReactNode> = {
  check: <ShieldCheck className="h-4 w-4" />,
  write: <PenLine className="h-4 w-4" />,
};

/**
 * Mobiele modekeuze: twee kaarten met een duidelijke verwachting, in plaats
 * van de tabs in de header. Zelfde routes, zelfde state.
 */
export function MobileModePicker({ active }: { active: ProductMode }) {
  return (
    <nav aria-label="Wat wil je doen" className="grid gap-2" data-testid="mobile-mode-picker">
      {PRODUCT_MODES.map((id) => {
        const isActive = active === id;
        return (
          <Link
            key={id}
            to="/app"
            search={{ mode: id }}
            aria-current={isActive ? "page" : undefined}
            className={`grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-xl border px-3 py-3 transition-colors ${
              isActive
                ? "border-[#6d4aff]/30 bg-[#6d4aff]/5"
                : "border-[#e5e7ef] bg-white hover:bg-[#f6f7fb]"
            }`}
          >
            <span
              className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                isActive ? "bg-[#6d4aff]/10 text-[#6d4aff]" : "bg-[#f1f2f7] text-[#64748b]"
              }`}
            >
              {ICON[id]}
            </span>
            <span className="min-w-0">
              <span
                className={`block text-[14px] font-semibold ${isActive ? "text-[#6d4aff]" : "text-[#0f172a]"}`}
              >
                {MODE_LABEL[id]}
              </span>
              <span className="block text-[12px] leading-snug text-[#64748b]">
                {MOBILE_EXPECTATION[id]}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
