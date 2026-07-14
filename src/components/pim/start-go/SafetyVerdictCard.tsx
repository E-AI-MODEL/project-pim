import type { Verdict } from "@/lib/pim/types";
import { COPY } from "@/lib/pim/copy";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { useState } from "react";

export function SafetyVerdictCard({ verdict, reason }: { verdict: Verdict; reason: string }) {
  const map = {
    ALLOW: {
      head: COPY.resultHeadGreen,
      body: COPY.statusGreen,
      tech: COPY.layerTechAllow,
      cls: "border-emerald-200 bg-emerald-50/70",
      Icon: ShieldCheck,
      color: "text-emerald-700",
      body_color: "text-emerald-900/80",
    },
    ALLOW_WITH_WARNING: {
      head: COPY.resultHeadOrange,
      body: COPY.statusOrange,
      tech: COPY.layerTechWarn,
      cls: "border-amber-200 bg-amber-50/70",
      Icon: ShieldAlert,
      color: "text-amber-700",
      body_color: "text-amber-900/80",
    },
    BLOCK: {
      head: COPY.resultHeadRed,
      body: COPY.statusRed,
      tech: COPY.layerTechBlock,
      cls: "border-rose-200 bg-rose-50/70",
      Icon: ShieldX,
      color: "text-rose-700",
      body_color: "text-rose-900/80",
    },
  }[verdict];
  const { Icon } = map;
  const [showTech, setShowTech] = useState(false);
  return (
    <div className={`rounded-xl border p-4 animate-fade-in ${map.cls}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${map.color} mt-0.5 shrink-0`} />
        <div className="min-w-0 flex-1">
          <div className={`font-semibold text-[15px] ${map.color}`}>{map.head}</div>
          <p className={`text-[13px] mt-0.5 leading-snug ${map.body_color}`}>{map.body}</p>
          <button
            type="button"
            onClick={() => setShowTech((v) => !v)}
            className="mt-2 text-[11px] text-[#64748b] hover:text-[#334155] underline underline-offset-2"
          >
            {showTech ? "Verberg technische details" : "Technische details"}
          </button>
          {showTech && (
            <div className="mt-2 space-y-1 border-t border-black/5 pt-2">
              <p className="text-[11px] text-[#475569] leading-relaxed">{map.tech}</p>
              <p className="text-[10px] text-[#94a3b8] font-mono">{reason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
