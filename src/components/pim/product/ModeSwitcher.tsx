import { Link } from "@tanstack/react-router";
import { Zap, Workflow, PenLine } from "lucide-react";
import type { ProductMode } from "./types";

const MODES: { id: ProductMode; label: string; icon: React.ReactNode }[] = [
  { id: "quick", label: "Controleren", icon: <Zap className="h-3.5 w-3.5" /> },
  { id: "start", label: "Begeleid", icon: <Workflow className="h-3.5 w-3.5" /> },
  { id: "write", label: "Schrijven", icon: <PenLine className="h-3.5 w-3.5" /> },
];

export function ModeSwitcher({ active }: { active: ProductMode }) {
  return (
    <nav
      aria-label="Modus"
      className="inline-flex items-center gap-1 rounded-lg border border-[#e5e7ef] bg-white p-1 shadow-sm"
    >
      {MODES.map((m) => {
        const isActive = active === m.id;
        return (
          <Link
            key={m.id}
            to="/app"
            search={{ mode: m.id }}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
              isActive
                ? "bg-[#6d4aff]/10 text-[#6d4aff]"
                : "text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f2f7]"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {m.icon}
            {m.label}
          </Link>
        );
      })}
    </nav>
  );
}
