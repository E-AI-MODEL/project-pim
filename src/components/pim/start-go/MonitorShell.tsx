import { COPY } from "@/lib/pim/copy";
import { StartGoShell } from "./StartGoShell";

export function MonitorShell() {
  return (
    <div className="bg-[#1e3a5f] rounded-lg border border-[#3b6fa0]/30 shadow-2xl overflow-hidden flex flex-col">
      {/* window header */}
      <div className="bg-[#0f1b3d]/50 px-4 py-3 border-b border-[#3b6fa0]/20 flex items-center justify-between">
        <span className="font-plex-mono text-[10px] tracking-[0.2em] uppercase font-bold text-[#3b6fa0]">
          {COPY.monitorLabel}
        </span>
        <div className="flex space-x-1.5" aria-hidden>
          <span className="w-2 h-2 rounded-full bg-[#3b6fa0]/30" />
          <span className="w-2 h-2 rounded-full bg-[#3b6fa0]/30" />
          <span className="w-2 h-2 rounded-full bg-[#3b6fa0]/30" />
        </div>
      </div>

      {/* body — live demo */}
      <div className="p-5 sm:p-6">
        <StartGoShell compact />
      </div>

      {/* status footer */}
      <div className="px-5 sm:px-6 py-3 bg-[#0f1b3d]/30 border-t border-[#3b6fa0]/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="font-plex-mono text-[10px] text-[#e8edf3]/55 tracking-wider">
            {COPY.monitorStatus}
          </span>
        </div>
        <span className="font-plex-mono text-[10px] text-[#e8edf3]/40">v1.0</span>
      </div>
    </div>
  );
}