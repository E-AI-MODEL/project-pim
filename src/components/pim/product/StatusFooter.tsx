import { LiveTechMonitor } from "@/components/pim/start-go/LiveTechMonitor";
import { SlidersHorizontal } from "lucide-react";

/**
 * Footer met precies twee ingangen: instellingen (wat PiM doet) en
 * diagnostiek (hoe PiM het doet). Bevindingen horen bij de tekst, niet hier.
 */
export function StatusFooter() {
  return (
    <footer className="border-t border-[#e5e7ef] bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px] text-[#64748b] min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="font-medium text-[#334155] shrink-0">PiM v1.0.0</span>
          <span className="text-[#cbd5e1] hidden sm:inline">·</span>
          <span className="hidden sm:inline truncate">Je tekst blijft op dit apparaat</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            data-testid="open-settings"
            onClick={() => window.dispatchEvent(new CustomEvent("pim:open-settings"))}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] text-[#64748b] hover:bg-[#f1f2f7] hover:text-[#0f172a]"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Instellingen
          </button>
          <LiveTechMonitor
            trigger={
              <button
                data-testid="open-diagnostics"
                className="inline-flex items-center rounded-md px-2.5 py-1.5 text-[12px] text-[#64748b] hover:bg-[#f1f2f7] hover:text-[#0f172a]"
              >
                Diagnostiek
              </button>
            }
          />
        </div>
      </div>
    </footer>
  );
}
