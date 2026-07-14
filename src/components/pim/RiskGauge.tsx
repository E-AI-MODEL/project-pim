import type { RiskLevel } from "@/lib/pim";

interface Props {
  score: number; // 0..1
  level: RiskLevel;
  size?: number;
  label?: string;
}

export function RiskGauge({ score, level, size = 152, label = "risk" }: Props) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score));
  const dash = c * pct;
  const color =
    level === "critical" || level === "high"
      ? "var(--red)"
      : level === "medium"
        ? "var(--orange)"
        : "var(--green)";
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="oklch(0.55 0.12 230 / 0.18)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
          style={{
            transition: "stroke-dasharray 300ms ease, stroke 300ms ease",
            filter: `drop-shadow(0 0 12px ${color})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display font-black text-3xl leading-none" style={{ color }}>
          {Math.round(pct * 100)}%
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
          {label} · {level}
        </div>
      </div>
    </div>
  );
}
