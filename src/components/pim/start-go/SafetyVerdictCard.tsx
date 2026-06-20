import type { Verdict } from "@/lib/pim/types";
import { COPY } from "@/lib/pim/copy";
import { ShieldCheck, ShieldAlert, ShieldX, GraduationCap, Building2 } from "lucide-react";

export function SafetyVerdictCard({ verdict, reason }: { verdict: Verdict; reason: string }) {
  const map = {
    ALLOW: {
      head: COPY.resultHeadGreen,  body: COPY.statusGreen,
      teacher: COPY.layerTeacherAllow, leader: COPY.layerLeaderAllow,
      cls: "border-green-500/40 bg-green-500/[0.07]",
      Icon: ShieldCheck, color: "text-green-400", glow: "shadow-[0_0_32px_oklch(0.82_0.22_145/0.25)]",
    },
    ALLOW_WITH_WARNING: {
      head: COPY.resultHeadOrange, body: COPY.statusOrange,
      teacher: COPY.layerTeacherWarn, leader: COPY.layerLeaderWarn,
      cls: "border-orange-500/40 bg-orange-500/[0.07]",
      Icon: ShieldAlert, color: "text-orange-400", glow: "shadow-[0_0_32px_oklch(0.78_0.18_60/0.25)]",
    },
    BLOCK: {
      head: COPY.resultHeadRed, body: COPY.statusRed,
      teacher: COPY.layerTeacherBlock, leader: COPY.layerLeaderBlock,
      cls: "border-red-500/40 bg-red-500/[0.07]",
      Icon: ShieldX, color: "text-red-400", glow: "shadow-[0_0_32px_oklch(0.68_0.24_18/0.3)]",
    },
  }[verdict];
  const { Icon } = map;
  return (
    <div className={`rounded-xl border p-5 animate-fade-in ${map.cls} ${map.glow}`}>
      <div className="flex items-start gap-4">
        <Icon className={`h-7 w-7 ${map.color} mt-0.5 shrink-0`} />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <div className={`font-display font-bold text-xl ${map.color}`}>{map.head}</div>
            <p className="text-sm text-foreground/90 mt-1 leading-relaxed">{map.body}</p>
          </div>

          <div className="space-y-2 pt-1 border-t border-border/30">
            <Layer Icon={GraduationCap} label="Voor jou als gebruiker" text={map.teacher} />
            <Layer Icon={Building2} label="Voor je organisatie" text={map.leader} />
          </div>

          <p className="text-[11px] text-muted-foreground font-mono pt-1">{reason}</p>
        </div>
      </div>
    </div>
  );
}

function Layer({ Icon, label, text }: { Icon: typeof GraduationCap; label: string; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
      <div className="text-xs leading-relaxed">
        <span className="text-muted-foreground uppercase tracking-wider text-[10px] mr-1.5">{label}</span>
        <span className="text-foreground/85">{text}</span>
      </div>
    </div>
  );
}