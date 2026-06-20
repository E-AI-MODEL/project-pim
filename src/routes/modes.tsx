import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/pim/PageHero";
import { Check, X, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/modes")({
  head: () => ({
    meta: [
      { title: "Anoniem of pseudoniem — Project PiM" },
      { name: "description", content: "Vergelijking van de twee verwerkingsmodi van Project PiM: wat mag, wat niet, en waarom." },
      { property: "og:title", content: "Anoniem of pseudoniem — Project PiM" },
      { property: "og:description", content: "De twee verwerkingsmodi van Project PiM, naast elkaar gezet." },
    ],
  }),
  component: ModesPage,
});

const ROWS: { label: string; anon: string | boolean; pseudo: string | boolean }[] = [
  { label: "Mapping naar origineel", anon: false, pseudo: "lokaal, AES-GCM" },
  { label: "Restore mogelijk", anon: false, pseudo: "alleen lokaal" },
  { label: "Tokens in output", anon: false, pseudo: "wel" },
  { label: "Display in UI", anon: true, pseudo: true },
  { label: "Save local", anon: true, pseudo: "encrypted package" },
  { label: "Copy / print / share", anon: "ja, mits risk laag", pseudo: false },
  { label: "Export bestand", anon: "ja, mits risk < 25%", pseudo: false },
  { label: "Send external AI", anon: "ja, mits risk < 18%", pseudo: false },
  { label: "Mapping naar server", anon: "—", pseudo: false },
  { label: "Mapping naar externe AI", anon: "—", pseudo: false },
];

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <span className="inline-flex items-center gap-1.5 text-green text-sm font-medium"><Check className="h-4 w-4" /> ja</span>;
  if (v === false) return <span className="inline-flex items-center gap-1.5 text-red text-sm font-medium"><X className="h-4 w-4" /> nee</span>;
  return <span className="text-sm text-foreground/90">{v}</span>;
}

function ModesPage() {
  return (
    <>
      <PageHero
        eyebrow="Twee modi · Strikt gescheiden"
        title={<>Anoniem <span className="text-muted-foreground">of</span> <span className="text-cyan">pseudoniem</span></>}
        description="De twee modi mogen technisch nooit door elkaar lopen. Vermenging in de uitvoer wordt door de Draft Check Guard direct geweigerd."
      />

      <section className="mx-auto max-w-7xl px-6 py-12 grid md:grid-cols-2 gap-5">
        <div className="pipeline-stage p-7">
          <div className="stage-bar bar-purple -mx-7 -mt-7 mb-5" />
          <div className="font-mono text-xs text-purple uppercase tracking-wider mb-1">Anonymous</div>
          <h2 className="font-display text-3xl font-bold mb-3">Niet-omkeerbaar</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            Bedoeld voor delen, export, rapportage, onderzoek en — bij voldoende lage risk — externe AI. Generalisatie vervangt PII door categorieën zonder herstelroute.
          </p>
          <div className="space-y-2 text-sm">
            <Pro>Geen mapping, geen restore</Pro>
            <Pro>Contextuele generalisatie verplicht</Pro>
            <Pro>External AI mogelijk onder strikte drempel</Pro>
            <Con>Niet geschikt voor terugleesbaarheid</Con>
          </div>
        </div>

        <div className="pipeline-stage p-7">
          <div className="stage-bar bar-cyan -mx-7 -mt-7 mb-5" />
          <div className="font-mono text-xs text-cyan uppercase tracking-wider mb-1">Pseudonymous</div>
          <h2 className="font-display text-3xl font-bold mb-3">Omkeerbaar — alleen lokaal</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            Voor lokaal werk door een bevoegde gebruiker. Tokens vervangen PII; de mapping leeft in een AES-GCM container die de browser niet verlaat.
          </p>
          <div className="space-y-2 text-sm">
            <Pro>Lokale tokenisatie + Secure Mapping Container</Pro>
            <Pro>Restore alleen lokaal</Pro>
            <Con>Geen export, copy, print, share</Con>
            <Con>Nooit naar externe AI</Con>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <h2 className="font-display text-2xl font-bold mb-6">Vergelijkingsmatrix</h2>
        <div className="overflow-x-auto panel">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left p-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Capability</th>
                <th className="text-left p-4 font-mono text-[11px] uppercase tracking-wider text-purple">Anonymous</th>
                <th className="text-left p-4 font-mono text-[11px] uppercase tracking-wider text-cyan">Pseudonymous</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.label} className="border-b border-border/30 last:border-0">
                  <td className="p-4 text-sm font-medium">{r.label}</td>
                  <td className="p-4"><Cell v={r.anon} /></td>
                  <td className="p-4"><Cell v={r.pseudo} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-muted-foreground mb-4">Wil je dit live in actie zien op echte tekst?</p>
        <Link to="/try" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
          Ga naar Try-it <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </>
  );
}

function Pro({ children }: { children: React.ReactNode }) {
  return <div className="flex items-start gap-2"><Check className="h-4 w-4 text-green mt-0.5 flex-shrink-0" /><span>{children}</span></div>;
}
function Con({ children }: { children: React.ReactNode }) {
  return <div className="flex items-start gap-2"><X className="h-4 w-4 text-red mt-0.5 flex-shrink-0" /><span>{children}</span></div>;
}
