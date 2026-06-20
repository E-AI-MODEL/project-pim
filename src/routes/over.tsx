import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Lock, ShieldCheck, Cloud, MinusSquare, EyeOff, ArrowRight, Cpu, Scale, Network } from "lucide-react";
import { PageHero } from "@/components/pim/PageHero";
import { PrincipleBadge } from "@/components/pim/PrincipleBadge";

export const Route = createFileRoute("/over")({
  head: () => ({
    meta: [
      { title: "Over Project PiM — Privacy Integrity Monitor" },
      { name: "description", content: "Browser-first privacy pipeline. Lokale detectie, deterministische beslissingen, fail-closed handhaving. Voor onderwijsorganisaties die echt willen anonimiseren." },
      { property: "og:title", content: "Project PiM — Privacy Integrity Monitor" },
      { property: "og:description", content: "Browser-first privacy pipeline voor onderwijsdata." },
    ],
  }),
  component: HomePage,
});

const PRINCIPLES = [
  { icon: Lock, title: "Local-first", description: "Alle gevoelige data blijft in de browser. Geen netwerk voor verwerking.", accent: "primary" as const },
  { icon: ShieldCheck, title: "Fail-closed", description: "Bij twijfel wordt geblokkeerd. Geen stille toelating.", accent: "cyan" as const },
  { icon: Cloud, title: "Mode isolation", description: "Anonymous en pseudonymous mogen technisch nooit door elkaar lopen.", accent: "purple" as const },
  { icon: MinusSquare, title: "Data minimization", description: "Alleen noodzakelijke signalen en metadata. Nooit ruwe inhoud in audit.", accent: "orange" as const },
  { icon: EyeOff, title: "No leakage", description: "Raw data, mapping en prompts verlaten de browser niet.", accent: "green" as const },
];

const PILLARS = [
  { icon: Cpu, title: "Models = sensors", text: "SLM en LLM leveren detecties en herschrijvingen. Ze nemen nooit het eindbesluit." },
  { icon: Scale, title: "PIM = decision layer", text: "Deterministische applicatiecode beslist per concrete actie of het mag doorgaan." },
  { icon: Network, title: "Egress = enforcement", text: "De Production Egress Guard handhaaft het PIM-besluit op alle uitgaande stromen." },
];

function HomePage() {
  return (
    <>
      <PageHero
        eyebrow="Privacy Integrity Monitor · v3-2 · education-nl"
        title={<>Project <span className="text-primary">PiM</span><br />Browser-first privacy voor onderwijsdata.</>}
        description="Een lokale pipeline die ruwe input, pseudonieme verwerking, anonieme verwerking, mapping en netwerkverkeer technisch scheidt — zodat schijnanonimisering geen optie meer is."
      >
        <div className="flex flex-wrap gap-3">
          <Link to="/try" className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-[var(--shadow-glow)]">
            Probeer de pipeline <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/pipeline" className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors font-medium">
            Bekijk de architectuur
          </Link>
        </div>
      </PageHero>

      {/* Principles */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-primary mb-2">01 · Core principes</div>
            <h2 className="font-display text-3xl md:text-4xl font-bold">Vijf onverhandelbare regels</h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-md">
            Elke architectuurbeslissing in PIM volgt uit deze principes. Schendt code een principe — dan blokkeert PIM.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PRINCIPLES.map((p) => <PrincipleBadge key={p.title} {...p} />)}
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="text-xs font-mono uppercase tracking-wider text-cyan mb-2">02 · Architectuur in drie zinnen</div>
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-10">Modellen. PIM. Egress.</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <div key={p.title} className="panel-glow p-7 relative overflow-hidden">
              <div className="absolute top-3 right-4 font-mono text-5xl text-primary/10 font-bold">0{i + 1}</div>
              <p.icon className="h-7 w-7 text-primary mb-4" strokeWidth={1.8} />
              <div className="font-display font-bold text-xl mb-2">{p.title}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Two modes preview */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-xs font-mono uppercase tracking-wider text-orange mb-2">03 · Twee modi, strikt gescheiden</div>
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-10">Anonymous of pseudonymous — nooit beide.</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="pipeline-stage p-7">
            <div className="stage-bar bar-purple -mx-7 -mt-7 mb-5" />
            <div className="font-mono text-xs text-purple uppercase tracking-wider mb-1">Anonymous path</div>
            <div className="font-display text-2xl font-bold mb-3">Niet-omkeerbaar</div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Generalisatie zonder mapping. Geen tokens, geen restore. Geschikt voor delen, export, en — onder strikte risk-drempels — externe AI.
            </p>
            <ul className="text-xs space-y-1.5 text-muted-foreground/90">
              <li>✓ Irreversible generalization</li>
              <li>✓ Optional browser-LLM rewrite</li>
              <li>✓ Lage risk → external AI mogelijk</li>
            </ul>
          </div>
          <div className="pipeline-stage p-7">
            <div className="stage-bar bar-cyan -mx-7 -mt-7 mb-5" />
            <div className="font-mono text-xs text-cyan uppercase tracking-wider mb-1">Pseudonymous path</div>
            <div className="font-display text-2xl font-bold mb-3">Omkeerbaar — alleen lokaal</div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Lokale tokenisatie met versleutelde mapping container. UI ziet alleen handles. Mapping verlaat de browser nooit.
            </p>
            <ul className="text-xs space-y-1.5 text-muted-foreground/90">
              <li>✓ AES-GCM Secure Mapping Container</li>
              <li>✗ Geen export, copy, share of external AI</li>
              <li>✓ Restore alleen lokaal</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex justify-center">
          <Link to="/modes" className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium">
            Vergelijk modi in detail <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="panel-glow p-10 md:p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative">
            <Shield className="h-10 w-10 text-primary mx-auto mb-4" strokeWidth={1.8} />
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Test de pipeline op echte tekst.</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Plak een fragment, kies een modus, kies een actie — zie elke laag werken en het PIM-besluit verschijnen. Alles lokaal in jouw browser.
            </p>
            <Link to="/try" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
              Open de Try-it pagina <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
