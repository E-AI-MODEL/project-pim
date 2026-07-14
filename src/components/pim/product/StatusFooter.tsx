import { LiveTechMonitor } from "@/components/pim/start-go/LiveTechMonitor";
import { MessageSquare, SlidersHorizontal } from "lucide-react";

export function StatusFooter() {
  return (
    <footer className="border-t border-[#e5e7ef] bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px] text-[#64748b]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="font-medium text-[#334155]">PiM v1.0.0</span>
          <span className="text-[#cbd5e1]">·</span>
          <span>Lokale modus actief</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="open-expert"
            onClick={() => window.dispatchEvent(new CustomEvent("pim:open-expert"))}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] text-[#64748b] hover:bg-[#f1f2f7] hover:text-[#0f172a]"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Expert
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
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("pim:feedback"))}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#e5e7ef] bg-white px-2.5 py-1.5 text-[12px] text-[#334155] hover:bg-[#f6f7fb]"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Feedback geven
          </button>
        </div>
      </div>
    </footer>
  );
}
