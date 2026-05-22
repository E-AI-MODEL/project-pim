import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Shield, BookOpen, Brain, Database, MessageSquare, FileText, Bot, GraduationCap,
  Users, Stethoscope, AlertTriangle, Lock, ArrowRight, Sparkles, Network, Layers,
  ClipboardList, Workflow, Server, Cpu, Eye, FlaskConical, Quote,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export const Route = createFileRoute("/scenarios")({
  head: () => ({
    meta: [
      { title: "Scenarios — Waar PiM in de onderwijspipeline past" },
      { name: "description", content: "Concrete toepassings­scenarios van Project PiM: welke plek in welke AI/LLM/EdTech-orchestratie de privacy-engine bezet, met onderwijskundige en wetenschappelijke onderbouwing." },
      { property: "og:title", content: "Scenarios — Waar PiM in de onderwijspipeline past" },
      { property: "og:description", content: "Concrete toepassings­scenarios van Project PiM in onderwijs-AI-pipelines, met technische en wetenschappelijke onderbouwing." },
    ],
  }),
  component: ScenariosPage,
});

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

interface Scenario {
  id: string;
  title: string;
  domain: string;
  icon: Icon;
  bar: "line" | "cyan" | "orange" | "purple" | "green" | "red";
  problem: string;
  pimSpot: string;
  pipeline: { label: string; pim?: boolean; note?: string }[];
  mode: "anonymous" | "pseudonymous" | "hybride";
  benefit: string;
  evidence: { author: string; claim: string }[];
}

const SCENARIOS: Scenario[] = [
  {
    id: "llm-tutor",
    title: "AI-tutor met externe LLM (ChatGPT / Claude / Gemini)",
    domain: "1-op-1 begeleiding · VO/MBO",
    icon: Bot,
    bar: "cyan",
    problem:
      "Leerlingen plakken hun eigen zorg- of gedragsdossier in een tutorprompt (\"Ik heb ADHD en ben uit groep 6A van meester Jansen geschorst, leg me uit…\"). Zonder filter belandt direct identificeerbare data bij een Amerikaanse LLM-provider — AVG art. 44 + DPIA-blokker.",
    pimSpot:
      "PiM zit tussen het tutor-frontend (browser) en de fetch-call naar de externe LLM. De prompt wordt eerst lokaal door detectoren + draft-check gehaald; alleen de geanonimiseerde variant gaat over de lijn. De egress-guard her-consulteert PiM vlak voor de fetch.",
    pipeline: [
      { label: "Leerling typt prompt" },
      { label: "PiM: detect → anonymize → draft-check", pim: true },
      { label: "Egress re-consult (hfst 28)", pim: true, note: "BLOCK bij residuele PII" },
      { label: "External LLM API" },
      { label: "Antwoord terug naar UI" },
    ],
    mode: "anonymous",
    benefit:
      "Geen DPA per leerling nodig met de LLM-leverancier zolang er aantoonbaar geen persoonsgegevens vertrekken. Onderwijs houdt de leveranciersrelatie technisch i.p.v. juridisch.",
    evidence: [
      { author: "Kerssens & Van Dijck (2021)", claim: "Platformisering van onderwijs leidt tot ongecontroleerde dataflows; technische tussenlagen zijn nodig om autonomie te herstellen." },
      { author: "AP-richtlijn generatieve AI (2024)", claim: "Verwerking van leerling-prompts in externe LLM's vereist een rechtsgrond én minimalisatie aan de bron." },
    ],
  },
  {
    id: "rag-school",
    title: "RAG over schoolbeleid + leerling-notities",
    domain: "Kennisbank · IB / zorgcoördinator",
    icon: Database,
    bar: "purple",
    problem:
      "Een schoolbestuur bouwt een Retrieval-Augmented-Generation-systeem dat IB'ers laat vragen \"Welke aanpak hadden we vorig jaar bij leerlingen met faalangst in 2-havo?\". De vector-store bevat zorgnotities mét namen en BSN — elke retrieval lekt deze door in de prompt-context.",
    pimSpot:
      "PiM draait twee keer: (1) bij de ingest-pipeline pseudonymiseert het documenten vóórdat embeddings worden berekend, mapping blijft in de versleutelde container; (2) bij de query-fase her-anonymiseert PiM de top-k chunks vóór ze in de LLM-context worden gegoten.",
    pipeline: [
      { label: "Docs uit Magister / ParnasSys" },
      { label: "PiM ingest: pseudonymize → embed", pim: true },
      { label: "Vector store (alleen tokens)" },
      { label: "Query → top-k retrieval" },
      { label: "PiM: re-check chunks → LLM", pim: true },
    ],
    mode: "pseudonymous",
    benefit:
      "Vector-databases worden statistisch onbruikbaar als breach-doel: ze bevatten alleen [PERSOON_042]-tokens. De koppeltabel ligt AES-GCM versleuteld in browsergeheugen van de bevoegde gebruiker.",
    evidence: [
      { author: "Carlini et al. (2021)", claim: "LLM's memoriseren trainingsdata; ingest-pseudonymisatie verbreekt de PII-recall-keten." },
      { author: "Sweeney (2002), k-anonymity", claim: "Quasi-identifiers (klas + school + jaar) zijn vaak genoeg om iemand te herleiden — daarom contextueel anonymiseren, niet alleen direct." },
    ],
  },
  {
    id: "feedback",
    title: "Geautomatiseerde feedback op leerlingwerk",
    domain: "Formatieve evaluatie · PO/VO",
    icon: FileText,
    bar: "green",
    problem:
      "Een tool laat leraren een essay uploaden voor AI-feedback. Het essay opent met \"Mijn naam is Yusuf el-Amrani, klas 4H2, en mijn vader…\". De leverancier traint stilletjes mee.",
    pimSpot:
      "PiM zit als pre-processor in de upload-handler. Tekst gaat door anonymisatie + contextuele generalisatie (kleine groep + naam → 'een leerling'). De feedback komt terug op de geanonimiseerde versie; PiM restore lokaal koppelt namen alléén in de UI van de leraar terug.",
    pipeline: [
      { label: "Essay-upload" },
      { label: "PiM: anonymize + context-gen.", pim: true },
      { label: "LLM-feedback op anon. tekst" },
      { label: "Lokale restore (alleen leraar)", pim: true },
    ],
    mode: "hybride",
    benefit:
      "De leverancier ziet nooit een leerlingnaam, maar de leraar wel — feedback blijft persoonlijk zonder dat de identiteit het schoolnetwerk verlaat.",
    evidence: [
      { author: "Black & Wiliam (1998)", claim: "Formatieve feedback werkt vooral als ze persoonlijk is — restore-laag is dus didactisch noodzakelijk, niet optioneel." },
      { author: "Hattie (2009), Visible Learning", claim: "Feedback-effect (d≈0.79) vraagt context; PiM behoudt context zonder identiteit prijs te geven." },
    ],
  },
  {
    id: "lvs-trigger",
    title: "Leerlingvolgsysteem → externe AI-signaalanalyse",
    domain: "Vroegsignalering · uitvalpreventie",
    icon: Brain,
    bar: "orange",
    problem:
      "Bestuur wil een ML-model dat patronen detecteert: cijferdip + verzuim + zorgvlag = vroegsignaal uitval. Vendor draait extern. Direct dossier doorsturen = profilering AVG art. 22.",
    pimSpot:
      "PiM zit op de export-grens van het LVS: features worden gepseudonymiseerd (leerling → stabiele token per schooljaar), zorgcontext gegeneraliseerd tot risico-klasse. De externe analyse retourneert tokens; alleen lokaal worden ze teruggekoppeld naar namen.",
    pipeline: [
      { label: "LVS export-job (nightly)" },
      { label: "PiM: pseudonymize features", pim: true },
      { label: "Externe risico-classifier" },
      { label: "Tokens + score terug" },
      { label: "PiM restore in IB-dashboard", pim: true },
    ],
    mode: "pseudonymous",
    benefit:
      "Voorkomt geautomatiseerde besluitvorming op identificeerbare leerlingen (art. 22), terwijl het signaal-mechanisme blijft werken.",
    evidence: [
      { author: "Selwyn (2019), Should Robots Replace Teachers?", claim: "Predictive analytics in onderwijs reproduceert bias als ze op ruwe identiteit traint — pseudonymisatie + audit-laag is mitigatie." },
      { author: "Onderwijsraad (2023)", claim: "Datagedreven werken vereist proportionaliteits-check vóór externe verwerking." },
    ],
  },
  {
    id: "chatbot-ouders",
    title: "Ouder-chatbot van de school",
    domain: "Communicatie · PO/VO",
    icon: MessageSquare,
    bar: "cyan",
    problem:
      "Ouder stelt vraag \"Hoe gaat het met Sophie in groep 3 bij juf Wim?\" via een schoolwebsite-chatbot. Bot stuurt prompt + sessie-context naar OpenAI; ouder denkt met de school te chatten.",
    pimSpot:
      "PiM zit als middleware in de chat-endpoint. Élke inkomende boodschap wordt lokaal in de browser (PWA) of in een edge-worker (CSP-gepind) geanonimiseerd voordat de prompt de LLM bereikt. Mode-isolation voorkomt dat eerdere ouder-context lekt.",
    pipeline: [
      { label: "Ouder typt in chat" },
      { label: "PiM browser-pre-filter", pim: true },
      { label: "Edge worker (re-consult)", pim: true },
      { label: "LLM-antwoord" },
      { label: "Render in chat" },
    ],
    mode: "anonymous",
    benefit:
      "Ouders houden hun vertrouwde communicatie­kanaal, school houdt aantoonbare verwerkings­controle. Eén DPIA i.p.v. per ouder.",
    evidence: [
      { author: "WP29 Opinion 05/2014", claim: "Anonimisering moet bestand zijn tegen singling-out, linkability en inference — PiM's contextuele detectoren mikken precies op die drie." },
    ],
  },
  {
    id: "rapport-rewrite",
    title: "Rapport- en gespreksverslag-herschrijving",
    domain: "Verslaglegging · zorgteam",
    icon: ClipboardList,
    bar: "purple",
    problem:
      "Mentor dicteert een gespreksverslag, AI-tool maakt er een net rapport van. Origineel dictaat bevat namen van klasgenoten, gezinssituatie, medicatie.",
    pimSpot:
      "Twee-fase PiM: (1) speech-to-text draait lokaal (WebGPU / Whisper.cpp), transcript gaat door anonymize → contextuele generalisatie, (2) Qwen-on-device herschrijft tot vlot rapport, draft-check + review-queue bewaakt residuele PII.",
    pipeline: [
      { label: "Dictaat audio" },
      { label: "Lokale STT (WebGPU)" },
      { label: "PiM: anonymize + gen.", pim: true },
      { label: "Qwen rewrite (browser)" },
      { label: "Draft-check → review-queue", pim: true },
    ],
    mode: "anonymous",
    benefit:
      "Geen netwerkverkeer voor zorgverslagen. Audit-trail kan via Trust dashboard worden geëxporteerd zonder dat het verslag zelf wordt opgeslagen.",
    evidence: [
      { author: "Nissenbaum (2010), Contextual Integrity", claim: "Informatie hoort bij een context; rapport-herschrijving moet identifiers strippen die buiten de oorspronkelijke gespreks­context vallen." },
    ],
  },
  {
    id: "research",
    title: "Onderwijsonderzoek & dataset-deling",
    domain: "Wetenschap · lerarenopleidingen",
    icon: FlaskConical,
    bar: "line",
    problem:
      "Onderzoeker wil corpora van leerlingteksten delen met een collega-universiteit. IRB eist dat namen, scholen en herkenbare contexten weg zijn — handmatig is dat duizenden uren werk en foutgevoelig.",
    pimSpot:
      "PiM als batch-pre-processor in een Jupyter/Node-pipeline (Node-port van de detectoren, dezelfde policy). Elke tekst krijgt een audit-record (welke regels triggerden) zodat reviewers reproduceerbaar zijn.",
    pipeline: [
      { label: "Ruwe corpus" },
      { label: "PiM batch: anon + audit", pim: true },
      { label: "Manual review-queue", pim: true },
      { label: "Gepubliceerde dataset" },
    ],
    mode: "anonymous",
    benefit:
      "Reproduceerbare, controleerbare anonimisatie — wat de FAIR-principes (Findable/Accessible/Interoperable/Reusable) onderscheidt van ad-hoc redaction.",
    evidence: [
      { author: "Wilkinson et al. (2016), FAIR Guiding Principles", claim: "Datasets moeten her-deelbaar zijn — alleen mogelijk als anonimisatie deterministisch en geversioneerd is." },
      { author: "El Emam (2013), HIPAA de-identification", claim: "Risk-based de-identification (k-anon + l-diversity) is reproduceerbaar; ad-hoc redaction niet." },
    ],
  },
  {
    id: "agents",
    title: "Multi-agent orchestratie (LangGraph / CrewAI)",
    domain: "Agent-workflows · EdTech-product",
    icon: Network,
    bar: "red",
    problem:
      "Een agent-workflow heeft een Planner, een Retriever, een Drafter en een Critic. Elke hop is een nieuwe LLM-call. Eén schone input → vier kansen op PII-lek via tool-calls en hand-offs.",
    pimSpot:
      "PiM zit als verplichte edge in de graaf: élke transitie tussen agents passeert een PiM-node die de hand-off-payload her-consulteert. State wordt in pseudonieme mode bewaard; alleen de terminal-node mag (lokaal) restoren.",
    pipeline: [
      { label: "User prompt" },
      { label: "PiM-gate", pim: true },
      { label: "Planner agent" },
      { label: "PiM-gate", pim: true, note: "elke hop opnieuw" },
      { label: "Retriever / Drafter / Critic" },
      { label: "Terminal restore (lokaal)", pim: true },
    ],
    mode: "pseudonymous",
    benefit:
      "Voorkomt 'context-bleed' tussen agents — het bekendste lek-patroon in productie-agentsystemen. Elke hop is afzonderlijk auditbaar.",
    evidence: [
      { author: "Greshake et al. (2023)", claim: "Indirect prompt-injection door tool-output is een primair agent-risico; tussenliggende guards zijn de aanbevolen mitigatie." },
    ],
  },
  {
    id: "exam",
    title: "Toets- en itembank-generatie",
    domain: "Curriculumontwerp · examencommissie",
    icon: GraduationCap,
    bar: "green",
    problem:
      "Docenten gebruiken AI om toetsvragen te genereren op basis van klasprestaties. Prompt bevat \"Mijn klas 5V scoorde slecht op leerdoel 3, en met name Lisa en Tariq…\". De itembank lekt klas-prestatiepatronen.",
    pimSpot:
      "PiM zit op de prompt-builder. Klas-aggregaten (n>5) mogen door; sub-groepen of namen worden gegeneraliseerd tot leer-doelstellings­niveau. De gegenereerde items blijven inhoudelijk relevant zonder klasspecifieke 'fingerprint'.",
    pipeline: [
      { label: "Docent + cijferinzicht" },
      { label: "PiM small-group block", pim: true },
      { label: "LLM item-generator" },
      { label: "Toetsmatrijs-output" },
    ],
    mode: "anonymous",
    benefit:
      "Itembanken worden generaliseerbaar over scholen i.p.v. herkenbaar voor één klas — meer didactisch hergebruik, minder privacy-risico.",
    evidence: [
      { author: "Wiliam (2011), Embedded Formative Assessment", claim: "Itemkwaliteit hangt af van leerdoel-validiteit, niet van leerlingspecificiteit — generaliseren is didactisch eerder voordeel dan verlies." },
    ],
  },
  {
    id: "speech-care",
    title: "Spraak-tot-tekst in zorgleerling­overleg",
    domain: "Multidisciplinair overleg · SO/VSO",
    icon: Stethoscope,
    bar: "red",
    problem:
      "Tijdens een MDO neemt een tool het overleg op voor notulen. Het transcript bevat namen, diagnoses, gezinssituatie — vaak van minderjarigen onder vrijwillige zorg.",
    pimSpot:
      "PiM draait nadat de lokale STT klaar is, vóór de notulen-LLM. Special-context combo-regel (zorgcontext + naam + kleine groep) escaleert naar BLOCK; alleen handmatig vrijgegeven fragmenten gaan door.",
    pipeline: [
      { label: "MDO-audio" },
      { label: "STT lokaal" },
      { label: "PiM combo-detect", pim: true, note: "special-context BLOCK" },
      { label: "Notulen-LLM (anon delen)" },
      { label: "Review-queue", pim: true },
    ],
    mode: "anonymous",
    benefit:
      "Voldoet aan de bijzondere-categorieën-eis (AVG art. 9): gezondheidsgegevens verlaten het apparaat niet zonder expliciete, gelogde override.",
    evidence: [
      { author: "AVG art. 9 lid 2 sub h", claim: "Verwerking van gezondheidsgegevens vereist passende waarborgen — fail-closed met handmatige override is een gangbare interpretatie." },
    ],
  },
  {
    id: "edtech-saas",
    title: "EdTech-leverancier die white-label PiM inbouwt",
    domain: "B2B-platform · SaaS",
    icon: Server,
    bar: "purple",
    problem:
      "EdTech-startup verkoopt aan scholen, maar elke school eist eigen DPA en eigen audit. Modeltrainings­clausules vertragen sales-cycles van weken naar maanden.",
    pimSpot:
      "PiM wordt als browser-SDK ingebed: alle AI-functionaliteit van het product draait door de PiM-gate in de SPA van de klant. De leverancier ziet nooit ruwe leerlingdata, alleen tokens of geanonimiseerde streams.",
    pipeline: [
      { label: "School-tenant SPA" },
      { label: "PiM-SDK (browser)", pim: true },
      { label: "Vendor-backend (alleen tokens)" },
      { label: "External AI (re-consult)", pim: true },
    ],
    mode: "pseudonymous",
    benefit:
      "Eén audit-rapport per release i.p.v. per klant. DPA's verschuiven van 'verwerker' naar 'sub-processor zonder PII-toegang'.",
    evidence: [
      { author: "SIVON modelinkoopvoorwaarden (2024)", claim: "Sectorale inkoop verlangt aantoonbare technische maatregelen; SDK-aanpak is bewijsbaar en herhaalbaar." },
    ],
  },
  {
    id: "parent-portal",
    title: "Ouder-portaal met AI-samenvattingen",
    domain: "Schoolcommunicatie · PO",
    icon: Users,
    bar: "cyan",
    problem:
      "Een ouderportaal vat wekelijks leerling-voortgang samen via AI. Samenvatting bevat klasgenoten-namen die toevallig in notities staan ('Sophie hielp Yusuf met breuken').",
    pimSpot:
      "PiM filtert de bron-notities op derde-partij-namen (alles wat niet de geadresseerde ouder's kind is). Restore is per-ouder gescoped — andere leerlingen blijven anoniem in de samenvatting.",
    pipeline: [
      { label: "Weeknotities leraar" },
      { label: "PiM scoped anon (per ouder)", pim: true },
      { label: "LLM-samenvatting" },
      { label: "Render in ouder-app" },
    ],
    mode: "hybride",
    benefit:
      "Ouders krijgen relevante info zonder dat andere kinderen geïdentificeerd worden — voldoet aan AVG-doelbinding op contextueel niveau.",
    evidence: [
      { author: "Nissenbaum (2010), Contextual Integrity", claim: "Doorgifte van persoonsinfo is alleen passend binnen de oorspronkelijke informatie­norm; portalen schenden dat snel zonder gerichte filter." },
    ],
  },
];

function ScenariosPage() {
  return (
    <div className="grid-bg">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <Hero />
        <PrincipleStrip />
        <PipelineMap />
        <ScenarioGrid />
        <ScientificFoundation />
        <DecisionMatrix />
        <CTA />
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="mb-16">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider border border-primary/30 bg-primary/10 text-primary mb-6">
        <Layers className="h-3.5 w-3.5" /> Toepassings­scenarios · v3-2
      </div>
      <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight max-w-4xl leading-[1.05]">
        Waar past PiM in een <span className="text-primary">onderwijs-AI-pipeline</span>?
      </h1>
      <p className="mt-6 text-lg text-muted-foreground max-w-3xl leading-relaxed">
        PiM is geen product op zichzelf — het is een <strong className="text-foreground">beslislaag</strong> die je
        op precies dat ene punt in je orchestratie zet waar ruwe leerling­data anders een netwerk- of model­grens
        passeert. Hieronder twaalf concrete plekken, per type pipeline, met de didactische én juridische
        onderbouwing waarom die plek de juiste is.
      </p>
    </section>
  );
}

function PrincipleStrip() {
  const principles = [
    { icon: Shield, label: "Fail-closed", note: "Bij twijfel blokkeren" },
    { icon: Lock, label: "Local-first", note: "Verwerking in de browser" },
    { icon: Eye, label: "Mode isolation", note: "Anon en pseudo gescheiden" },
    { icon: Cpu, label: "Models = sensoren", note: "PiM beslist, model meet" },
  ];
  return (
    <section className="mb-16 grid grid-cols-2 md:grid-cols-4 gap-3">
      {principles.map((p) => (
        <div key={p.label} className="panel p-4 flex items-start gap-3">
          <div className="rounded-md bg-primary/15 p-2">
            <p.icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold">{p.label}</div>
            <div className="text-xs text-muted-foreground">{p.note}</div>
          </div>
        </div>
      ))}
    </section>
  );
}

function PipelineMap() {
  const layers = [
    { name: "Bron", desc: "LVS, leerling-input, dictaat, document-upload", color: "line" },
    { name: "Pre-filter", desc: "PiM detect + anonymize/pseudonymize", color: "cyan", pim: true },
    { name: "Draft-check", desc: "Output­controle, residuele PII = fail", color: "purple", pim: true },
    { name: "Orchestratie", desc: "LLM, RAG, agents, classifier", color: "orange" },
    { name: "Egress re-consult", desc: "Tweede sluis vlak vóór netwerkcall", color: "red", pim: true },
    { name: "Render / Restore", desc: "Lokale terugkoppeling met handle", color: "green", pim: true },
  ];
  return (
    <section className="mb-20">
      <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">De universele inbouwplek</h2>
      <p className="text-muted-foreground mb-8 max-w-3xl">
        Iedere pipeline hieronder is een variant op dezelfde zes-laagse keten. PiM beslaat de laagjes die de
        vertrouwens­grens kruisen — alles wat tussen "browser-veilig" en "elders" zit.
      </p>
      <div className="panel p-6 md:p-8 overflow-x-auto">
        <div className="flex items-stretch gap-3 min-w-[760px]">
          {layers.map((l, i) => (
            <div key={l.name} className="flex items-stretch gap-3 flex-1">
              <div className="flex-1 pipeline-stage p-4">
                <div className={`stage-bar bar-${l.color} mb-3 -mt-4 -mx-4`} />
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-xs font-mono text-muted-foreground">L{i + 1}</div>
                  {l.pim && (
                    <span className="text-[10px] uppercase tracking-wider font-mono text-primary border border-primary/40 rounded px-1.5 py-0.5">
                      PiM
                    </span>
                  )}
                </div>
                <div className="font-semibold text-sm">{l.name}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{l.desc}</div>
              </div>
              {i < layers.length - 1 && (
                <ArrowRight className="h-4 w-4 text-primary/60 self-center shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ScenarioGrid() {
  return (
    <section className="mb-20">
      <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">Twaalf concrete scenarios</h2>
      <p className="text-muted-foreground mb-8 max-w-3xl">
        Elk scenario beschrijft: het didactische probleem, de exacte inbouwplek, de pipeline-flow, de gekozen
        modus en de wetenschappelijke onderbouwing waarop de keuze rust.
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        {SCENARIOS.map((s) => (
          <ScenarioCard key={s.id} s={s} />
        ))}
      </div>
    </section>
  );
}

function ScenarioCard({ s }: { s: Scenario }) {
  const ModeBadge = () => {
    const color =
      s.mode === "anonymous" ? "text-green border-green/40 bg-green/10" :
      s.mode === "pseudonymous" ? "text-purple border-purple/40 bg-purple/10" :
      "text-cyan border-cyan/40 bg-cyan/10";
    return (
      <span className={`text-[10px] uppercase tracking-wider font-mono border rounded px-2 py-0.5 ${color}`} style={{
        color: s.mode === "anonymous" ? "var(--green)" : s.mode === "pseudonymous" ? "var(--purple)" : "var(--cyan)",
        borderColor: s.mode === "anonymous" ? "var(--green)" : s.mode === "pseudonymous" ? "var(--purple)" : "var(--cyan)",
      }}>
        {s.mode}
      </span>
    );
  };
  return (
    <article className="pipeline-stage p-6 flex flex-col gap-5">
      <div className={`stage-bar bar-${s.bar} -mt-6 -mx-6 mb-1`} />
      <header className="flex items-start gap-4">
        <div className="rounded-lg bg-primary/15 border border-primary/30 p-2.5 shrink-0">
          <s.icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">{s.domain}</span>
            <ModeBadge />
          </div>
          <h3 className="font-display text-lg font-bold leading-tight">{s.title}</h3>
        </div>
      </header>

      <div>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-mono text-orange mb-1.5">
          <AlertTriangle className="h-3 w-3" /> Probleem
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">{s.problem}</p>
      </div>

      <div>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-mono text-primary mb-1.5">
          <Shield className="h-3 w-3" /> Inbouwplek PiM
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">{s.pimSpot}</p>
      </div>

      <div>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-mono text-cyan mb-2">
          <Workflow className="h-3 w-3" /> Pipeline
        </div>
        <ol className="space-y-1.5">
          {s.pipeline.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <span className="font-mono text-muted-foreground mt-0.5 w-5 shrink-0">{i + 1}.</span>
              <span
                className={`flex-1 px-2 py-1 rounded ${
                  step.pim ? "border border-primary/40 bg-primary/10 text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.pim && <Shield className="inline h-3 w-3 mr-1 text-primary" />}
                {step.label}
                {step.note && <span className="text-muted-foreground"> — {step.note}</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-md border border-green/30 bg-green/5 p-3">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-mono text-green mb-1" style={{ color: "var(--green)" }}>
          <Sparkles className="h-3 w-3" /> Toegevoegde waarde
        </div>
        <p className="text-xs leading-relaxed text-foreground/90">{s.benefit}</p>
      </div>

      <div>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-mono text-muted-foreground mb-2">
          <BookOpen className="h-3 w-3" /> Onderbouwing
        </div>
        <ul className="space-y-2">
          {s.evidence.map((e) => (
            <li key={e.author} className="text-xs leading-relaxed border-l-2 border-primary/30 pl-3">
              <span className="font-semibold text-foreground">{e.author}</span>
              <span className="text-muted-foreground"> — {e.claim}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function ScientificFoundation() {
  const pillars = [
    {
      title: "Contextuele integriteit",
      author: "Nissenbaum (2010)",
      body: "Privacy is geen geheimhouding maar passendheid binnen een sociale context. PiM's contextuele detectoren (zorg, kleine groep, rol) operationaliseren dit principe in code.",
    },
    {
      title: "k-anonymity & l-diversity",
      author: "Sweeney (2002), Machanavajjhala (2007)",
      body: "Een leerling is vaak herleidbaar via quasi-identifiers (klas + jaar + school). PiM's combo-regels blokkeren juist die intersecties, niet alleen losse directe PII.",
    },
    {
      title: "Memorisatie in LLM's",
      author: "Carlini et al. (2021, 2023)",
      body: "Large language models memoriseren zeldzame trainings­strings. Ingest-pseudonymisatie verbreekt de recall-keten voordat embeddings worden berekend.",
    },
    {
      title: "Visible Learning & feedback",
      author: "Hattie (2009), Black & Wiliam (1998)",
      body: "Feedback­effect is hoog (d≈0.79) maar vereist persoonlijke context. De restore-laag van PiM houdt feedback didactisch effectief zonder identiteit te lekken.",
    },
    {
      title: "Platformisering",
      author: "Kerssens & Van Dijck (2021)",
      body: "EdTech-platforms creëren ongecontroleerde dataflows. Technische tussenlagen herstellen autonomie van scholen i.p.v. afhankelijkheid van DPA-juridica.",
    },
    {
      title: "Indirect prompt-injection",
      author: "Greshake et al. (2023)",
      body: "Agent-pipelines lekken via tool-output. PiM-gates tussen agent-hops zijn de literatuur-aanbeveling tegen context-bleed en hand-off-injectie.",
    },
  ];
  return (
    <section className="mb-20">
      <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">Wetenschappelijke fundamenten</h2>
      <p className="text-muted-foreground mb-8 max-w-3xl">
        De scenarios hierboven zijn geen ontwerp­voorkeur — ze rusten op zes pijlers uit privacy-engineering,
        onderwijskunde en AI-veiligheid. Samen vormen ze de reden waarom PiM precies daar zit waar ze zit.
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pillars.map((p) => (
          <div key={p.title} className="panel p-5">
            <div className="flex items-center gap-2 mb-2">
              <Quote className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{p.author}</span>
            </div>
            <h3 className="font-display font-bold text-base mb-2">{p.title}</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DecisionMatrix() {
  const rows = [
    { when: "Externe LLM-call met user-input", mode: "anonymous", action: "pre-filter + egress re-consult" },
    { when: "RAG over interne docs met PII", mode: "pseudonymous", action: "ingest pseudonymize, query re-anon" },
    { when: "Lokale rewrite (Qwen browser)", mode: "anonymous", action: "draft-check op output" },
    { when: "Multi-agent hand-offs", mode: "pseudonymous", action: "PiM-gate per transitie" },
    { when: "Zorg/MDO-transcript", mode: "anonymous", action: "special-context BLOCK + review-queue" },
    { when: "Dataset-publicatie voor onderzoek", mode: "anonymous", action: "batch + audit-log per regel" },
    { when: "Vendor-SaaS in school-tenant", mode: "pseudonymous", action: "SDK in de SPA, vendor ziet tokens" },
  ];
  return (
    <section className="mb-20">
      <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">Beslis-matrix</h2>
      <p className="text-muted-foreground mb-6 max-w-3xl">
        Snelle keuzehulp voor architecten: welke modus en welk PiM-patroon past bij welke situatie.
      </p>
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] uppercase tracking-wider font-mono text-muted-foreground">
                <th className="px-5 py-3">Situatie</th>
                <th className="px-5 py-3">Modus</th>
                <th className="px-5 py-3">PiM-patroon</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.when} className="border-b border-border/30 last:border-0">
                  <td className="px-5 py-3.5">{r.when}</td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs px-2 py-0.5 rounded border" style={{
                      color: r.mode === "anonymous" ? "var(--green)" : "var(--purple)",
                      borderColor: r.mode === "anonymous" ? "var(--green)" : "var(--purple)",
                    }}>
                      {r.mode}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{r.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="panel-glow p-8 md:p-10 text-center">
      <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
        Zie het in actie op je eigen tekst
      </h2>
      <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
        Plak een fictief leerling-fragment in de demo. Bekijk live welke detectoren triggeren, welke modus PiM
        kiest en hoe de draft-check residuele PII vangt voordat iets de browser verlaat.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          to="/try"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
        >
          Open de demo <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/architecture"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-primary/40 text-foreground hover:bg-primary/10 transition-colors"
        >
          Architectuur-deep-dive
        </Link>
      </div>
    </section>
  );
}