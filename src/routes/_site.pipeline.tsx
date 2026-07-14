import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHero } from "@/components/pim/PageHero";

export const Route = createFileRoute("/_site/pipeline")({
  head: () => ({
    meta: [
      { title: "Hoe de pipeline werkt — Project PiM" },
      {
        name: "description",
        content:
          "Stap voor stap door de privacy-pipeline van Project PiM: van ruwe invoer tot uitgaande actie.",
      },
      { property: "og:title", content: "Hoe de pipeline werkt — Project PiM" },
      {
        property: "og:description",
        content: "Een interactieve doorloop van de privacy-pipeline, stap voor stap.",
      },
    ],
  }),
  component: PipelinePage,
});

type StageColor = "" | "cyan" | "orange" | "purple" | "green" | "red";
interface Node {
  id: string;
  title: string;
  text: string;
  input: string;
  output: string;
  decision: string;
  decisionType?: "decision" | "block" | "allow";
}
interface Stage {
  n: number;
  title: string;
  color: StageColor;
  nodes: Node[];
}

const STAGES: Stage[] = [
  {
    n: 1,
    title: "Input & hardening",
    color: "",
    nodes: [
      {
        id: "raw",
        title: "Raw onderwijsinput",
        text: "Leerlingtekst, docentnotitie, prompt of dossierfragment.",
        input: "Gebruikerstekst",
        output: "Lokale inputbuffer",
        decision: "Nee",
      },
      {
        id: "runtime",
        title: "Runtime hardening",
        text: "CSP, geen analytics, geen session replay, fetch/XHR/WebSocket hooks.",
        input: "Browser runtime",
        output: "Afgeschermde uitvoeromgeving",
        decision: "Nee",
      },
      {
        id: "inputguard",
        title: "Input Privacy Guard",
        text: "Raw input niet loggen, niet naar server, niet in gewone app-state.",
        input: "Raw tekst",
        output: "Beschermde lokale verwerking",
        decision: "Nee",
      },
    ],
  },
  {
    n: 2,
    title: "Detection stack",
    color: "cyan",
    nodes: [
      {
        id: "rules",
        title: "Rule detector",
        text: "Regex voor e-mail, telefoon, BSN, IBAN, postcode, adres, datum.",
        input: "Raw tekst",
        output: "Harde PII-detecties",
        decision: "Nee",
      },
      {
        id: "pii",
        title: "PII detector (SLM/NER)",
        text: "Lokale NER/SLM voor namen, locaties, identifiers en relaties.",
        input: "Raw tekst lokaal",
        output: "PII-spans + confidence",
        decision: "Nee",
      },
      {
        id: "context",
        title: "Education context SLM",
        text: "Detecteert kleine groepen, unieke rollen, zorgcontext, incidenten.",
        input: "Raw tekst lokaal",
        output: "Contextuele signalen",
        decision: "Nee",
      },
    ],
  },
  {
    n: 3,
    title: "Signals & risk",
    color: "orange",
    nodes: [
      {
        id: "merge",
        title: "Signal merger",
        text: "Combineert detecties, dedupliceert overlap, kiest het strengste signaal.",
        input: "Detecties",
        output: "Samengevoegde signalen",
        decision: "Nee",
      },
      {
        id: "risk",
        title: "Risk scoring",
        text: "Berekent riskScore op basis van type PII, context, zeldzaamheid.",
        input: "Privacy signals",
        output: "Risk score + level",
        decision: "Nee",
      },
      {
        id: "signals",
        title: "Privacy signals object",
        text: "Vaste datastructuur: directPii, contextualPii, riskScore, ruleIds.",
        input: "Risico + detecties",
        output: "PIM-input",
        decision: "Nee",
      },
    ],
  },
  {
    n: 4,
    title: "Mode processing",
    color: "purple",
    nodes: [
      {
        id: "anon",
        title: "Anonymous path",
        text: "Niet-omkeerbare generalisatie. Geen mapping, geen tokens.",
        input: "Raw + detecties",
        output: "Anonymous candidate",
        decision: "Routekeuze",
      },
      {
        id: "pseudo",
        title: "Pseudonymous path",
        text: "Lokale tokenisatie met Secure Mapping Container.",
        input: "Raw + detecties",
        output: "Pseudonymous candidate",
        decision: "Routekeuze",
      },
    ],
  },
  {
    n: 5,
    title: "Draft check",
    color: "purple",
    nodes: [
      {
        id: "draft",
        title: "Draft candidate",
        text: "Concepttekst vóór vrijgave. Nog niet veilig tot certificering.",
        input: "Candidate",
        output: "Unchecked draft",
        decision: "Nee",
      },
      {
        id: "dcg",
        title: "Draft Check Guard",
        text: "Controleert raw PII, mapping-lek, mode-mix, hallucinated tokens.",
        input: "Draft + tokens",
        output: "Guard results",
        decision: "Signalen",
      },
      {
        id: "repair",
        title: "Repair loop",
        text: "Alleen lokaal. Browser-LLM kan repareren op geschoonde tekst.",
        input: "Afgekeurde draft",
        output: "Nieuwe candidate",
        decision: "Nee",
      },
    ],
  },
  {
    n: 6,
    title: "Decision layer (PIM)",
    color: "orange",
    nodes: [
      {
        id: "modelgate",
        title: "Model Integrity Gate",
        text: "Controleert modelstatus, versie, bron, hash, requiredForActions.",
        input: "Model records",
        output: "Pass of block",
        decision: "Gate",
        decisionType: "decision",
      },
      {
        id: "pim",
        title: "PIM Policy Engine",
        text: "Deterministische code. Beslist per actie op basis van signals + mode.",
        input: "Signals + draft + mode + action",
        output: "PIM besluit",
        decision: "Ja",
        decisionType: "decision",
      },
      {
        id: "decision",
        title: "PIM besluit",
        text: "ALLOW, ALLOW_WITH_WARNING of BLOCK. Bij twijfel = BLOCK.",
        input: "Policy rules",
        output: "Bindend besluit",
        decision: "Ja",
        decisionType: "decision",
      },
    ],
  },
  {
    n: 7,
    title: "Egress control",
    color: "",
    nodes: [
      {
        id: "egress",
        title: "Production Egress Guard",
        text: "Handhaaft PIM-besluit op alle uitgaande stromen en acties.",
        input: "Payload + besluit",
        output: "Doorgang of block",
        decision: "Handhaaft",
      },
      {
        id: "checks",
        title: "Egress checks",
        text: "Payload, bestemming, actie, policy en risicodrempel.",
        input: "Uitvoeractie",
        output: "Final verdict",
        decision: "Technische gate",
      },
    ],
  },
  {
    n: 8,
    title: "Output & audit",
    color: "green",
    nodes: [
      {
        id: "display",
        title: "Display in UI",
        text: "Toon in applicatie. Anonymous of pseudonymous.",
        input: "Certified draft",
        output: "UI-weergave",
        decision: "PIM vereist",
        decisionType: "allow",
      },
      {
        id: "external",
        title: "Send external AI",
        text: "Alleen anonymous, geen tokens, risk onder drempel, PIM allow.",
        input: "Anonymous draft",
        output: "Externe AI-call",
        decision: "PIM vereist",
        decisionType: "allow",
      },
      {
        id: "audit",
        title: "Minimal audit",
        text: "Alleen metadata: actie, besluit, ruleId, reasonCode, riskLevel.",
        input: "Besluitmetadata",
        output: "Audit zonder inhoud",
        decision: "Nee",
      },
    ],
  },
];

function PipelinePage() {
  const [active, setActive] = useState<Node>(STAGES[5].nodes[1]);
  return (
    <>
      <PageHero
        eyebrow="Pipeline · 8 stages"
        title={
          <>
            De volledige <span className="text-primary">privacy pipeline</span>
          </>
        }
        description="Klik op een module om te zien wat hij doet, wat er in en uit gaat, en of die module ook beslist. Alleen PIM beslist finaal."
      />
      <section className="mx-auto max-w-[1400px] px-4 md:px-6 py-10 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="overflow-x-auto pb-4">
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(8, minmax(220px, 1fr))", minWidth: "1900px" }}
          >
            {STAGES.map((stage) => (
              <section key={stage.n} className="pipeline-stage flex flex-col">
                <div className={`stage-bar ${stage.color ? `bar-${stage.color}` : "bar-line"}`} />
                <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full grid place-items-center font-mono font-bold text-xs bg-primary/15 border border-primary/40 text-primary">
                    {stage.n}
                  </div>
                  <div className="font-display font-semibold text-[12px] uppercase tracking-wider">
                    {stage.title}
                  </div>
                </div>
                <div className="p-3 flex flex-col gap-2.5 flex-1">
                  {stage.nodes.map((n, i) => (
                    <div key={n.id}>
                      <button
                        onClick={() => setActive(n)}
                        className={`text-left w-full rounded-lg border p-3 transition-all ${
                          active.id === n.id
                            ? "border-primary bg-accent/40 shadow-[var(--shadow-glow)]"
                            : n.decisionType === "decision"
                              ? "border-orange/40 bg-orange/5 hover:border-orange/70"
                              : n.decisionType === "allow"
                                ? "border-green/40 bg-green/5 hover:border-green/70"
                                : "border-border/60 bg-card/60 hover:border-primary/50"
                        }`}
                      >
                        <div className="font-display text-[12px] font-bold uppercase tracking-wide mb-1">
                          {n.title}
                        </div>
                        <p className="text-[11px] leading-snug text-muted-foreground line-clamp-3">
                          {n.text}
                        </p>
                      </button>
                      {i < stage.nodes.length - 1 && (
                        <div className="text-center text-primary/60 text-lg leading-none my-1">
                          ↓
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <aside className="lg:sticky lg:top-24 lg:self-start panel-glow p-6 space-y-5">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-primary mb-1">
              Module detail
            </div>
            <h3 className="font-display text-2xl font-bold">{active.title}</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{active.text}</p>
          <div className="border-t border-border/50 pt-4 space-y-3 text-sm">
            <Row label="Invoer" value={active.input} />
            <Row label="Uitvoer" value={active.output} />
            <Row label="Beslist?" value={active.decision} highlight={active.decision === "Ja"} />
          </div>
          <div className="border-t border-border/50 pt-4">
            <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
              Legenda
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {[
                { c: "primary", l: "Input" },
                { c: "cyan", l: "Detectie" },
                { c: "orange", l: "Besluit" },
                { c: "purple", l: "Processing" },
                { c: "green", l: "Output" },
              ].map((x) => (
                <span
                  key={x.l}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-border/60 bg-card/40"
                >
                  <span className={`h-1.5 w-1.5 rounded-full bg-${x.c}`} />
                  {x.l}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-3">
      <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground pt-0.5">
        {label}
      </div>
      <div className={`text-sm ${highlight ? "text-primary font-semibold" : ""}`}>{value}</div>
    </div>
  );
}
