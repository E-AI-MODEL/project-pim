import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/pim/PageHero";
import { ExternalLink, AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/compliance")({
  head: () => ({
    meta: [
      { title: "Compliance — Project PIM" },
      { name: "description", content: "Juridische afbakening, AI Act-grenzen en threat model van Project PIM." },
      { property: "og:title", content: "Compliance — Project PIM" },
      { property: "og:description", content: "Juridische afbakening en threat model." },
    ],
  }),
  component: CompliancePage,
});

const SOURCES = [
  { name: "EDPB Guidelines 01/2025 on Pseudonymisation", url: "https://www.edpb.europa.eu/our-work-tools/documents/public-consultations/2025/guidelines-012025-pseudonymisation" },
  { name: "Autoriteit Persoonsgegevens — Handleiding AVG", url: "https://www.autoriteitpersoonsgegevens.nl/uploads/imported/handleidingalgemeneverordeninggegevensbescherming.pdf" },
  { name: "Regulation (EU) 2024/1689 — AI Act", url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj" },
];

const FORBIDDEN = [
  "Emotieherkenning in onderwijs",
  "Stressdetectie van leerlingen",
  "Engagement / attention scoring",
  "Gedragsprofilering van leerlingen",
  "Risicoprofilering voor disciplinaire beslissingen",
  "Automatische beslissingen over leerlingen",
];
const ALLOWED = [
  "privacy_risk", "reidentification_risk", "draft_safety",
  "generalization_quality", "export_allowed", "human_review_required", "policy_decision",
];

function CompliancePage() {
  return (
    <>
      <PageHero
        eyebrow="Juridisch & ethisch kader"
        title={<>Compliance, <span className="text-primary">eerlijk</span></>}
        description="Project PIM claimt geen juridische volledige anonimisering. Het claimt een afdwingbare technische scheiding — meer niet, en dat is bewust."
      />

      <section className="mx-auto max-w-5xl px-6 py-14 space-y-10">
        <Block title="Wat we claimen" tone="green">
          <p>Project PIM dwingt een technische scheiding af tussen ruwe input, pseudonieme verwerking, anonieme verwerking, mapping, lokale opslag, netwerkverkeer en export.</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li>• In anonieme modus bestaat geen mapping en kan de tool originelen niet terugzetten.</li>
            <li>• In pseudonieme modus kan terugzetten alleen lokaal via een afgeschermde mapping.</li>
            <li>• Ruwe input en mapping verlaten de browser niet.</li>
            <li>• Modellen leveren signalen of herschrijvingen, maar nemen nooit het eindbesluit.</li>
            <li>• PIM beslist per actie in deterministische code. Bij twijfel = blokkeren.</li>
          </ul>
        </Block>

        <Block title="Wat we niet claimen" tone="red">
          <p className="font-mono text-sm text-red/90">
            "Wij garanderen dat elke onderwijscontext altijd juridisch volledig anoniem is."
          </p>
          <p className="mt-3 text-sm">
            Onderwijscontext is contextueel herkenbaar — kleine klassen, zorgbehoeften, incidenten — en daarom blijft menselijke verantwoordelijkheid noodzakelijk bij gevoelige dossiers.
          </p>
        </Block>

        <Block title="AI Act — verboden gebruik" tone="red">
          <p className="text-sm mb-3">De tool mag niet worden ingezet voor:</p>
          <ul className="grid sm:grid-cols-2 gap-y-2 text-sm">
            {FORBIDDEN.map((x) => (
              <li key={x} className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 text-red mt-0.5 flex-shrink-0" />{x}</li>
            ))}
          </ul>
        </Block>

        <Block title="AI Act — toegestane technische focus" tone="green">
          <ul className="flex flex-wrap gap-2">
            {ALLOWED.map((x) => (
              <li key={x} className="font-mono text-xs px-2.5 py-1 rounded-full bg-green/10 text-green border border-green/30">{x}</li>
            ))}
          </ul>
        </Block>

        <Block title="Bronnen voor juridische review" tone="cyan">
          <ul className="space-y-2.5 text-sm">
            {SOURCES.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-cyan hover:underline">
                  {s.name} <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
            ))}
          </ul>
        </Block>
      </section>
    </>
  );
}

function Block({ title, tone, children }: { title: string; tone: "green" | "red" | "cyan"; children: React.ReactNode }) {
  const Icon = tone === "red" ? AlertTriangle : CheckCircle2;
  return (
    <div className="panel p-7">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`h-5 w-5 text-${tone}`} />
        <h2 className="font-display text-xl font-bold">{title}</h2>
      </div>
      <div className="text-foreground/90 leading-relaxed">{children}</div>
    </div>
  );
}
