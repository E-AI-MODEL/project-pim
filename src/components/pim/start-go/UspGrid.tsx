import { COPY } from "@/lib/pim/copy";
import { Lock, KeyRound, Layers, ShieldOff } from "lucide-react";

const ITEMS = [
  { Icon: Lock, title: COPY.uspLocalTitle, body: COPY.uspLocalBody, num: "01" },
  { Icon: KeyRound, title: COPY.uspDualTitle, body: COPY.uspDualBody, num: "02" },
  { Icon: Layers, title: COPY.uspExplainTitle, body: COPY.uspExplainBody, num: "03" },
  { Icon: ShieldOff, title: COPY.uspEgressTitle, body: COPY.uspEgressBody, num: "04" },
];

export function UspGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
      {ITEMS.map(({ Icon, title, body, num }) => (
        <div key={num} className="space-y-2 border-t hairline pt-4">
          <div className="flex items-center gap-3">
            <span className="font-plex-mono text-[10px] tracking-widest text-[#3b6fa0]">{num}</span>
            <Icon className="h-3.5 w-3.5 text-[#3b6fa0]" strokeWidth={2} />
            <h3 className="font-medium text-[#e8edf3] text-[15px]">{title}</h3>
          </div>
          <p className="text-sm text-[#e8edf3]/70 leading-relaxed pl-[1.85rem]">{body}</p>
        </div>
      ))}
    </div>
  );
}
