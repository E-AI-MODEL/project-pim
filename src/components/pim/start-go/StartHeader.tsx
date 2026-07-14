// Unified light header, spiegelt AppHeader visueel, zonder mode-switcher.
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { BurgerMenu } from "./BurgerMenu";

export function StartHeader() {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#e5e7ef]">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center gap-4">
        <Link to="/" aria-label="Project PiM, home" className="flex items-center gap-2.5 shrink-0">
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

        <span className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Lokale modus
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            to="/app"
            search={{ mode: "quick" }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#6d4aff] hover:bg-[#5b3dea] px-3 py-1.5 text-[13px] font-semibold text-white shadow-sm"
          >
            Open app
          </Link>
          <BurgerMenu />
        </div>
      </div>
    </header>
  );
}
