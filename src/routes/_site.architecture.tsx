import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/pim/PageHero";
import {
  Cpu,
  Brain,
  Wand2,
  ShieldCheck,
  Scale,
  Network,
  FileCheck,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/_site/architecture")({
  head: () => ({
    meta: [
      { title: "Architectuur, Project PiM" },
      {
        name: "description",
        content:
          "Hoe Project PiM de rollen scheidt: code-detectoren, taalmodellen, guards, beslislaag, egress en audit.",
      },
      { property: "og:title", content: "Architectuur, Project PiM" },
      {
        property: "og:description",
        content: "De strikte rolverdeling tussen detectie, beslissing en handhaving.",
      },
    ],
  }),
  component: ArchitecturePage,
});

const ROLES = [
  {
    icon: Cpu,
    name: "Code detectors",
    role: "Herkennen harde PII-patronen via regex en vaste regels.",
    decides: false,
    color: "cyan",
  },
  {
    icon: Brain,
    name: "Browser SLM",
    role: "Herkennen contextueel risico, kleine groepen, zorgcontext, incidenten.",
    decides: false,
    color: "cyan",
  },
  {
    icon: Wand2,
    name: "Browser LLM",
    role: "Herschrijft en repareert geschoonde tekst, alleen lokaal.",
    decides: false,
    color: "purple",
  },
  {
    icon: ShieldCheck,
    name: "Guards",
    role: "Controleren per stap. Leveren signalen of lokale blokkade.",
    decides: false,
    color: "orange",
  },
  {
    icon: Scale,
    name: "PIM Policy Engine",
    role: "Deterministische code. Beslist per actie ALLOW / WARN / BLOCK.",
    decides: true,
    color: "orange",
  },
  {
    icon: Network,
    name: "Egress Guard",
    role: "Voert PIM-besluit technisch uit op alle uitgaande stromen.",
    decides: false,
    color: "green",
  },
  {
    icon: FileCheck,
    name: "Minimal Audit",
    role: "Legt alleen besluitmetadata vast, nooit inhoud.",
    decides: false,
    color: "green",
  },
];

function ArchitecturePage() {
  return (
    <>
      <PageHero
        eyebrow="Architectuur"
        title={
          <>
            Strikte <span className="text-primary">rolverdeling</span>
          </>
        }
        description="Detectie levert signalen. PIM neemt het besluit. Egress voert het uit. Geen enkele andere laag mag finaal toestemming geven."
      />
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="text-xs font-mono uppercase tracking-wider text-cyan mb-2">
          01 · Wie mag beslissen?
        </div>
        <h2 className="font-display text-3xl font-bold mb-8">
          Eén beslislaag, één bron van waarheid.
        </h2>
        <div className="overflow-x-auto panel">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left p-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Laag
                </th>
                <th className="text-left p-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Rol
                </th>
                <th className="text-right p-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  Mag finale toestemming geven?
                </th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map((r) => {
                const Icon = r.icon;
                return (
                  <tr
                    key={r.name}
                    className="border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-9 w-9 grid place-items-center rounded-lg bg-${r.color}/10 text-${r.color}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-display font-semibold">{r.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{r.role}</td>
                    <td className="p-4 text-right">
                      {r.decides ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green/15 text-green text-xs font-semibold">
                          JA
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border/60 text-muted-foreground text-xs">
                          nee
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="text-xs font-mono uppercase tracking-wider text-orange mb-2">
          02 · Datastromen
        </div>
        <h2 className="font-display text-3xl font-bold mb-10">Van raw input tot egress.</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              num: "01",
              title: "Detection",
              body: "Code regex + browser SLM produceren spans en confidence. Niets verlaat de browser.",
              color: "cyan",
            },
            {
              num: "02",
              title: "Processing",
              body: "Anonymize of pseudonymize. Mapping (indien aanwezig) gaat in een AES-GCM container.",
              color: "purple",
            },
            {
              num: "03",
              title: "Decision + Egress",
              body: "PIM beslist per actie. Egress Guard handhaaft. Audit logt enkel metadata.",
              color: "orange",
            },
          ].map((s) => (
            <div key={s.num} className="pipeline-stage p-6 relative">
              <div className={`stage-bar bar-${s.color} -mx-6 -mt-6 mb-5`} />
              <div className="font-mono text-3xl font-bold text-primary/30 mb-1">{s.num}</div>
              <div className="font-display text-xl font-bold mb-2">{s.title}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="panel-glow p-8 md:p-10">
          <div className="text-xs font-mono uppercase tracking-wider text-primary mb-2">
            03 · Fail-closed regels
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">
            Wanneer PIM altijd blokkeert
          </h2>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
            {[
              "PIM ontbreekt of besluit is leeg",
              "Modelstatus onzeker / hash mismatch",
              "Verplicht model voor actie ontbreekt",
              "Draft Check Guard faalt",
              "Mapping gedetecteerd in output",
              "Raw persoonsgegevens in output",
              "Pseudonieme tokens in anonieme output",
              "Pseudonieme output naar externe AI",
              "Risicoscore boven actiedrempel",
              "Bij twijfel, altijd",
            ].map((rule) => (
              <div key={rule} className="flex items-start gap-2.5 text-sm">
                <ArrowRight className="h-4 w-4 text-red mt-0.5 flex-shrink-0" />
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
