import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Shield,
  Lock,
  ShieldCheck,
  Cloud,
  MinusSquare,
  EyeOff,
  ArrowRight,
  Cpu,
  Scale,
  Network,
} from "lucide-react";
import { PageHero } from "@/components/pim/PageHero";
import { PrincipleBadge } from "@/components/pim/PrincipleBadge";

export const Route = createFileRoute("/over")({
  head: () => ({
    meta: [
      { title: "Over Project PiM" },
      {
        name: "description",
        content:
          "Project PiM is een lokale privacy-controle voor onderwijs: detectie, beslissing en handhaving lopen volledig in je browser. Geen schijnanonimisering.",
      },
      { property: "og:title", content: "Over Project PiM" },
      {
        property: "og:description",
        content:
          "Hoe Project PiM persoonsgegevens herkent, beoordeelt en tegenhoudt — volledig in je browser.",
      },
    ],
  }),
  component: HomePage,
});

const PRINCIPLES = [
  {
    icon: Lock,
    title: "Lokaal eerst",
    description:
      "Alle gevoelige inhoud blijft in je browser. Voor de verwerking is geen netwerk nodig.",
    accent: "primary" as const,
  },
  {
    icon: ShieldCheck,
    title: "Bij twijfel: dicht",
    description: "Bij elke onduidelijkheid blokkeert PiM. Niets glipt er stilletjes doorheen.",
    accent: "cyan" as const,
  },
  {
    icon: Cloud,
    title: "Modi strikt gescheiden",
    description: "Anoniem en pseudoniem mogen technisch nooit door elkaar lopen.",
    accent: "purple" as const,
  },
  {
    icon: MinusSquare,
    title: "Dataminimalisatie",
    description:
      "Alleen de noodzakelijke signalen en metadata worden bewaard. Nooit de tekst zelf.",
    accent: "orange" as const,
  },
  {
    icon: EyeOff,
    title: "Geen lekken",
    description: "Ruwe tekst, koppelingen en prompts verlaten je browser niet.",
    accent: "green" as const,
  },
];

const PILLARS = [
  {
    icon: Cpu,
    title: "Modellen zijn zintuigen",
    text: "Taalmodellen herkennen en herschrijven. Ze nemen nooit het eindbesluit.",
  },
  {
    icon: Scale,
    title: "PiM is de beslisser",
    text: "Vaste, deterministische code bepaalt per actie of die mag doorgaan.",
  },
  {
    icon: Network,
    title: "Egress is de handhaver",
    text: "De Egress Guard ziet er op toe dat het besluit van PiM op elk uitgaand kanaal wordt nageleefd.",
  },
];

function HomePage() {
  return (
    <>
      <PageHero
        eyebrow="Privacy Integrity Monitor · v3-2 · onderwijs-NL"
        title={
          <>
            Project <span className="text-primary">PiM</span>
            <br />
            Lokale privacy voor onderwijs.
          </>
        }
        description="Een controle die in je browser draait en de paden voor ruwe tekst, pseudonieme verwerking, anonieme verwerking en netwerkverkeer strikt gescheiden houdt — zodat schijnveiligheid geen optie meer is."
      >
        <div className="flex flex-wrap gap-3">
          <Link
            to="/try"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-[var(--shadow-glow)]"
          >
            Open het Expert lab <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/pipeline"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors font-medium"
          >
            Bekijk de werking
          </Link>
        </div>
      </PageHero>

      {/* Principles */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-primary mb-2">
              01 · Kernprincipes
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              Vijf onverhandelbare regels
            </h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-md">
            Elke ontwerpkeuze in PiM volgt uit deze regels. Schendt code een regel, dan blokkeert
            PiM.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PRINCIPLES.map((p) => (
            <PrincipleBadge key={p.title} {...p} />
          ))}
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="text-xs font-mono uppercase tracking-wider text-cyan mb-2">
          02 · De architectuur in drie zinnen
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-10">
          Modellen. PiM. Egress.
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <div key={p.title} className="panel-glow p-7 relative overflow-hidden">
              <div className="absolute top-3 right-4 font-mono text-5xl text-primary/10 font-bold">
                0{i + 1}
              </div>
              <p.icon className="h-7 w-7 text-primary mb-4" strokeWidth={1.8} />
              <div className="font-display font-bold text-xl mb-2">{p.title}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Two modes preview */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-xs font-mono uppercase tracking-wider text-orange mb-2">
          03 · Twee modi, strikt gescheiden
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-10">
          Anoniem of pseudoniem — nooit allebei tegelijk.
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="pipeline-stage p-7">
            <div className="stage-bar bar-purple -mx-7 -mt-7 mb-5" />
            <div className="font-mono text-xs text-purple uppercase tracking-wider mb-1">
              Anonieme route
            </div>
            <div className="font-display text-2xl font-bold mb-3">Niet terug te draaien</div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Generaliseren zonder koppelingstabel. Geen tokens, geen herstel. Geschikt voor delen,
              export en — onder strikte risico-drempels — externe AI.
            </p>
            <ul className="text-xs space-y-1.5 text-muted-foreground/90">
              <li>✓ Onomkeerbare generalisatie</li>
              <li>✓ Optioneel: herschrijven door een lokaal taalmodel</li>
              <li>✓ Bij laag risico is externe AI toegestaan</li>
            </ul>
          </div>
          <div className="pipeline-stage p-7">
            <div className="stage-bar bar-cyan -mx-7 -mt-7 mb-5" />
            <div className="font-mono text-xs text-cyan uppercase tracking-wider mb-1">
              Pseudonieme route
            </div>
            <div className="font-display text-2xl font-bold mb-3">
              Omkeerbaar — uitsluitend lokaal
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Lokale tokenisatie met een versleutelde koppelingstabel. De interface ziet alleen
              verwijzingen; de koppeling verlaat je browser nooit.
            </p>
            <ul className="text-xs space-y-1.5 text-muted-foreground/90">
              <li>✓ Versleutelde koppelingstabel (AES-GCM)</li>
              <li>✗ Geen export, kopiëren, delen of externe AI</li>
              <li>✓ Terugzetten kan alleen op dit apparaat</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex justify-center">
          <Link
            to="/modes"
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium"
          >
            Vergelijk de modi in detail <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="panel-glow p-10 md:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative">
            <Shield className="h-10 w-10 text-primary mx-auto mb-4" strokeWidth={1.8} />
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">
              Probeer het op echte tekst.
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Plak een stukje tekst, kies een modus en een actie, en zie elke laag van de controle
              live aan het werk — met het uiteindelijke oordeel van PiM. Alles in je eigen browser.
            </p>
            <Link
              to="/try"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Open het Expert lab <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
