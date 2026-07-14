// Unified light header, identiek aan AppHeader (zonder mode-switcher).
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { BurgerMenu } from "./BurgerMenu";

export function StartHeader() {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#e5e7ef]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center gap-3">
        <Link to="/" aria-label="Project PiM" className="flex items-center gap-2.5 shrink-0">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d4aff]/10 text-[#6d4aff]">
            <ShieldCheck className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[14px] font-semibold text-[#0f172a] tracking-tight">
              Project PiM
            </span>
            <span className="text-[10px] text-[#94a3b8] hidden sm:block">
              Privacy Integrity Monitor
            </span>
          </span>
        </Link>

        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Lokale modus
        </span>
        <BurgerMenu />
      </div>
    </header>
  );
}
