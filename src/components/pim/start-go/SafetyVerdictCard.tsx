import type { Verdict } from "@/lib/pim/types";
import { COPY } from "@/lib/pim/copy";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

export function SafetyVerdictCard({ verdict, reason }: { verdict: Verdict; reason: string }) {
  const map = {
    ALLOW:              { head: COPY.resultHeadGreen,  body: COPY.statusGreen,  cls: "border-green-500/40 bg-green-500/5",  Icon: ShieldCheck, color: "text-green-400" },
    ALLOW_WITH_WARNING: { head: COPY.resultHeadOrange, body: COPY.statusOrange, cls: "border-orange-500/40 bg-orange-500/5", Icon: ShieldAlert, color: "text-orange-400" },
    BLOCK:              { head: COPY.resultHeadRed,    body: COPY.statusRed,    cls: "border-red-500/40 bg-red-500/5",       Icon: ShieldX,     color: "text-red-400" },
  }[verdict];
  const { Icon } = map;
  return (
    <div className={`rounded-lg border p-4 ${map.cls}`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${map.color} mt-0.5 shrink-0`} />
        <div className="min-w-0">
          <div className={`font-display font-bold text-lg ${map.color}`}>{map.head}</div>
          <p className="text-sm text-foreground/90 mt-1">{map.body}</p>
          <p className="text-xs text-muted-foreground mt-1.5">{reason}</p>
        </div>
      </div>
    </div>
  );
}