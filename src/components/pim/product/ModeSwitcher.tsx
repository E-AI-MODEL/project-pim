import { Link } from "@tanstack/react-router";
import { ShieldCheck, PenLine } from "lucide-react";
import { MODE_EXPECTATION, MODE_LABEL, PRODUCT_MODES, type ProductMode } from "./types";

const ICONS: Record<ProductMode, React.ReactNode> = {
  check: <ShieldCheck className="h-3.5 w-3.5" />,
  write: <PenLine className="h-3.5 w-3.5" />,
};

export function ModeSwitcher({ active }: { active: ProductMode }) {
  return (
    <nav
      aria-label="Wat wil je doen"
      className="inline-flex items-center gap-1 rounded-lg border border-[#e5e7ef] bg-white p-1 shadow-sm"
    >
      {PRODUCT_MODES.map((id) => {
        const isActive = active === id;
        return (
          <Link
            key={id}
            to="/app"
            search={{ mode: id }}
            title={MODE_EXPECTATION[id]}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
              isActive
                ? "bg-[#6d4aff]/10 text-[#6d4aff]"
                : "text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f2f7]"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {ICONS[id]}
            {MODE_LABEL[id]}
          </Link>
        );
      })}
    </nav>
  );
}
