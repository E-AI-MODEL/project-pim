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
      className="inline-flex items-center gap-1 rounded-md border border-[#3b6fa0]/30 bg-[#0f1b3d]/40 p-1"
    >
      {MODES.map((m) => {
        const isActive = active === m.id;
        return (
          <Link
            key={m.id}
            to="/app"
            search={{ mode: m.id }}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "bg-[#3b6fa0]/40 text-[#e8edf3]"
                : "text-[#e8edf3]/60 hover:text-[#e8edf3] hover:bg-[#3b6fa0]/20"
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
