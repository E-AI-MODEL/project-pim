import { Link } from "@tanstack/react-router";
import { ShieldCheck, Settings, History, ShieldAlert } from "lucide-react";
import { BurgerMenu } from "@/components/pim/start-go/BurgerMenu";
import { ModeSwitcher } from "./ModeSwitcher";
import type { ProductMode } from "./types";

export function AppHeader({ mode }: { mode: ProductMode }) {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#e5e7ef]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center gap-4">
        {/* Brand */}
        <Link to="/" aria-label="Project PiM — home" className="flex items-center gap-2.5 shrink-0">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#6d4aff]/10 text-[#6d4aff]">
            <ShieldCheck className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <span className="hidden sm:flex flex-col leading-tight">
            <span className="text-[15px] font-semibold text-[#0f172a] tracking-tight">
              Project PiM
            </span>
            <span className="text-[11px] text-[#64748b]">Privacy in Mind</span>
          </span>
        </Link>

        {/* Center status */}
        <div className="hidden md:flex items-center gap-3 mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[12px] font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Lokale modus
          </span>
          <span className="text-[12px] text-[#64748b]">Alles blijft op dit apparaat</span>
        </div>

        {/* Right actions */}
        <div className="ml-auto md:ml-0 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("pim:open-expert"))}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] text-[#334155] hover:bg-[#f1f2f7]"
          >
            <Settings className="h-4 w-4" />
            Instellingen
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("pim:open-diagnostics"))}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] text-[#334155] hover:bg-[#f1f2f7]"
          >
            <History className="h-4 w-4" />
            Geschiedenis
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("pim:check-privacy"))}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#6d4aff] hover:bg-[#5b3dea] px-3 py-1.5 text-[13px] font-semibold text-white shadow-sm"
          >
            <ShieldAlert className="h-4 w-4" />
            Controleer privacy
          </button>
          <BurgerMenu />
        </div>
      </div>
      {/* Secondary bar: mode switcher */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-3 pt-1">
        <ModeSwitcher active={mode} />
      </div>
    </header>
  );
}
