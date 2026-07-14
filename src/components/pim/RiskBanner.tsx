import { AlertTriangle, ShieldAlert } from "lucide-react";
import type { RiskLevel } from "@/lib/pim";

export function RiskBanner({ level, reasons }: { level: RiskLevel; reasons: string[] }) {
  if (level !== "high" && level !== "critical") return null;
  const isCrit = level === "critical";
  const Icon = isCrit ? ShieldAlert : AlertTriangle;
  return (
    <div
      role="alert"
      className={
        "mb-3 flex items-start gap-3 rounded-lg border p-3 " +
        (isCrit ? "border-red/60 bg-red/10 text-red" : "border-orange/60 bg-orange/10 text-orange")
      }
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="font-display font-bold text-sm uppercase tracking-wider">
          {isCrit ? "Kritiek risico" : "Verhoogd risico"}, {level}
        </div>
        {reasons.length > 0 && (
          <ul className="mt-1 text-xs leading-relaxed text-foreground/85 list-disc pl-5">
            {reasons.slice(0, 4).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
