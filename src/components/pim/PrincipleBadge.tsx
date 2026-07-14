import { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: "cyan" | "orange" | "purple" | "green" | "primary";
}

export function PrincipleBadge({ icon: Icon, title, description, accent = "primary" }: Props) {
  const accentColor: Record<string, string> = {
    cyan: "text-cyan",
    orange: "text-orange",
    purple: "text-purple",
    green: "text-green",
    primary: "text-primary",
  };
  return (
    <div className="panel p-5 hover:border-primary/60 transition-colors group">
      <div
        className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent/40 mb-3 ${accentColor[accent]} group-hover:scale-110 transition-transform`}
      >
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <div className="font-display font-semibold text-sm uppercase tracking-wide">{title}</div>
      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
