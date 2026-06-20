// Mini trust-indicator gevoed door selfTest.ts. Auto-runt bij mount.
import { useEffect, useState } from "react";
import { onSelfTest, runSelfTest, type SelfTestReport } from "@/lib/pim/selfTest";
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function TrustBadge() {
  const [report, setReport] = useState<SelfTestReport | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const off = onSelfTest(setReport);
    if (!report) {
      setBusy(true);
      runSelfTest().finally(() => setBusy(false));
    }
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = report?.status ?? (busy ? "running" : "idle");
  const Icon = status === "pass" ? ShieldCheck : status === "fail" ? ShieldAlert : ShieldQuestion;
  const color =
    status === "pass" ? "text-emerald-400" :
    status === "fail" ? "text-rose-400" :
    "text-[#e8edf3]/45";
  const label =
    status === "pass" ? "Self-test PASS" :
    status === "fail" ? "Self-test FAIL" :
    status === "running" ? "Self-test loopt…" : "Self-test idle";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[#3b6fa0]/15 transition-colors"
        >
          <Icon className={`h-3 w-3 ${color}`} />
          <span className="font-plex-mono text-[10px] text-[#e8edf3]/55">trust</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 bg-[#0f1b3d] border-[#3b6fa0]/40 text-[#e8edf3] p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <div className="text-sm font-medium">{label}</div>
          <button
            type="button"
            onClick={() => { setBusy(true); runSelfTest().finally(() => setBusy(false)); }}
            disabled={busy}
            className="ml-auto text-[10px] font-plex-mono text-[#e8edf3]/60 hover:text-[#e8edf3] px-1.5 py-0.5 rounded hover:bg-[#3b6fa0]/15 disabled:opacity-50"
          >
            {busy ? "…" : "Opnieuw"}
          </button>
        </div>
        {report ? (
          <>
            <p className="text-[11px] text-[#e8edf3]/70 leading-snug">{report.summary}</p>
            <div className="space-y-1 text-[11px]">
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <span className="text-[#e8edf3]/50">Ruleset hash</span>
                <span className="font-plex-mono text-[#e8edf3]/85">{report.rulesetHash.slice(0, 16)}…</span>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <span className="text-[#e8edf3]/50">Golden cases</span>
                <span className="font-plex-mono text-[#e8edf3]/85">
                  {report.golden.filter((g) => g.ok).length}/{report.golden.length} ok
                </span>
              </div>
              <div className="grid grid-cols-[110px_1fr] gap-2">
                <span className="text-[#e8edf3]/50">Egress wrapper</span>
                <span className={`font-plex-mono ${report.hardening.probeLogged ? "text-emerald-300" : "text-rose-300"}`}>
                  {report.hardening.probeLogged ? "actief" : "niet gedetecteerd"}
                </span>
              </div>
            </div>
            {report.golden.some((g) => !g.ok) && (
              <div className="text-[10px] text-rose-200/80 font-plex-mono pt-1 border-t border-[#3b6fa0]/20">
                Faalt: {report.golden.filter((g) => !g.ok).map((g) => g.id).join(", ")}
              </div>
            )}
            <p className="text-[10px] text-[#e8edf3]/45 leading-snug border-t border-[#3b6fa0]/20 pt-2">
              De self-test draait een golden-corpus door de detectoren en probeert egress te lokken — alles lokaal.
            </p>
          </>
        ) : (
          <p className="text-[11px] text-[#e8edf3]/55">Self-test wordt nu uitgevoerd…</p>
        )}
      </PopoverContent>
    </Popover>
  );
}