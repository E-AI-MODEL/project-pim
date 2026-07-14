import { LiveTechMonitor } from "@/components/pim/start-go/LiveTechMonitor";

export function StatusFooter() {
  return (
    <footer className="border-t border-[#3b6fa0]/25 bg-[#0f1b3d]/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="font-plex-mono text-[10px] text-[#e8edf3]/55 tracking-wider">
            Lokaal · niets verlaat deze browser tenzij jij goedkeurt
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LiveTechMonitor
            trigger={
              <button className="font-plex-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-[#3b6fa0]/20 hover:bg-[#3b6fa0]/40 text-[#e8edf3]/80 transition-colors">
                Live techniek
              </button>
            }
          />
          <span className="font-plex-mono text-[10px] text-[#e8edf3]/40">v1.0</span>
        </div>
      </div>
    </footer>
  );
}