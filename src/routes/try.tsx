import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHero } from "@/components/pim/PageHero";
import { RiskGauge } from "@/components/pim/RiskGauge";
import { PipelineTimeline, type PipelineStepView } from "@/components/pim/PipelineTimeline";
import { AnonymizedText } from "@/components/pim/AnonymizedText";
import { RiskBanner } from "@/components/pim/RiskBanner";
import { usePipelineHeartbeat, type StepId } from "@/hooks/usePipelineHeartbeat";
import { usePimEngine } from "@/hooks/usePimEngine";
import {
  createMappingContainer,
  restoreFromContainer,
  destroyContainer,
  installRuntimeHardening,
  onViolations,
  detectPersonsSlm,
  loadNerSlm,
  onNerStatus,
  type NerStatus,
  getNerVariant,
  setNerVariant,
  NER_VARIANTS,
  type NerVariantKey,
  PIPELINE_PROFILES,
  RELEASE_1_PROFILES,
  DEFAULT_PROFILE,
  type PipelineProfileId,
  onModelIntegrity,
  type ModelIntegrityRecord,
  activeDetectorsFor,
  detectorSourceLabel,
  enqueueReview,
  onReviewQueue,
  resolveReview,
  clearReviewQueue,
  type ReviewItem,
  recordSubmission,
  type AbuseSignal,
  rewriteAnonymousDraftStream,
  onRewriteStatus,
  type RewriteStatus,
  type Mode,
  type Action,
  type Verdict,
  type AuditEvent,
  type MappingHandle,
  type PiiSpan,
  coerceDetectionSettings,
} from "@/lib/pim";
import { loadRewriteLlm } from "@/lib/pim/rewriteLlm";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Copy,
  Eye,
  Save,
  RotateCcw,
  Send,
  Download,
  Printer,
  Share2,
  Lock,
  AlertTriangle,
  Cpu,
  Loader2,
  Wrench,
  Check,
  ChevronRight,
  Sparkles,
  X,
  Info,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/try")({
  head: () => ({
    meta: [
      { title: "Expert lab — Project PiM" },
      {
        name: "description",
        content:
          "De volledige pipeline van Project PiM, voor testers en ontwikkelaars: detector-profielen, NER, herschrijving, modelintegriteit en audit. Wil je een snelle test? Ga naar de startpagina.",
      },
      { property: "og:title", content: "Expert lab — Project PiM" },
      {
        property: "og:description",
        content:
          "De volledige pipeline, modelstatus en audit. Voor een snelle test ga je naar de startpagina.",
      },
    ],
  }),
  component: TryPage,
});

// — Presets: 3 schone starters + 6 scenario-bruggen naar /scenarios —
interface Preset {
  id: string;
  label: string;
  tone: "green" | "orange" | "red" | "cyan" | "purple";
  hint: string;
  text: string;
  mode: Mode;
  action: Action;
  scenarioId?: string;
}

const STARTERS: Preset[] = [
  {
    id: "starter-clean",
    label: "Schoon · ALLOW",
    tone: "green",
    hint: "Vakinhoudelijke evaluatie zonder herleidbare gegevens — alles blijft staan, AI mag direct aan de slag.",
    text:
      "Vraag aan de AI: help mij deze tussenevaluatie aanscherpen tot een advies van " +
      "max. 250 woorden voor de bouwvergadering.\n\n" +
      "Tussenevaluatie nieuwe rekenmethode — na acht weken.\n" +
      "1. Automatiseren tot 100 gaat aantoonbaar sneller: gemiddelde tijd op de " +
      "weektoets daalde van 7'20\" naar 5'45\".\n" +
      "2. De differentiatiebladen op niveau 1-2-3 worden in 4 van de 5 lessen ingezet; " +
      "de instructiegroep krimpt na de eerste oefenronde.\n" +
      "3. Spreiding op de blok­toets is kleiner (sd 1,2 → 0,8), maar de zwakste subgroep " +
      "blijft achter op meten & meetkunde.\n\n" +
      "Beoogd besluit: methode definitief invoeren vanaf komend schooljaar, met een extra " +
      "interventielijn voor meten & meetkunde in de onderbouw.",
    mode: "anonymous",
    action: "display",
  },
  {
    id: "starter-medium",
    label: "Repair · contextuele PII",
    tone: "orange",
    hint: "Naam + klascode worden geneutraliseerd; de pedagogische inhoud — het échte signaal voor de AI — blijft volledig staan.",
    text:
      "Vraag aan de AI: stel op basis van dit verslag een studieplanning van 3 weken voor, " +
      "met tussendoelen per week en een korte ouderbrief.\n\n" +
      "Kort mentorverslag.\n" +
      "Gesprek gevoerd met Tom de Vries (4H2) over de aanloop naar het schoolexamen " +
      "Nederlands. Twee PTA-deadlines vallen in dezelfde week van november: " +
      "literatuurdossier (5 boeken, eigen analyse) en betoog (800 woorden, bronvermelding).\n\n" +
      "Observaties: leerling overziet de stof, maar plant op dagniveau in plaats van op " +
      "weekniveau; herleest bronnen meerdere keren zonder aantekeningen; begint pas met " +
      "schrijven als alles 'klopt'. Motivatie is hoog, faalangst speelt mee.\n\n" +
      "Afspraken: leerling levert vrijdag een eigen weekplanning, ouders zijn telefonisch " +
      "geïnformeerd en steunen de aanpak. Vervolggesprek over twee weken.",
    mode: "anonymous",
    action: "copy",
  },
  {
    id: "starter-heavy",
    label: "Block · directe PII",
    tone: "red",
    hint: "Identificerende kop wordt geblokkeerd; de inhoudelijke zorgvraag eronder is precies waarom je PiM nodig hebt vóór je naar AI gaat.",
    text:
      "Vraag aan de AI: help mij een handelingsplan op te stellen volgens de SMW-richtlijn, " +
      "met concrete interventies voor school én ouders.\n\n" +
      "Notitie zorgcoördinator — vertrouwelijk.\n" +
      "Betreft: Sarah Jansen, groep 6, basisschool De Wilg te Utrecht.\n" +
      "Geboortedatum 14-03-2015, BSN 123456782, leerlingnummer 4582193.\n" +
      "Adres: Bredestraat 12, 3511 AB Utrecht.\n" +
      "Contact ouders: vader (Mark Jansen) op 06-12345678, e-mail jansen@voorbeeld.nl. " +
      "Eigen bijdrage zorgarrangement loopt via IBAN NL91ABNA0417164300.\n\n" +
      "Aanleiding en observaties (relevant voor de AI):\n" +
      "- Sinds de herfstvakantie afnemende deelname aan groepswerk, eet tussen de middag " +
      "alleen, scoort op de SAQI hoger op de schaal 'sociale onveiligheid'.\n" +
      "- Pestsignalen binnen een kerngroep van vier meisjes (uitsluiten bij gym en " +
      "buitenspel, roddel via groepschat).\n" +
      "- Leerprestaties stabiel, maar werktempo bij begrijpend lezen halveerde.\n\n" +
      "Gewenste output: handelingsplan met (1) korte-termijn interventies in de groep, " +
      "(2) gespreksleidraad voor ouders, (3) evaluatiemomenten over 4 en 8 weken.",
    mode: "anonymous",
    action: "send_external_ai",
  },
];

const SCENARIO_PRESETS: Preset[] = [
  {
    id: "llm-tutor",
    label: "AI-tutor → ext. LLM",
    tone: "cyan",
    scenarioId: "llm-tutor",
    hint: "Naam, school en zorgdiagnose worden gefilterd; de inhoudelijke leervraag over 'Spijt!' blijft volledig staan voor de tutor.",
    text:
      "Hoi, ik ben Yusuf el-Amrani uit 3vmbo-b op het Stedelijk Lyceum in Eindhoven. " +
      "Ik heb ADHD en gebruik daar medicatie voor, dus lange opdrachten lopen vaak vast.\n\n" +
      "Vraag aan de tutor:\n" +
      "Help me een boekverslag van 'Spijt!' van Carry Slee op te bouwen rond één rode " +
      "draad: hoe het thema (groepsdruk en pesten) zichtbaar wordt in de keuzes van " +
      "hoofdpersoon David, en wat ik daar zelf van vind.\n\n" +
      "Wat ik al heb:\n" +
      "- Samenvatting per hoofdstuk klaar.\n" +
      "- Drie scènes geselecteerd waarin David wegkijkt bij Jochem.\n" +
      "- Eigen mening: 'meelopen is ook kiezen', maar ik krijg het niet onderbouwd.\n\n" +
      "Wat ik nodig heb: een opbouw in 5 alinea's (thema → personage → 3 scènes → " +
      "eigen mening → conclusie) en per alinea één concrete schrijftip. Inleverdatum " +
      "is 28 november, dus geen lange theorie graag.",
    mode: "anonymous",
    action: "send_external_ai",
  },
  {
    id: "rag-school",
    label: "RAG schoolbeleid",
    tone: "purple",
    scenarioId: "rag-school",
    hint: "Namen worden pseudonieme tokens (lokaal te restoren); de beleidslogica en interventies blijven indexeerbaar voor de vector-store.",
    text:
      "Casusbeschrijving voor het ondersteuningsdossier (schooljaar 2024-2025).\n\n" +
      "Leerling Lisa Bakker (klas 2havo, dyslexieverklaring sinds groep 6) kreeg na " +
      "overleg met IB'er Marieke de Groot het volgende arrangement:\n" +
      "- 25% extra tijd bij toetsen Nederlands en Engels;\n" +
      "- toegang tot voorleessoftware (ClaroRead) op het schoolaccount;\n" +
      "- vrijstelling van hardop voorlezen in de klas;\n" +
      "- twee keer per periode evaluatiegesprek met de mentor.\n\n" +
      "Vergelijkbare aanpak werd vorig schooljaar succesvol ingezet bij Tariq el-Amrani " +
      "(klas 2A) en Sophie van Dijk (klas 2B). In beide gevallen steeg het cijfer " +
      "Nederlands met gemiddeld 0,8 punt en daalde het aantal gemiste toetsmomenten naar 0.\n\n" +
      "Voorstel van de ondersteuningscoördinator: dit arrangement opnemen als " +
      "standaardroute in het schoolbeleid 'dyslexie onderbouw', met evaluatie na één " +
      "schooljaar en heldere afbakening t.o.v. maatwerk-trajecten.",
    mode: "pseudonymous",
    action: "save_local",
  },
  {
    id: "feedback",
    label: "Feedback op essay",
    tone: "green",
    scenarioId: "feedback",
    hint: "Identificerende kop én familie-context gaan eraf; het inhoudelijke essay (onderzoeksvraag, methode, bronnen) blijft één-op-één staan voor de feedback-LLM.",
    text:
      "Naam: Yusuf el-Amrani — klas 4H2 — vak: maatschappijleer — docent: meester Jansen.\n" +
      "Mijn vader werkt als verpleegkundige in het Catharina-ziekenhuis en ziet daar " +
      "dagelijks jongeren binnenkomen met klachten die mogelijk samenhangen met " +
      "schermgebruik. Dat vormt de persoonlijke aanleiding voor dit essay.\n\n" +
      "— Essay (concept v2) —\n" +
      "Onderzoeksvraag: in hoeverre beïnvloedt het dagelijks gebruik van sociale media " +
      "de concentratie van scholieren tussen 14 en 18 jaar?\n\n" +
      "Methode: combinatie van literatuuronderzoek (Twenge, 2017; Orben & Przybylski, " +
      "2019; Nesi et al., 2018) en een korte enquête (n=28) onder mijn eigen klas, met " +
      "vragen over schermtijd, slaap en zelf-gerapporteerde concentratie.\n\n" +
      "Voorlopige conclusie: schermtijd boven 3 uur per dag correleert in mijn steekproef " +
      "met lagere zelf-gerapporteerde concentratie, maar de literatuur waarschuwt voor " +
      "te snelle causale claims. Discussie­paragraaf is nog niet af.\n\n" +
      "Vraag aan de feedback-LLM: beoordeel structuur, sterkte van de argumentatie en " +
      "gebruik van bronnen op havo-4 niveau, en geef 3 concrete verbeterpunten.",
    mode: "anonymous",
    action: "display",
  },
  {
    id: "lvs-trigger",
    label: "LVS → risico-classifier",
    tone: "orange",
    scenarioId: "lvs-trigger",
    hint: "Leerlingnummer en dossier-ID worden tokens; de feature-vector (cijferverloop, absentie, trend) blijft compleet voor de classifier.",
    text:
      "Nightly LVS-export — record 1 van 412.\n\n" +
      "Identificatie (wordt getokeniseerd):\n" +
      "leerlingnummer 4582193, klas 3V, mentor dhr. P. Hendriks, dossier ZRG-2025-0418.\n\n" +
      "Features voor de classifier (blijven inhoudelijk staan):\n" +
      "- cijferverloop wiskunde: 7,2 → 6,1 → 4,8 over drie periodes (trend −2,4);\n" +
      "- cijferverloop Nederlands: 6,8 → 6,9 → 6,7 (stabiel);\n" +
      "- absentie: 14 dagen ongeoorloofd in lopend kwartaal (vorig kwartaal 2);\n" +
      "- te-laat-meldingen: 9 in 6 weken, geconcentreerd op maandag en vrijdag;\n" +
      "- huiswerk-completion (LMS): 92% → 64% → 41%;\n" +
      "- zorgvlag actief sinds 02-09-2025.\n\n" +
      "Gewenste output classifier: risico-score 0-1, top-3 drijvende features, en " +
      "aanbeveling 'opnemen in wekelijkse signaleringslijst' ja/nee. Geen rechtstreekse " +
      "interventie zonder menselijke beoordeling door de zorgcoördinator.",
    mode: "pseudonymous",
    action: "send_external_ai",
  },
  {
    id: "chatbot-ouders",
    label: "Ouder-chatbot",
    tone: "cyan",
    scenarioId: "chatbot-ouders",
    hint: "Familienamen en kleine-groep-context gaan eraf; de feitelijke observaties en de hulpvraag van de ouders blijven voor de chatbot leesbaar.",
    text:
      "Goedemiddag,\n\n" +
      "Ik wil graag weten hoe het met mijn dochter Sophie van Dijk gaat in groep 3 bij " +
      "juf Wilma. De laatste drie weken zien wij thuis het volgende:\n" +
      "- 's avonds opvallend stil, eet minder, wil eerder naar bed;\n" +
      "- 's ochtends buikpijn en huilbuien rond het aankleden;\n" +
      "- vraagt of ze met mama mee mag naar het werk in plaats van naar school.\n\n" +
      "Haar broer Lucas (groep 5) vertelt thuis dat Sophie tijdens de pauze regelmatig " +
      "alleen op het schoolplein staat en dat twee meisjes uit haar groep haar uitsluiten " +
      "bij het spelen.\n\n" +
      "Onze vraag aan de school:\n" +
      "1. Herkent de leerkracht deze signalen op school?\n" +
      "2. Wat is jullie pestprotocol en welke stap zit jullie nu in?\n" +
      "3. Kunnen we vóór vrijdag een gesprek inplannen om af te stemmen wat wij als " +
      "ouders thuis kunnen doen?\n\n" +
      "Met vriendelijke groet,\nFamilie Van Dijk",
    mode: "anonymous",
    action: "send_external_ai",
  },
  {
    id: "rapport-rewrite",
    label: "Gespreksverslag",
    tone: "purple",
    scenarioId: "rapport-rewrite",
    hint: "Namen, klas en medicatie­dosis worden lokaal door Qwen generaliserend herschreven; de inhoudelijke afspraken en interventies blijven exact bewaard.",
    text:
      "Verslag multidisciplinair overleg — 14 maart 2025.\n\n" +
      "Aanwezig: mentor (dhr. Hendriks), IB'er (mevr. De Groot), schoolpsycholoog " +
      "(mevr. Visser), ouders Tariq el-Amrani.\n\n" +
      "Stand van zaken:\n" +
      "Tariq el-Amrani (klas 2A) laat al twee periodes toenemende faalangst zien rond " +
      "toetsmomenten: vermijdingsgedrag op de dag van de toets, blanco inleveren bij " +
      "tijdsdruk, en herstel binnen 24 uur. De medicatie (methylfenidaat 10 mg) loopt " +
      "door; huisarts evalueert in juni. De gezinssituatie is sinds de scheiding van " +
      "ouders in 2024 complex, met wisselend verblijf bij beide ouders.\n\n" +
      "Wat werkt op school (blijft staan in verslag):\n" +
      "- toetsen in kleinere ruimte met 25% extra tijd;\n" +
      "- vooraf inzage in opdrachttype (open/gesloten);\n" +
      "- vaste 'time-out kaart' bij overprikkeling;\n" +
      "- ondersteuning van een vaste klasgenoot tijdens groepswerk.\n\n" +
      "Afspraken:\n" +
      "1. Handelingsplan herzien vóór de meivakantie, met meetbare doelen op " +
      "toetsdeelname en zelfgerapporteerde spanning (schaal 1-10).\n" +
      "2. Schoolpsycholoog start cognitieve gedragsoefeningen, 6 sessies.\n" +
      "3. Vervolg-MDO op 12 mei, met evaluatie van de medicatie samen met de huisarts.",
    mode: "anonymous",
    action: "save_local",
  },
];

const ACTIONS: { id: Action; label: string; icon: React.ComponentType<{ className?: string }> }[] =
  [
    { id: "display", label: "Display", icon: Eye },
    { id: "copy", label: "Copy", icon: Copy },
    { id: "save_local", label: "Save", icon: Save },
    { id: "restore", label: "Restore", icon: RotateCcw },
    { id: "export_file", label: "Export", icon: Download },
    { id: "send_external_ai", label: "Send AI", icon: Send },
    { id: "print", label: "Print", icon: Printer },
    { id: "share", label: "Share", icon: Share2 },
  ];

const STEP_IDS: StepId[] = [
  "input",
  "regex",
  "lex",
  "slm",
  "ctx",
  "repair",
  "guard",
  "decide",
  "llm",
];

function TryPage() {
  const [activePreset, setActivePreset] = useState<Preset>(STARTERS[0]);
  const [text, setText] = useState(STARTERS[0].text);
  const [mode, setMode] = useState<Mode>(STARTERS[0].mode);
  const [action, setAction] = useState<Action>(STARTERS[0].action);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [handle, setHandle] = useState<MappingHandle | null>(null);
  const [restored, setRestored] = useState<string | null>(null);
  const [egress, setEgress] = useState<{ ok: boolean; msg: string } | null>(null);
  const [violations, setViolations] = useState<string[]>([]);
  const [slmEnabled, setSlmEnabled] = useState(false);
  const [nerVariant, setNerVariantState] = useState<NerVariantKey>(getNerVariant());
  const [slmStatus, setSlmStatus] = useState<NerStatus | null>(null);
  const [slmSpans, setSlmSpans] = useState<PiiSpan[]>([]);
  const [profileId, setProfileId] = useState<PipelineProfileId>(DEFAULT_PROFILE);
  const [integrity, setIntegrity] = useState<ModelIntegrityRecord[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [lastEnqueuedKey, setLastEnqueuedKey] = useState<string | null>(null);
  const [abuse, setAbuse] = useState<AbuseSignal | null>(null);
  const [llmStatus, setLlmStatus] = useState<RewriteStatus | null>(null);
  const [llmDraft, setLlmDraft] = useState<{ text: string; reason: string } | null>(null);
  const [llmStreaming, setLlmStreaming] = useState(false);
  const [llmStreamText, setLlmStreamText] = useState("");
  const [verdictOpen, setVerdictOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem("pim:try:welcomeSeen") === "1") {
        setShowWelcome(false);
      }
    } catch {
      /* noop */
    }
  }, []);

  const dismissWelcome = () => {
    setShowWelcome(false);
    try {
      localStorage.setItem("pim:try:welcomeSeen", "1");
    } catch {
      /* noop */
    }
  };

  const activateSlm = () => {
    if (!profile.detectors.nerSlm) return;
    setSlmEnabled(true);
    loadNerSlm().catch(() => {});
  };

  const selectNerVariant = (v: NerVariantKey) => {
    if (v === nerVariant) return;
    setNerVariant(v); // reset de pipeline; status springt naar idle
    setNerVariantState(v);
    if (slmEnabled) loadNerSlm().catch(() => {}); // direct opnieuw downloaden
  };

  const profile = PIPELINE_PROFILES[profileId];
  const activeDetectorIds = useMemo(
    () => activeDetectorsFor(profileId).map((d) => d.id),
    [profileId],
  );
  const { steps, tick } = usePipelineHeartbeat(STEP_IDS);

  useEffect(() => {
    installRuntimeHardening();
    const off = onViolations(setViolations);
    const offS = onNerStatus(setSlmStatus);
    const offI = onModelIntegrity(setIntegrity);
    const offR = onReviewQueue(setReviewItems);
    const offL = onRewriteStatus(setLlmStatus);
    return () => {
      off();
      offS();
      offI();
      offR();
      offL();
    };
  }, []);

  useEffect(() => {
    if (!profile.detectors.nerSlm) setSlmEnabled(false);
  }, [profile.detectors.nerSlm]);

  // Geen auto-load: NER-SLM start nu uitsluitend via de bewuste knop
  // ("Inschakelen") in de PipelineStepsBar of via de Live Tech Monitor.

  useEffect(() => {
    tick("input", 0);
  }, [text, tick]);

  useEffect(() => {
    if (!slmEnabled || !slmStatus?.ready) {
      setSlmSpans([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      const t0 = performance.now();
      const spans = await detectPersonsSlm(text);
      if (!cancelled) {
        setSlmSpans(spans);
        tick("slm", performance.now() - t0);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [text, slmEnabled, slmStatus?.ready, tick]);

  // ── Centrale PiM Evaluation Engine (Fase 2 slice 2) ─────────────────────
  // try.tsx houdt zich niet meer bezig met detect/anonymize/guard/decide/egress —
  // die logica leeft in @/lib/pim/engine. Deze UI leest alleen de engine-state.
  const engineConfig = useMemo(
    () => ({
      detectionSettings: coerceDetectionSettings(profileId),
      profileId,
      integrity,
    }),
    [profileId, integrity],
  );
  const engine = usePimEngine(engineConfig);
  const extraSpans = useMemo(() => (slmEnabled ? slmSpans : []), [slmEnabled, slmSpans]);
  // Synchroon in render — engine.evaluate is idempotent en engine bewaakt
  // zijn eigen state. useMemo garandeert dat `decision` op eerste render bestaat.
  useMemo(() => {
    const t0 = performance.now();
    engine.evaluate({
      text,
      mode,
      extraSpans,
      autoRepair: true,
      llmDraftText: llmDraft?.text ?? null,
    });
    const dur = performance.now() - t0;
    queueMicrotask(() => {
      tick("regex", dur);
      tick("lex", dur);
      tick("ctx", dur);
      tick("guard", dur);
      tick("repair", dur);
    });
  }, [engine, text, mode, extraSpans, llmDraft, tick]);

  // Voor UI-weergave vóór de eerste evaluate: veilige defaults.
  const signals = useMemo(
    () =>
      engine.state.signals ?? {
        directPii: [],
        contextualPii: [],
        riskScore: 0,
        riskLevel: "low" as const,
        reasons: [],
        ruleIds: [],
      },
    [engine.state.signals],
  );
  const decisionSignals = engine.state.decisionSignals ?? signals;
  const guard = useMemo(
    () => engine.state.guard ?? { status: "pass" as const, issues: [], mode },
    [engine.state.guard, mode],
  );
  const effectiveDraft = engine.state.draft ?? { text, mode, rawHadPii: false };
  const repaired = engine.state.repairApplied;
  const finalDraftText =
    engine.state.llmApplied && engine.state.initialDraft
      ? engine.state.initialDraft.text
      : effectiveDraft.text;
  const plainMap = engine.state.pseudoMapping;

  const sourceCounts = useMemo(() => {
    const counts = { regex: 0, lex: 0, slm: 0, ctx: 0 } as Record<
      "regex" | "lex" | "slm" | "ctx",
      number
    >;
    for (const s of [...signals.directPii, ...signals.contextualPii]) {
      counts[detectorSourceLabel(s.ruleId)]++;
    }
    return counts;
  }, [signals]);

  useEffect(() => {
    setRestored(null);
    if (mode !== "pseudonymous" || !plainMap || plainMap.size === 0) {
      setHandle((prev) => {
        if (prev) destroyContainer(prev);
        return null;
      });
      return;
    }
    let cancelled = false;
    (async () => {
      const h = await createMappingContainer(plainMap);
      if (cancelled) {
        destroyContainer(h);
        return;
      }
      setHandle((prev) => {
        if (prev) destroyContainer(prev);
        return h;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveDraft.text, mode, plainMap]);

  useEffect(() => {
    if (guard.status === "pass") return;
    const key = `${mode}::${guard.status}::${effectiveDraft.text}`;
    if (key === lastEnqueuedKey) return;
    setLastEnqueuedKey(key);
    enqueueReview({
      mode,
      riskLevel: signals.riskLevel,
      guardStatus: guard.status,
      issues: guard.issues,
      draftPreview: effectiveDraft.text,
    });
  }, [guard.status, guard.issues, effectiveDraft.text, mode, signals.riskLevel, lastEnqueuedKey]);

  useEffect(() => {
    setLlmDraft(null);
    setLlmStreamText("");
  }, [text, mode]);

  const llmAbortRef = useRef(false);
  const onTryLlmRewrite = async () => {
    setLlmStreaming(true);
    setLlmStreamText("");
    setLlmDraft(null);
    llmAbortRef.current = false;
    try {
      const r = await rewriteAnonymousDraftStream(finalDraftText, (_chunk, acc) => {
        if (llmAbortRef.current) return;
        setLlmStreamText(acc);
        tick("llm", 0);
      });
      if (r.usedLlm) setLlmDraft({ text: r.text, reason: r.reason });
    } finally {
      setLlmStreaming(false);
    }
  };

  // Beslissing voor huidige actie via engine (previewDecision) — géén egress.
  const decision = useMemo(() => {
    const t0 = performance.now();
    const d = engine.previewDecision(action);
    queueMicrotask(() => tick("decide", performance.now() - t0));
    return d;
  }, [engine, action, engine.state, tick]);

  const onAct = async () => {
    setEgress(null);
    setRestored(null);
    let payloadText = effectiveDraft.text;
    const ab = recordSubmission(text, signals);
    setAbuse(ab);
    if (ab.level === "block") {
      setEgress({ ok: false, msg: `Abuse-protectie BLOCK: ${ab.reasons.join("; ")}` });
      return;
    }
    if (action === "restore" && decision.verdict !== "BLOCK") {
      if (!handle) {
        setEgress({ ok: false, msg: "Geen mapping container — restore onmogelijk." });
        return;
      }
      payloadText = await restoreFromContainer(handle, effectiveDraft.text);
      setRestored(payloadText);
    }
    const outcome = await engine.requestAction({
      action,
      payloadText,
      payloadType: action === "restore" ? "restored" : undefined,
    });
    setEgress({ ok: outcome.executed, msg: outcome.reason });
    const d = outcome.decision;
    setAudit((a) =>
      [
        {
          ts: d.timestamp,
          action: d.action,
          mode: d.mode,
          verdict: d.verdict,
          reasonCode: d.reasonCode,
          ruleId: d.ruleId,
          riskLevel: d.riskLevel,
          policyVersion: d.policyVersion,
        },
        ...a,
      ].slice(0, 20),
    );
  };

  const draftDisplay = llmStreaming && llmStreamText ? llmStreamText : effectiveDraft.text;
  const totalSpans = signals.directPii.length + signals.contextualPii.length;

  // — Semantische pipeline-stappen: wat doet elke laag NU op deze input —
  const stepViews = useMemo<PipelineStepView[]>(() => {
    const direct = signals.directPii.length;
    const ctx = signals.contextualPii.length;
    const sentenceCount = Math.max(
      1,
      text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length,
    );
    const draftSnippet = (() => {
      const t = effectiveDraft.text.trim();
      return t.length > 90 ? t.slice(0, 88) + "…" : t;
    })();
    const decisionLine =
      decision.verdict === "ALLOW"
        ? `ALLOW: actie '${action}' is toegestaan.`
        : decision.verdict === "ALLOW_WITH_WARNING"
          ? `WAARSCHUWING: '${action}' mag, maar review aanbevolen.`
          : `BLOCK: '${action}' wordt tegengehouden.`;

    return [
      {
        id: "input",
        index: 1,
        title: "Tekst ingelezen",
        subtitle: `${text.length} tekens · ${sentenceCount} zin(nen)`,
        detail: `De tekst staat in het geheugen van deze browser-tab. Geen netwerkverkeer, geen logregel met inhoud. Vanaf hier doorloopt elk teken de detectoren van het profiel '${profile.label}'.`,
        status: text.trim().length === 0 ? "idle" : "ok",
        badge: `${text.length}c`,
        lastTickMs: 0,
        durationMs: 0,
      },
      {
        id: "regex",
        index: 2,
        title: "Patroon-detectie (regex)",
        subtitle: "BSN, IBAN, e-mail, telefoon, postcode",
        detail:
          sourceCounts.regex === 0
            ? "Geen harde identificerende patronen aangetroffen. Dit zegt nog niets over namen of context — daarvoor zijn de volgende lagen."
            : `${sourceCounts.regex} harde match(es) gevonden door regex-detectoren. Dit zijn de zwart-wit identifiers die altijd worden gemaskeerd, ongeacht context.`,
        status: sourceCounts.regex > 0 ? "warn" : "ok",
        badge: `${sourceCounts.regex}`,
        lastTickMs: 0,
        durationMs: 0,
      },
      {
        id: "lex",
        index: 3,
        title: "Lexicon NL · onderwijs",
        subtitle: "voornamen, organisaties, special-category woorden",
        detail:
          sourceCounts.lex === 0
            ? "Geen treffers in het Nederlandse onderwijslexicon. Veelvoorkomende voornamen, scholen en gevoelige categorieën (zorg, religie, etniciteit) staan in de woordenlijst."
            : `${sourceCounts.lex} treffer(s) in het lexicon. Naast namen kan dit ook special-category zijn (bv. medische termen), wat het risico verhoogt los van directe identifiers.`,
        status: sourceCounts.lex > 0 ? "found" : "ok",
        badge: `${sourceCounts.lex}`,
        lastTickMs: 0,
        durationMs: 0,
      },
      {
        id: "slm",
        index: 4,
        title: "Browser-NER (SLM)",
        subtitle: slmEnabled ? "lokaal AI-model voor namen" : "uitgeschakeld",
        detail: !profile.detectors.nerSlm
          ? "Dit profiel gebruikt geen SLM. Alleen regels + lexicon zijn actief."
          : !slmEnabled
            ? "De browser-AI staat uit. Activeer hierboven om óók namen te vangen die niet in het lexicon staan (bv. zeldzame familienamen). Eenmalige download ~180MB."
            : slmStatus?.loading
              ? `Model wordt geladen (${slmStatus.progress?.pct ?? 0}%). Zodra klaar verschijnen extra naam-spans hieronder.`
              : slmStatus?.ready
                ? `Lokaal NER-model actief op ${slmStatus.runtime?.toUpperCase() ?? "?"}. ${sourceCounts.slm} naam-entiteit(en) herkend bovenop regex/lexicon.`
                : slmStatus?.error
                  ? `Laden mislukt: ${slmStatus.error}. Klik 'opnieuw' bij Lokale modellen.`
                  : "Klaar om te activeren.",
        status: !profile.detectors.nerSlm
          ? "skip"
          : !slmEnabled
            ? "skip"
            : slmStatus?.error
              ? "block"
              : slmStatus?.ready
                ? sourceCounts.slm > 0
                  ? "found"
                  : "ok"
                : slmStatus?.loading
                  ? "found"
                  : "idle",
        badge: slmEnabled && slmStatus?.ready ? `${sourceCounts.slm}` : undefined,
        lastTickMs: 0,
        durationMs: 0,
      },
      {
        id: "ctx",
        index: 5,
        title: "Contextuele versterking",
        subtitle: "klas + naam, zorgsignaal + persoon, …",
        detail:
          ctx === 0
            ? "Geen contextuele combinaties gevonden. Contextdetectie kijkt of losse signalen samen herkenbaar worden (bv. 'Sophie' + 'groep 3' + 'juf Wim')."
            : `${ctx} contextueel signaal(en). Dit verhoogt de risicoscore zelfs als de individuele woorden onschuldig lijken — small-group identifiability is hier de zorg.`,
        status: ctx > 0 ? "warn" : "ok",
        badge: `${ctx}`,
        lastTickMs: 0,
        durationMs: 0,
      },
      {
        id: "repair",
        index: 6,
        title: "Auto-repair (rule-based)",
        subtitle:
          mode === "anonymous" ? "generaliseer residuele identifiers" : "n.v.t. in pseudonymous",
        detail:
          mode !== "anonymous"
            ? "Repair draait alleen in mode 'anonymous'. In pseudonymous worden tokens gezet i.p.v. weggeschreven."
            : repaired
              ? "Initiële draft was nog niet schoon — automatische generalisatieregels hebben restjes herschreven (bv. 'klas 4H2' → 'een bovenbouwklas')."
              : "Niet nodig — initiële anonimisering haalde alle harde issues weg.",
        status: mode !== "anonymous" ? "skip" : repaired ? "warn" : "ok",
        lastTickMs: 0,
        durationMs: 0,
      },
      {
        id: "guard",
        index: 7,
        title: "Draft Check Guard",
        subtitle: `status: ${guard.status}`,
        detail:
          guard.status === "pass"
            ? `Draft is gecertificeerd voor mode '${mode}'. Geen ruwe e-mail, BSN, IBAN of tokens uit de andere modus. Veilig om door te geven aan de beslislaag.`
            : guard.status === "repair"
              ? `Draft heeft nog ${guard.issues.length} issue(s): ${guard.issues.slice(0, 2).join("; ")}. ${llmDraft ? "Qwen-rewrite is toegepast." : "Auto-repair kon dit niet volledig oplossen — overweeg LLM-rewrite of handmatige edit."}`
              : `BLOK: ${guard.issues.length} kritiek issue(s) — ${guard.issues.slice(0, 2).join("; ")}. PIM zal géén uitgaande actie toestaan.`,
        status: guard.status === "pass" ? "ok" : guard.status === "repair" ? "warn" : "block",
        badge: guard.issues.length > 0 ? `${guard.issues.length}` : undefined,
        lastTickMs: 0,
        durationMs: 0,
      },
      {
        id: "decide",
        index: 8,
        title: "PIM-beslissing",
        subtitle: `${decision.verdict} · rule ${decision.ruleId}`,
        detail: `${decisionLine} Onderliggende reden: ${decision.reason} (code: ${decision.reasonCode}, policy v${decision.policyVersion}). De beslissing is deterministisch — zelfde input + profiel = zelfde uitkomst.`,
        status:
          decision.verdict === "ALLOW"
            ? "ok"
            : decision.verdict === "ALLOW_WITH_WARNING"
              ? "warn"
              : "block",
        badge: action,
        lastTickMs: 0,
        durationMs: 0,
      },
      {
        id: "llm",
        index: 9,
        title: "Qwen rewrite (optioneel)",
        subtitle: mode === "anonymous" ? "lokale LLM verzacht residuen" : "n.v.t. in pseudonymous",
        detail:
          mode !== "anonymous"
            ? "LLM-rewrite is bewust uitgeschakeld in pseudonymous: tokens mogen nooit aan een taalmodel worden gevoerd, zelfs niet lokaal."
            : llmStreaming
              ? "Qwen2.5 streamt nu een herschrijving in de browser…"
              : llmDraft
                ? `Rewrite toegepast: '${draftSnippet}'. Het resultaat ging opnieuw door Draft Check Guard.`
                : llmStatus?.ready
                  ? "Qwen is geladen — klik 'Rewrite' bij Geavanceerd om residuele herkenbaarheid te generaliseren."
                  : "Niet gebruikt. Activeer Qwen hierboven als je een natuurlijker geanonimiseerde tekst wilt.",
        status:
          mode !== "anonymous"
            ? "skip"
            : llmDraft
              ? "found"
              : llmStreaming
                ? "found"
                : llmStatus?.error
                  ? "warn"
                  : "idle",
        lastTickMs: 0,
        durationMs: 0,
      },
    ];
  }, [
    text,
    signals,
    sourceCounts,
    profile,
    slmEnabled,
    slmStatus,
    mode,
    repaired,
    guard,
    decision,
    action,
    llmDraft,
    llmStreaming,
    llmStatus,
    effectiveDraft.text,
  ]);

  const loadPreset = (p: Preset) => {
    setActivePreset(p);
    setText(p.text);
    setMode(p.mode);
    setAction(p.action);
    setEgress(null);
    setRestored(null);
  };

  // Unified alert strip — sort by severity
  const alerts: { kind: "block" | "warn" | "info"; title: string; body: string }[] = [];
  if (abuse && abuse.level === "block")
    alerts.push({ kind: "block", title: "Abuse-protectie BLOCK", body: abuse.reasons.join(" · ") });
  if (egress && !egress.ok)
    alerts.push({ kind: "block", title: "Egress geblokkeerd", body: egress.msg });
  if (violations.length > 0)
    alerts.push({
      kind: "warn",
      title: `Runtime hardening · ${violations.length} egress-poging(en)`,
      body: violations.slice(-1)[0] ?? "",
    });
  if (abuse && abuse.level === "throttle")
    alerts.push({
      kind: "warn",
      title: "Abuse-protectie THROTTLE",
      body: abuse.reasons.join(" · "),
    });
  if (egress && egress.ok)
    alerts.push({ kind: "info", title: "Egress uitgevoerd", body: egress.msg });

  return (
    <>
      <PageHero
        eyebrow="Expert lab · alle gates zichtbaar · lokaal"
        title={
          <>
            PiM <span className="text-primary">Expert lab</span>
          </>
        }
        description="Volledige pipeline met detector-profielen, NER, Qwen-rewrite, modelintegriteit en audit. Snelle test? Ga terug naar de startpagina."
      >
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium"
        >
          ← terug naar snelle test
        </Link>
      </PageHero>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 pb-32">
        {/* — Welkomstkaart (eerste bezoek) — */}
        {showWelcome && (
          <section className="mt-4 panel p-4 border-primary/40 bg-primary/5 relative">
            <button
              onClick={dismissWelcome}
              aria-label="Sluit uitleg"
              className="absolute top-2 right-2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-background/50"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="font-mono text-[10px] uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Info className="h-3 w-3" /> Eerste keer hier?
            </div>
            <h2 className="font-display font-bold text-base mt-1 mb-2">Wat doet deze demo?</h2>
            <p className="text-[12px] text-foreground/85 leading-relaxed">
              PiM analyseert onderwijstekst <strong>volledig in je browser</strong> en bepaalt of
              die veilig naar een externe AI (zoals ChatGPT) gestuurd mag worden. Geen tekst verlaat
              je apparaat zonder expliciete toestemming.
            </p>
            <ol className="mt-3 space-y-1.5 text-[12px] text-foreground/85">
              <li>
                <span className="font-mono text-primary mr-1.5">1.</span>Kies hieronder een scenario
                (of plak je eigen tekst).
              </li>
              <li>
                <span className="font-mono text-primary mr-1.5">2.</span>De pipeline detecteert
                namen, BSN, adressen, contextuele PII.
              </li>
              <li>
                <span className="font-mono text-primary mr-1.5">3.</span>De verdict-balk onderaan
                toont <em>ALLOW</em>, <em>WARNING</em> of <em>BLOCK</em>.
              </li>
            </ol>
            <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground/80">Tip:</strong> activeer hieronder de twee lokale
              modellen (NER ~180MB, Qwen rewrite ~400MB). Eenmalige download, daarna gecached en
              volledig offline.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={dismissWelcome}
                className="text-[11px] font-mono px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-semibold"
              >
                Begrepen, ga verder
              </button>
              <Link
                to="/scenarios"
                className="text-[11px] font-mono px-3 py-1.5 rounded-md border border-border/60 text-foreground/80 hover:bg-background/50"
              >
                Bekijk scenario's
              </Link>
            </div>
          </section>
        )}

        {/* — Lokale modellen statusbalk — altijd zichtbaar — */}
        <section className="mt-4 panel p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="font-mono text-[10px] uppercase tracking-wider text-foreground/70 flex items-center gap-1.5">
              <Cpu className="h-3 w-3" /> Lokale modellen · draaien in je browser
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">geen egress</span>
          </div>
          {/* NER-variant keuze — compact (standaard) vs. volledig (hogere recall) */}
          <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-border/40 bg-background/30 px-2.5 py-1.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-foreground/60">
              NER-model
            </div>
            <div className="inline-flex rounded-md border border-border/50 overflow-hidden text-[11px]">
              {(Object.keys(NER_VARIANTS) as NerVariantKey[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => selectNerVariant(v)}
                  aria-pressed={nerVariant === v}
                  title={NER_VARIANTS[v].notes}
                  className={`px-2.5 py-1 transition-colors ${
                    nerVariant === v
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-accent/40"
                  }`}
                >
                  {NER_VARIANTS[v].label} · {NER_VARIANTS[v].sizeLabel}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <ModelStatusCard
              name="NER · naamherkenning"
              sizeLabel={NER_VARIANTS[nerVariant].sizeLabel}
              tone="cyan"
              available={profile.detectors.nerSlm}
              status={
                !profile.detectors.nerSlm
                  ? "disabled"
                  : slmStatus?.ready
                    ? "ready"
                    : slmStatus?.loading
                      ? "loading"
                      : slmStatus?.error
                        ? "error"
                        : "idle"
              }
              runtime={slmStatus?.runtime ?? null}
              progressPct={slmStatus?.progress?.pct}
              progressLabel={slmStatus?.progress?.file}
              errorMsg={slmStatus?.error ?? null}
              idleHint="Detecteert namen/organisaties buiten de regex-lijsten."
              loadingHint="Eenmalige download. Bij volgend bezoek direct actief."
              readyHint="Actief — geen tekst verlaat je apparaat."
              onActivate={activateSlm}
              activateLabel="Activeer NER"
            />
            <ModelStatusCard
              name="Qwen2.5 · rewrite"
              sizeLabel="~400MB"
              tone="purple"
              available={mode === "anonymous"}
              status={
                mode !== "anonymous"
                  ? "disabled"
                  : llmStatus?.ready
                    ? "ready"
                    : llmStatus?.loading
                      ? "loading"
                      : llmStatus?.error
                        ? "error"
                        : "idle"
              }
              runtime={null}
              progressPct={llmStatus?.progress?.pct}
              progressLabel={llmStatus?.progress?.text}
              errorMsg={llmStatus?.error ?? null}
              idleHint="Herschrijft anonieme drafts om residuele herkenbaarheid te generaliseren."
              loadingHint="Grotere download. Pas op via mobiele data."
              readyHint="Actief — gebruik de 'Rewrite'-knop in Geavanceerd."
              disabledHint="Alleen in mode anonymous."
              onActivate={() => {
                loadRewriteLlm().catch(() => {});
              }}
              activateLabel="Download Qwen"
            />
          </div>
        </section>

        {/* — Alerts (één strip) — */}
        {alerts.length > 0 && (
          <div className="mt-4 space-y-2">
            {alerts.map((a, i) => (
              <div
                key={i}
                className={`panel p-3 flex items-start gap-2.5 ${
                  a.kind === "block"
                    ? "border-red/60 bg-red/5"
                    : a.kind === "warn"
                      ? "border-orange/50 bg-orange/5"
                      : "border-green/40 bg-green/5"
                }`}
              >
                {a.kind === "block" ? (
                  <ShieldX className="h-4 w-4 text-red flex-shrink-0 mt-0.5" />
                ) : a.kind === "warn" ? (
                  <AlertTriangle className="h-4 w-4 text-orange flex-shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-green flex-shrink-0 mt-0.5" />
                )}
                <div className="text-xs min-w-0 flex-1">
                  <div
                    className={`font-mono uppercase tracking-wider text-[10px] mb-0.5 ${
                      a.kind === "block"
                        ? "text-red"
                        : a.kind === "warn"
                          ? "text-orange"
                          : "text-green"
                    }`}
                  >
                    {a.title}
                  </div>
                  <div className="text-foreground/85 break-words">{a.body}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* — Scenario launcher — */}
        <section className="mt-5 panel p-4">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> Start
              </div>
              <h2 className="font-display font-bold text-sm">Kies een vertrekpunt</h2>
            </div>
            <Link
              to="/scenarios"
              className="text-[11px] font-mono text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
            >
              Alle scenarios <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Drie demo's
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {STARTERS.map((p) => (
                  <PresetChip
                    key={p.id}
                    preset={p}
                    active={activePreset.id === p.id}
                    onClick={() => loadPreset(p)}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Scenarios uit de pipeline
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SCENARIO_PRESETS.map((p) => (
                  <PresetChip
                    key={p.id}
                    preset={p}
                    active={activePreset.id === p.id}
                    onClick={() => loadPreset(p)}
                    compact
                  />
                ))}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-border/30">
              <span className="text-foreground/80">{activePreset.label}</span> — {activePreset.hint}
              {activePreset.scenarioId && (
                <>
                  {" "}
                  ·{" "}
                  <Link
                    to="/scenarios"
                    hash={activePreset.scenarioId}
                    className="text-primary hover:underline"
                  >
                    lees scenario
                  </Link>
                </>
              )}
            </p>
          </div>
        </section>

        {/* — Sectie 1: Input — */}
        <Section
          title="Onderwijsfragment"
          eyebrow="01 · Input"
          defaultOpen
          interactive="do"
          hint="Plak of typ tekst — of kies hierboven een scenario."
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            className="w-full font-mono text-sm bg-background/60 border border-border/60 rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Plak hier docentnotitie, leerlingtekst, dossierfragment..."
          />
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="font-mono">
              {text.length} tekens · {totalSpans} spans
            </span>
            <span className="font-mono">
              profiel: <span className="text-foreground/80">{profile.label}</span>
            </span>
          </div>
        </Section>

        {/* — Sectie 2: Detectie & Draft — */}
        <Section
          title="Detectie & draft"
          eyebrow="02 · Verwerking"
          defaultOpen
          interactive="watch"
          hint="PiM toont live wat het vindt en hoe de draft eruit ziet."
        >
          <RiskBanner level={signals.riskLevel} reasons={signals.reasons} />

          {totalSpans > 0 && (
            <div className="mt-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Spans
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[...signals.directPii, ...signals.contextualPii].map((s, i) => (
                  <span
                    key={i}
                    className={`font-mono text-[11px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                      s.contextual ? "border-cyan/60 bg-cyan/10" : "border-orange/60 bg-orange/10"
                    }`}
                  >
                    <span
                      className={`uppercase text-[9px] font-semibold ${s.contextual ? "text-cyan" : "text-orange"}`}
                    >
                      {s.category}
                    </span>
                    <span className="text-foreground/90">
                      {s.text.length > 22 ? s.text.slice(0, 20) + "…" : s.text}
                    </span>
                  </span>
                ))}
              </div>
              <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                regex {sourceCounts.regex} · lex {sourceCounts.lex} · slm {sourceCounts.slm} · ctx{" "}
                {sourceCounts.ctx}
              </div>
            </div>
          )}

          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
              <div className="font-mono text-[10px] uppercase tracking-wider text-purple">
                Processed draft · {mode}
              </div>
              <div className="flex items-center gap-2">
                {llmStreaming && (
                  <span className="font-mono text-[10px] text-purple">streaming…</span>
                )}
                {repaired && !llmDraft && (
                  <span className="font-mono text-[10px] text-orange inline-flex items-center gap-1">
                    <Wrench className="h-3 w-3" /> auto-repair
                  </span>
                )}
                {llmDraft && (
                  <span className="font-mono text-[10px] text-purple">Qwen rewrite</span>
                )}
              </div>
            </div>
            <AnonymizedText text={draftDisplay} streaming={llmStreaming} />
            {guard.issues.length > 0 && (
              <ul className="mt-2 text-xs text-orange space-y-0.5">
                {guard.issues.map((i, k) => (
                  <li key={k}>⚠ {i}</li>
                ))}
              </ul>
            )}
          </div>

          {handle && (
            <div className="mt-3 panel p-2.5 border-cyan/40 bg-cyan/5">
              <div className="flex items-center gap-2 font-mono text-[11px] text-cyan">
                <Lock className="h-3 w-3" /> Mapping container · {handle.tokenCount} tokens ·
                AES-GCM
              </div>
            </div>
          )}
          {restored !== null && (
            <div className="mt-2 panel p-2.5 border-cyan/40">
              <div className="font-mono text-[10px] text-cyan uppercase tracking-wider mb-1">
                Restored (lokaal)
              </div>
              <pre className="font-mono text-[11px] whitespace-pre-wrap text-foreground/90">
                {restored}
              </pre>
            </div>
          )}
        </Section>

        {/* — Sectie 3: Mode & Action — */}
        <Section
          title="Mode & actie"
          eyebrow="03 · Bestemming"
          defaultOpen
          interactive="do"
          hint="Kies mode (anoniem of pseudoniem) en wat je ermee wil doen. Daarna 'Voer uit' onderaan."
        >
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {(["anonymous", "pseudonymous"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all border ${
                  mode === m
                    ? m === "anonymous"
                      ? "bg-purple/15 border-purple text-purple"
                      : "bg-cyan/15 border-cyan text-cyan"
                    : "bg-card/40 border-border/60 text-muted-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.id}
                  onClick={() => setAction(a.id)}
                  className={`flex flex-col items-center gap-1 px-1.5 py-2 rounded-lg text-[10px] font-medium border transition-all ${
                    action === a.id
                      ? "bg-primary/15 border-primary text-primary"
                      : "bg-card/40 border-border/50 text-muted-foreground"
                  }`}
                  title={a.label}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="leading-none">{a.label}</span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* — Sectie 4: Live pipeline — */}
        <Section
          title="Live pipeline"
          eyebrow="04 · Wat doet elke laag?"
          defaultOpen
          interactive="watch"
          hint="Negen lagen, volgordelijk. Tik op een stap voor uitleg op jouw tekst."
        >
          <div className="flex items-center justify-center mb-3">
            <RiskGauge score={decisionSignals.riskScore} level={decisionSignals.riskLevel} />
          </div>
          <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
            Negen lagen draaien volgordelijk in je browser. Tik op een stap voor de uitleg in klare
            taal — gebaseerd op wat de pipeline op <em>jouw</em> tekst aantrof.
          </p>
          <PipelineTimeline steps={stepViews} heartbeats={steps} />
        </Section>

        {/* — Sectie 5: Geavanceerd — */}
        <Section
          title="Geavanceerd"
          eyebrow="05 · Profiel · SLM · LLM · audit"
          interactive="do"
          hint="Wissel pipeline-profiel, activeer NER/Qwen, bekijk audit-log."
        >
          {/* Profile */}
          <div className="mb-4">
            <div className="font-mono text-[10px] uppercase tracking-wider text-primary mb-1.5">
              Pipeline profile
            </div>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {Object.values(PIPELINE_PROFILES).map((p) => {
                const selectable = RELEASE_1_PROFILES.includes(p.id);
                const active = profileId === p.id;
                return (
                  <button
                    key={p.id}
                    disabled={!selectable}
                    onClick={() => selectable && setProfileId(p.id)}
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                      active
                        ? "bg-primary/20 border-primary text-primary"
                        : selectable
                          ? "bg-card/40 border-border/60 text-foreground/80"
                          : "bg-card/20 border-border/30 text-muted-foreground/50 cursor-not-allowed"
                    }`}
                    title={p.description}
                  >
                    {p.label}
                    {!selectable && " · design"}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {profile.description}
            </p>
            <div className="mt-1 font-mono text-[10px] text-muted-foreground">
              {activeDetectorIds.length} detectors · egress {profile.egressPolicy}
            </div>
          </div>

          {/* SLM */}
          <div className="mb-4 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono text-[10px] uppercase tracking-wider text-cyan flex items-center gap-1">
                <Cpu className="h-3 w-3" /> Browser SLM (NER)
              </div>
              <button
                onClick={() => profile.detectors.nerSlm && setSlmEnabled((v) => !v)}
                disabled={!profile.detectors.nerSlm}
                className={`relative h-5 w-9 rounded-full ${
                  !profile.detectors.nerSlm
                    ? "bg-card border border-border/40 opacity-40"
                    : slmEnabled
                      ? "bg-cyan"
                      : "bg-card border border-border"
                }`}
                aria-label="Toggle SLM"
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-transform ${slmEnabled ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </button>
            </div>
            {!profile.detectors.nerSlm && (
              <p className="text-[11px] text-orange">Profiel {profile.id} bevat geen SLM.</p>
            )}
            {slmEnabled && slmStatus && (
              <div className="space-y-1 text-[11px] font-mono">
                <div className="flex items-center gap-1.5">
                  {slmStatus.loading && <Loader2 className="h-3 w-3 animate-spin text-cyan" />}
                  {slmStatus.ready && <ShieldCheck className="h-3 w-3 text-green" />}
                  {slmStatus.error && <ShieldX className="h-3 w-3 text-red" />}
                  <span
                    className={
                      slmStatus.ready ? "text-green" : slmStatus.error ? "text-red" : "text-cyan"
                    }
                  >
                    {slmStatus.ready
                      ? `READY · ${slmStatus.runtime?.toUpperCase()}`
                      : slmStatus.error
                        ? "ERROR"
                        : slmStatus.loading
                          ? "LOADING…"
                          : "IDLE"}
                  </span>
                </div>
                {slmStatus.progress && (
                  <div className="h-1.5 rounded-full bg-card overflow-hidden border border-border/40">
                    <div
                      className="h-full bg-cyan transition-all"
                      style={{ width: `${slmStatus.progress.pct ?? 0}%` }}
                    />
                  </div>
                )}
                {slmStatus.ready && (
                  <p className="text-muted-foreground">{slmSpans.length} SLM-entiteit(en)</p>
                )}
              </div>
            )}
          </div>

          {/* LLM rewrite */}
          {mode === "anonymous" && (
            <div className="mb-4 pt-3 border-t border-border/40">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="font-mono text-[10px] uppercase tracking-wider text-purple">
                  LLM rewrite · Qwen2.5
                </div>
                <button
                  onClick={onTryLlmRewrite}
                  disabled={llmStreaming || (llmStatus?.loading ?? false)}
                  className="text-[11px] font-mono px-2 py-1 rounded-md border border-purple/40 text-purple disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {(llmStreaming || llmStatus?.loading) && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {llmDraft ? "Opnieuw" : "Rewrite"}
                </button>
              </div>
              {llmStatus?.progress && (
                <div className="space-y-1">
                  <div className="font-mono text-[10px] text-muted-foreground truncate">
                    {llmStatus.progress.text}
                  </div>
                  <div className="h-1.5 rounded-full bg-card overflow-hidden border border-border/40">
                    <div
                      className="h-full bg-purple transition-all"
                      style={{ width: `${llmStatus.progress.pct ?? 0}%` }}
                    />
                  </div>
                </div>
              )}
              {llmDraft && (
                <p className="mt-1 text-[10px] text-purple font-mono">{llmDraft.reason}</p>
              )}
            </div>
          )}

          {/* Integrity */}
          {integrity.length > 0 && (
            <div className="mb-4 pt-3 border-t border-border/40">
              <div className="font-mono text-[10px] uppercase tracking-wider text-cyan mb-1.5">
                Model integrity
              </div>
              {integrity.map((rec) => (
                <div key={rec.key} className="font-mono text-[10px] flex items-start gap-1.5">
                  <span
                    className={
                      rec.status === "verified"
                        ? "text-green"
                        : rec.status === "placeholder"
                          ? "text-orange"
                          : rec.status === "mismatch"
                            ? "text-red"
                            : "text-muted-foreground"
                    }
                  >
                    ●
                  </span>
                  <div className="min-w-0">
                    <div className="text-foreground/80 truncate">{rec.modelId}</div>
                    <div className="text-muted-foreground">{rec.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Audit */}
          <div className="pt-3 border-t border-border/40">
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono text-[10px] uppercase tracking-wider text-green">
                Audit feed (metadata)
              </div>
              {audit.length > 0 && (
                <button onClick={() => setAudit([])} className="text-[10px] text-muted-foreground">
                  Wis
                </button>
              )}
            </div>
            {audit.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Geen events.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-auto">
                {audit.map((e, i) => (
                  <div
                    key={i}
                    className="font-mono text-[10px] p-1.5 rounded bg-background/60 border border-border/50 flex items-center gap-2"
                  >
                    <span
                      className={
                        e.verdict === "ALLOW"
                          ? "text-green"
                          : e.verdict === "ALLOW_WITH_WARNING"
                            ? "text-orange"
                            : "text-red"
                      }
                    >
                      {e.verdict}
                    </span>
                    <span className="text-foreground/85 truncate">
                      {e.action} · {e.mode} · {e.ruleId}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* — Sectie 6: Review queue — */}
        <Section
          title={`Review queue${reviewItems.length ? ` · ${reviewItems.length}` : ""}`}
          eyebrow="06 · Menselijke check"
          interactive="watch"
          hint="Items met lage zekerheid komen hier voor menselijke triage."
        >
          <p className="text-[11px] text-muted-foreground mb-2">
            Alleen 'repair' of 'fail'. Inhoud blijft lokaal.
          </p>
          {reviewItems.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Queue is leeg.</p>
          ) : (
            <>
              <button
                onClick={() => clearReviewQueue()}
                className="mb-2 text-[10px] font-mono text-muted-foreground"
              >
                Wis queue
              </button>
              <ul className="space-y-2">
                {reviewItems
                  .slice(-5)
                  .reverse()
                  .map((it) => (
                    <li
                      key={it.id}
                      className={`p-2 rounded-lg border bg-background/60 ${
                        it.resolved
                          ? "border-green/30 opacity-60"
                          : it.guardStatus === "fail"
                            ? "border-red/40"
                            : "border-orange/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap font-mono text-[10px]">
                        <span className={it.guardStatus === "fail" ? "text-red" : "text-orange"}>
                          ● {it.guardStatus}
                        </span>
                        <span className="text-muted-foreground">
                          {it.mode} · {it.riskLevel} · {new Date(it.ts).toLocaleTimeString()}
                        </span>
                        {!it.resolved && (
                          <button
                            onClick={() => resolveReview(it.id)}
                            className="text-green inline-flex items-center gap-0.5"
                          >
                            <Check className="h-3 w-3" />
                            Resolve
                          </button>
                        )}
                      </div>
                      <pre className="font-mono text-[10px] whitespace-pre-wrap text-foreground/85 bg-card/40 rounded p-1.5 max-h-24 overflow-auto">
                        {it.draftPreview}
                      </pre>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </Section>
      </div>

      {/* — Sticky verdict bar — */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-2.5">
          <div className="flex items-center gap-2">
            <VerdictPill verdict={decision.verdict} />
            <span
              className={`hidden sm:inline font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                guard.status === "pass"
                  ? "border-green/40 text-green"
                  : guard.status === "repair"
                    ? "border-orange/40 text-orange"
                    : "border-red/50 text-red"
              }`}
            >
              guard {guard.status}
            </span>
            <span
              className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                decisionSignals.riskLevel === "low"
                  ? "border-green/40 text-green"
                  : decisionSignals.riskLevel === "medium"
                    ? "border-orange/40 text-orange"
                    : "border-red/50 text-red"
              }`}
            >
              {decisionSignals.riskLevel}
            </span>
            <div className="flex-1" />
            <button
              onClick={() => setVerdictOpen((v) => !v)}
              className="text-[10px] font-mono text-muted-foreground px-2 py-1 rounded hover:text-foreground"
            >
              {verdictOpen ? "verberg" : "details"}
            </button>
            <button
              onClick={onAct}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 inline-flex items-center gap-1"
            >
              <Shield className="h-3 w-3" /> Voer uit
            </button>
          </div>
          {verdictOpen && (
            <div className="mt-2 pt-2 border-t border-border/40 space-y-1 text-[11px]">
              <div className="text-foreground/85">{decision.reason}</div>
              <div className="font-mono text-[10px] text-muted-foreground">
                rule {decision.ruleId} · code {decision.reasonCode}
              </div>
              {decision.flag && (
                <div className="font-mono text-[10px] text-primary truncate">
                  flag: {decision.flag}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Section({
  title,
  eyebrow,
  defaultOpen,
  hint,
  interactive,
  children,
}: {
  title: string;
  eyebrow: string;
  defaultOpen?: boolean;
  hint?: string;
  interactive?: "do" | "watch";
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="panel p-0 mt-3 group overflow-hidden">
      <summary className="cursor-pointer list-none flex items-center justify-between gap-2 p-4 hover:bg-accent/20">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {eyebrow}
            </div>
            {interactive && (
              <span
                className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  interactive === "do"
                    ? "bg-primary/15 text-primary border border-primary/40"
                    : "bg-card/40 text-muted-foreground border border-border/50"
                }`}
              >
                {interactive === "do" ? "jij doet" : "kijk mee"}
              </span>
            )}
          </div>
          <div className="font-display font-bold text-sm">{title}</div>
          {hint && (
            <div className="text-[11px] text-muted-foreground leading-snug mt-0.5">{hint}</div>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90 flex-shrink-0" />
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

function PresetChip({
  preset,
  active,
  onClick,
  compact,
}: {
  preset: Preset;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const toneMap: Record<Preset["tone"], string> = {
    green: "border-green/40 text-green hover:bg-green/10",
    orange: "border-orange/40 text-orange hover:bg-orange/10",
    red: "border-red/50 text-red hover:bg-red/10",
    cyan: "border-cyan/40 text-cyan hover:bg-cyan/10",
    purple: "border-purple/40 text-purple hover:bg-purple/10",
  };
  const activeMap: Record<Preset["tone"], string> = {
    green: "bg-green/15 border-green text-green",
    orange: "bg-orange/15 border-orange text-orange",
    red: "bg-red/15 border-red text-red",
    cyan: "bg-cyan/15 border-cyan text-cyan",
    purple: "bg-purple/15 border-purple text-purple",
  };
  return (
    <button
      onClick={onClick}
      className={`text-left font-mono text-[11px] ${compact ? "px-2.5 py-1 rounded-full" : "px-3 py-2 rounded-lg"} border transition-colors ${active ? activeMap[preset.tone] : toneMap[preset.tone] + " bg-card/40"}`}
    >
      {preset.label}
    </button>
  );
}

function VerdictPill({ verdict }: { verdict: Verdict }) {
  const cfg = {
    ALLOW: { Icon: ShieldCheck, klass: "text-green border-green/50 bg-green/10" },
    ALLOW_WITH_WARNING: { Icon: ShieldAlert, klass: "text-orange border-orange/50 bg-orange/10" },
    BLOCK: { Icon: ShieldX, klass: "text-red border-red/60 bg-red/10" },
  }[verdict];
  const { Icon } = cfg;
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.klass}`}
    >
      <Icon className="h-3 w-3" />
      {verdict}
    </span>
  );
}

type ModelStatusKind = "idle" | "loading" | "ready" | "error" | "disabled";
function ModelStatusCard(props: {
  name: string;
  sizeLabel: string;
  tone: "cyan" | "purple";
  available: boolean;
  status: ModelStatusKind;
  runtime: "webgpu" | "wasm" | null;
  progressPct?: number;
  progressLabel?: string;
  errorMsg: string | null;
  idleHint: string;
  loadingHint: string;
  readyHint: string;
  disabledHint?: string;
  onActivate: () => void;
  activateLabel: string;
}) {
  const { tone, status } = props;
  const loadingBorder =
    tone === "cyan" ? "border-cyan/40 bg-cyan/5" : "border-purple/40 bg-purple/5";
  const loadingBadge =
    tone === "cyan" ? "border-cyan/50 text-cyan" : "border-purple/50 text-purple";
  const loadingBar = tone === "cyan" ? "bg-cyan" : "bg-purple";
  const actBtn = tone === "cyan" ? "bg-cyan text-background" : "bg-purple text-background";
  const spinCls = tone === "cyan" ? "text-cyan" : "text-purple";
  const borderCls =
    status === "ready"
      ? "border-green/40 bg-green/5"
      : status === "loading"
        ? loadingBorder
        : status === "error"
          ? "border-red/50 bg-red/5"
          : status === "disabled"
            ? "border-border/40 opacity-70"
            : "border-orange/40 bg-orange/5";
  const badgeCls =
    status === "ready"
      ? "border-green/50 text-green"
      : status === "loading"
        ? loadingBadge
        : status === "error"
          ? "border-red/50 text-red"
          : status === "disabled"
            ? "border-border/60 text-muted-foreground"
            : "border-orange/50 text-orange";
  const badgeLabel =
    status === "disabled"
      ? "uit"
      : status === "ready"
        ? `ACTIEF${props.runtime ? " · " + props.runtime.toUpperCase() : ""}`
        : status === "loading"
          ? `LADEN ${props.progressPct != null ? Math.round(props.progressPct) + "%" : "…"}`
          : status === "error"
            ? "FOUT"
            : "niet geladen";
  const body =
    status === "ready"
      ? props.readyHint
      : status === "loading"
        ? props.loadingHint
        : status === "error"
          ? `Laden mislukt: ${props.errorMsg ?? "onbekende fout"}.`
          : status === "disabled"
            ? (props.disabledHint ?? "Niet beschikbaar in huidig profiel.")
            : props.idleHint;
  return (
    <div className={`p-2.5 rounded-lg border ${borderCls} flex flex-col gap-2`}>
      <div className="flex items-center justify-between gap-2">
        <div className="font-mono text-[11px] font-semibold text-foreground/90 truncate">
          {props.name}
        </div>
        <span
          className={`font-mono text-[9px] px-1.5 py-0.5 rounded-full border ${badgeCls} flex-shrink-0`}
        >
          {badgeLabel}
        </span>
      </div>
      <p className="text-[11px] text-foreground/80 leading-snug">{body}</p>
      {status === "loading" && (
        <div className="space-y-1">
          {props.progressLabel && (
            <div className="font-mono text-[9px] text-muted-foreground truncate">
              {props.progressLabel}
            </div>
          )}
          <div className="h-1.5 rounded-full bg-card overflow-hidden border border-border/40">
            <div
              className={`h-full transition-all ${loadingBar}`}
              style={{ width: `${props.progressPct ?? 0}%` }}
            />
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 mt-auto pt-1">
        <span className="font-mono text-[10px] text-muted-foreground">
          download {props.sizeLabel}
        </span>
        {status === "idle" && props.available && (
          <button
            onClick={props.onActivate}
            className={`px-2.5 py-1 rounded-md font-semibold text-[10px] inline-flex items-center gap-1 hover:opacity-90 ${actBtn}`}
          >
            <Zap className="h-3 w-3" /> {props.activateLabel}
          </button>
        )}
        {status === "loading" && <Loader2 className={`h-3.5 w-3.5 animate-spin ${spinCls}`} />}
        {status === "ready" && <ShieldCheck className="h-3.5 w-3.5 text-green" />}
        {status === "error" && (
          <button
            onClick={props.onActivate}
            className="px-2.5 py-1 rounded-md border border-red/50 text-red font-mono text-[10px]"
          >
            opnieuw
          </button>
        )}
      </div>
    </div>
  );
}
