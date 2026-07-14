import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/pim/PageHero";
import { PIM_FLAGS } from "@/lib/pim/flags";
import { ShieldX, ShieldAlert, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_site/flags")({
  head: () => ({
    meta: [
      { title: "Beslissingscodes, Project PiM" },
      {
        name: "description",
        content:
          "Volledige tabel van de PIM_* beslissingscodes. Elke code bevat een ruleId, reasonCode, ernst en standaard verdict, nooit inhoud.",
      },
      { property: "og:title", content: "Beslissingscodes, Project PiM" },
      {
        property: "og:description",
        content: "Alle PIM_* beslissingscodes met ruleId, reasonCode, ernst en verdict.",
      },
    ],
  }),
  component: FlagsPage,
});

function severityBadge(sev: string, verdict: string) {
  if (sev === "block")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red/15 text-red border border-red/40 text-[11px] font-mono">
        <ShieldX className="h-3 w-3" />
        {verdict}
      </span>
    );
  if (sev === "warn")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange/15 text-orange border border-orange/40 text-[11px] font-mono">
        <ShieldAlert className="h-3 w-3" />
        {verdict}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green/15 text-green border border-green/40 text-[11px] font-mono">
      <ShieldCheck className="h-3 w-3" />
      {verdict}
    </span>
  );
}

function FlagsPage() {
  const entries = Object.entries(PIM_FLAGS);
  const blocks = entries.filter(([, v]) => v.severity === "block");
  const warns = entries.filter(([, v]) => v.severity === "warn");
  const oks = entries.filter(([, v]) => v.severity === "info");

  return (
    <>
      <PageHero
        eyebrow="Specificatie · hoofdstuk 37"
        title={
          <>
            De <span className="text-primary">beslissingscodes</span>
          </>
        }
        description="Elke beslissing van PiM verwijst naar een vaste code met ruleId, reasonCode, ernst en standaard verdict. Een code bevat nooit tekst, alleen metadata."
      />

      <section className="mx-auto max-w-7xl px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Block flags" value={blocks.length} accent="red" />
        <Stat label="Warn flags" value={warns.length} accent="orange" />
        <Stat label="Allow flags" value={oks.length} accent="green" />
        <Stat label="Totaal" value={entries.length} accent="primary" />
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="overflow-x-auto panel">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-border/60 bg-card/40">
                <th className="text-left p-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Flag
                </th>
                <th className="text-left p-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  RuleId
                </th>
                <th className="text-left p-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Verdict
                </th>
                <th className="text-left p-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Beschrijving
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([code, f]) => (
                <tr
                  key={code}
                  className="border-b border-border/30 last:border-0 hover:bg-accent/15 transition-colors"
                >
                  <td className="p-4 align-top">
                    <div className="font-mono text-[12px] font-semibold text-primary">{code}</div>
                    <div className="font-mono text-[10px] text-muted-foreground mt-0.5">
                      {f.reasonCode}
                    </div>
                  </td>
                  <td className="p-4 align-top font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                    {f.ruleId}
                  </td>
                  <td className="p-4 align-top">{severityBadge(f.severity, f.verdict)}</td>
                  <td className="p-4 align-top text-sm text-foreground/90 max-w-md">
                    {f.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground mt-4 max-w-3xl">
          Per audit-event wordt opgeslagen:{" "}
          <code className="font-mono text-foreground">
            flag, ruleId, reasonCode, severity, mode, action, policyVersion, timestamp
          </code>
          . Nooit inhoud, prompts, mapping, draft of embeddings.
        </p>
      </section>
    </>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: "red" | "orange" | "green" | "primary";
}) {
  return (
    <div className={`panel p-4 border-${accent}/40`}>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`font-display text-3xl font-bold text-${accent} mt-1`}>{value}</div>
    </div>
  );
}
