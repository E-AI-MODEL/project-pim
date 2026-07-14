import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { BurgerMenu } from "@/components/pim/start-go/BurgerMenu";
import { ModeSwitcher } from "./ModeSwitcher";
import type { ProductMode } from "./types";

export function AppHeader({ mode }: { mode: ProductMode }) {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#e5e7ef]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center gap-3">
        <Link to="/" aria-label="Project PiM" className="flex items-center gap-2.5 shrink-0">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#6d4aff]/10 text-[#6d4aff]">
            <ShieldCheck className="h-4.5 w-4.5" strokeWidth={2.25} />
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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-2 pt-0.5 overflow-x-auto">
        <ModeSwitcher active={mode} />
      </div>
    </header>
  );
}