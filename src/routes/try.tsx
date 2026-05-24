import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHero } from "@/components/pim/PageHero";
import { RiskGauge } from "@/components/pim/RiskGauge";
import { PipelineTimeline } from "@/components/pim/PipelineTimeline";
import { AnonymizedText } from "@/components/pim/AnonymizedText";
import { RiskBanner } from "@/components/pim/RiskBanner";
import { usePipelineHeartbeat, type StepId } from "@/hooks/usePipelineHeartbeat";
import {
  computeSignals, anonymize, pseudonymize, draftCheck, decide, executeAction,
  createMappingContainer, restoreFromContainer, destroyContainer,
  installRuntimeHardening, onViolations,
  detectPersonsSlm, loadNerSlm, onNerStatus, type NerStatus,
  PIPELINE_PROFILES, RELEASE_1_PROFILES, DEFAULT_PROFILE, type PipelineProfileId,
  onModelIntegrity, type ModelIntegrityRecord,
  repairAnonymousDraft,
  activeDetectorsFor,
  detectorSourceLabel,
  enqueueReview, onReviewQueue, resolveReview, clearReviewQueue, type ReviewItem,
  recordSubmission, type AbuseSignal,
  rewriteAnonymousDraftStream, onRewriteStatus, type RewriteStatus,
  type Mode, type Action, type Verdict, type AuditEvent, type MappingHandle,
  type PiiSpan,
} from "@/lib/pim";
import {
  Shield, ShieldAlert, ShieldCheck, ShieldX, Copy, Eye, Save, RotateCcw, Send, Download, Printer, Share2,
  Lock, AlertTriangle, Cpu, Loader2, Wrench, Check, ChevronRight, Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/try")({
  head: () => ({
    meta: [
      { title: "Try-it — Project PiM" },
      { name: "description", content: "Test de PIM privacy pipeline live op echte tekst. Detectie, mapping, egress guard — alles lokaal in je browser." },
      { property: "og:title", content: "Try Project PiM live" },
      { property: "og:description", content: "Live PIM privacy pipeline — alles lokaal." },
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
    hint: "Geen PII — pipeline geeft direct groen licht.",
    text: "Korte aantekening voor de teamvergadering: leerlingen vinden de nieuwe rekenmethode prettiger werken dan de oude. Goede stof voor de bouwbijeenkomst van volgende week.",
    mode: "anonymous",
    action: "display",
  },
  {
    id: "starter-medium",
    label: "Repair · contextuele PII",
    tone: "orange",
    hint: "Namen + klas — auto-repair generaliseert vóór egress.",
    text: "Mentorgesprek met Tom de Vries (4H2): hij wil meer uitleg over de PTA-deadlines. Ouders zijn op de hoogte en steunen het plan.",
    mode: "anonymous",
    action: "copy",
  },
  {
    id: "starter-heavy",
    label: "Block · directe PII",
    tone: "red",
    hint: "BSN, e-mail, adres — egress wordt geblokkeerd.",
    text: "Notitie zorgcoördinator over Sarah Jansen (groep 6), basisschool De Wilg. Vader bereikbaar op 06-12345678, mail jansen@example.com. Postcode 3511AB, Bredestraat 12. BSN 123456782.",
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
    hint: "Leerling-prompt richting ChatGPT. PiM filtert vóór de fetch.",
    text: "Ik heb ADHD en zit in 3vmbo bij meester Jansen op het Stedelijk Lyceum. Kun je me uitleggen hoe ik mijn boekverslag van 'Spijt!' beter kan opbouwen? Mijn naam is Yusuf el-Amrani.",
    mode: "anonymous",
    action: "send_external_ai",
  },
  {
    id: "rag-school",
    label: "RAG schoolbeleid",
    tone: "purple",
    scenarioId: "rag-school",
    hint: "Ingest in vector-store — pseudonieme tokens, mapping AES-GCM.",
    text: "Casus 2024: leerling Lisa Bakker (klas 2havo, dyslexie) kreeg extra tijd na overleg met IB'er M. de Groot. Vergelijkbare aanpak werd vorig jaar gebruikt bij Tariq, klas 2A.",
    mode: "pseudonymous",
    action: "save_local",
  },
  {
    id: "feedback",
    label: "Feedback op essay",
    tone: "green",
    scenarioId: "feedback",
    hint: "Essay-upload met naam in de openingszin.",
    text: "Mijn naam is Yusuf el-Amrani, klas 4H2, en mijn vader werkt in de zorg. In dit essay onderzoek ik of sociale media de concentratie van jongeren beïnvloedt.",
    mode: "anonymous",
    action: "display",
  },
  {
    id: "lvs-trigger",
    label: "LVS → risico-classifier",
    tone: "orange",
    scenarioId: "lvs-trigger",
    hint: "Nightly export — pseudonymiseer leerling-features.",
    text: "Leerling 4582193 (klas 3V): cijferdip wiskunde van 7.2 naar 4.8 in twee periodes, verzuim 14 dagen, zorgvlag actief sinds 02-09-2025.",
    mode: "pseudonymous",
    action: "send_external_ai",
  },
  {
    id: "chatbot-ouders",
    label: "Ouder-chatbot",
    tone: "cyan",
    scenarioId: "chatbot-ouders",
    hint: "Inkomende ouder-vraag — anonymiseer voordat LLM antwoordt.",
    text: "Hoe gaat het met Sophie in groep 3 bij juf Wim? Ik maak me zorgen omdat ze de laatste weken erg stil is en haar broertje Lucas (groep 5) zegt dat ze gepest wordt.",
    mode: "anonymous",
    action: "send_external_ai",
  },
  {
    id: "rapport-rewrite",
    label: "Gespreksverslag",
    tone: "purple",
    scenarioId: "rapport-rewrite",
    hint: "Dictaat → rewrite. Lokale STT + lokale Qwen.",
    text: "Verslag MDO 14-03: Tariq el-Amrani (2A) blijft worstelen met faalangst, medicatie ritalin loopt door, gezinssituatie sinds scheiding ouders complex. Klasgenoot Sophie ondersteunt actief.",
    mode: "anonymous",
    action: "save_local",
  },
];

const ACTIONS: { id: Action; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "display", label: "Display", icon: Eye },
  { id: "copy", label: "Copy", icon: Copy },
  { id: "save_local", label: "Save", icon: Save },
  { id: "restore", label: "Restore", icon: RotateCcw },
  { id: "export_file", label: "Export", icon: Download },
  { id: "send_external_ai", label: "Send AI", icon: Send },
  { id: "print", label: "Print", icon: Printer },
  { id: "share", label: "Share", icon: Share2 },
];

const STEP_IDS: StepId[] = ["input", "regex", "lex", "slm", "ctx", "repair", "guard", "decide", "llm"];

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

  const profile = PIPELINE_PROFILES[profileId];
  const activeDetectorIds = useMemo(() => activeDetectorsFor(profileId).map((d) => d.id), [profileId]);
  const { steps, tick } = usePipelineHeartbeat(STEP_IDS);

  useEffect(() => {
    installRuntimeHardening();
    const off = onViolations(setViolations);
    const offS = onNerStatus(setSlmStatus);
    const offI = onModelIntegrity(setIntegrity);
    const offR = onReviewQueue(setReviewItems);
    const offL = onRewriteStatus(setLlmStatus);
    return () => { off(); offS(); offI(); offR(); offL(); };
  }, []);

  useEffect(() => {
    if (!profile.detectors.nerSlm) setSlmEnabled(false);
  }, [profile.detectors.nerSlm]);

  useEffect(() => {
    if (slmEnabled && profile.detectors.nerSlm) loadNerSlm().catch(() => {});
  }, [slmEnabled, profile.detectors.nerSlm]);

  useEffect(() => { tick("input", 0); }, [text, tick]);

  useEffect(() => {
    if (!slmEnabled || !slmStatus?.ready) { setSlmSpans([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const t0 = performance.now();
      const spans = await detectPersonsSlm(text);
      if (!cancelled) { setSlmSpans(spans); tick("slm", performance.now() - t0); }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [text, slmEnabled, slmStatus?.ready, tick]);

  const signals = useMemo(() => {
    const t0 = performance.now();
    const s = computeSignals(text, slmEnabled ? slmSpans : [], profileId);
    const dur = performance.now() - t0;
    queueMicrotask(() => { tick("regex", dur); tick("lex", dur); tick("ctx", dur); });
    return s;
  }, [text, slmEnabled, slmSpans, profileId, tick]);

  const sourceCounts = useMemo(() => {
    const counts = { regex: 0, lex: 0, slm: 0, ctx: 0 } as Record<"regex" | "lex" | "slm" | "ctx", number>;
    for (const s of [...signals.directPii, ...signals.contextualPii]) {
      counts[detectorSourceLabel(s.ruleId)]++;
    }
    return counts;
  }, [signals]);

  const processed = useMemo(() => {
    if (mode === "anonymous") return { draft: anonymize(text, signals), plainMap: null as Map<string, string> | null };
    const r = pseudonymize(text, signals);
    return { draft: r.draft, plainMap: r.mapping };
  }, [text, mode, signals]);

  useEffect(() => {
    setRestored(null);
    if (mode !== "pseudonymous" || !processed.plainMap || processed.plainMap.size === 0) {
      setHandle((prev) => { if (prev) destroyContainer(prev); return null; });
      return;
    }
    let cancelled = false;
    (async () => {
      const h = await createMappingContainer(processed.plainMap!);
      if (cancelled) { destroyContainer(h); return; }
      setHandle((prev) => { if (prev) destroyContainer(prev); return h; });
    })();
    return () => { cancelled = true; };
  }, [processed.draft.text, mode, processed.plainMap]);

  const initialGuard = useMemo(() => {
    const t0 = performance.now();
    const g = draftCheck(processed.draft, mode);
    queueMicrotask(() => tick("guard", performance.now() - t0));
    return g;
  }, [processed.draft, mode, tick]);

  const repaired = useMemo(() => {
    if (mode !== "anonymous" || initialGuard.status === "pass") return null;
    const t0 = performance.now();
    const repairedText = repairAnonymousDraft(processed.draft.text, signals);
    if (repairedText === processed.draft.text) return null;
    const newDraft = { ...processed.draft, text: repairedText };
    const newGuard = draftCheck(newDraft, mode);
    queueMicrotask(() => tick("repair", performance.now() - t0));
    return { draft: newDraft, guard: newGuard };
  }, [mode, initialGuard.status, processed.draft, signals, tick]);

  const finalDraft = repaired?.draft ?? processed.draft;
  const generalizedGuard = repaired?.guard ?? initialGuard;

  const llmRepaired = useMemo(() => {
    if (mode !== "anonymous" || !llmDraft) return null;
    const newDraft = { ...processed.draft, text: llmDraft.text };
    return { draft: newDraft, guard: draftCheck(newDraft, mode) };
  }, [mode, llmDraft, processed.draft]);

  const effectiveDraft = llmRepaired?.draft ?? finalDraft;
  const guard = llmRepaired?.guard ?? generalizedGuard;

  useEffect(() => {
    if (guard.status === "pass") return;
    const key = `${mode}::${guard.status}::${effectiveDraft.text}`;
    if (key === lastEnqueuedKey) return;
    setLastEnqueuedKey(key);
    enqueueReview({
      mode, riskLevel: signals.riskLevel, guardStatus: guard.status,
      issues: guard.issues, draftPreview: effectiveDraft.text,
    });
  }, [guard.status, guard.issues, effectiveDraft.text, mode, signals.riskLevel, lastEnqueuedKey]);

  useEffect(() => { setLlmDraft(null); setLlmStreamText(""); }, [text, mode]);

  const llmAbortRef = useRef(false);
  const onTryLlmRewrite = async () => {
    setLlmStreaming(true); setLlmStreamText(""); setLlmDraft(null);
    llmAbortRef.current = false;
    try {
      const r = await rewriteAnonymousDraftStream(finalDraft.text, (_chunk, acc) => {
        if (llmAbortRef.current) return;
        setLlmStreamText(acc); tick("llm", 0);
      });
      if (r.usedLlm) setLlmDraft({ text: r.text, reason: r.reason });
    } finally { setLlmStreaming(false); }
  };

  const decisionSignals = useMemo(
    () => mode === "anonymous" ? computeSignals(effectiveDraft.text, [], profileId) : signals,
    [mode, effectiveDraft.text, signals, profileId],
  );
  const decision = useMemo(() => {
    const t0 = performance.now();
    const d = decide({ mode, action, signals: decisionSignals, draftCheck: guard, modelVerified: true });
    queueMicrotask(() => tick("decide", performance.now() - t0));
    return d;
  }, [mode, action, decisionSignals, guard, tick]);

  const onAct = async () => {
    setEgress(null); setRestored(null);
    let payloadText = effectiveDraft.text;
    const ab = recordSubmission(text, signals);
    setAbuse(ab);
    if (ab.level === "block") {
      setEgress({ ok: false, msg: `Abuse-protectie BLOCK: ${ab.reasons.join("; ")}` });
      return;
    }
    if (decision.action === "restore" && decision.verdict !== "BLOCK") {
      if (!handle) { setEgress({ ok: false, msg: "Geen mapping container — restore onmogelijk." }); return; }
      payloadText = await restoreFromContainer(handle, effectiveDraft.text);
      setRestored(payloadText);
    }
    const result = await executeAction(decision, { text: payloadText, mode });
    setEgress({ ok: result.executed, msg: result.reason });
    setAudit((a) => [{
      ts: decision.timestamp, action: decision.action, mode: decision.mode,
      verdict: decision.verdict, reasonCode: decision.reasonCode, ruleId: decision.ruleId,
      riskLevel: decision.riskLevel, policyVersion: decision.policyVersion,
    }, ...a].slice(0, 20));
  };

  const draftDisplay = llmStreaming && llmStreamText ? llmStreamText : effectiveDraft.text;
  const totalSpans = signals.directPii.length + signals.contextualPii.length;

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
  if (abuse && abuse.level === "block") alerts.push({ kind: "block", title: "Abuse-protectie BLOCK", body: abuse.reasons.join(" · ") });
  if (egress && !egress.ok) alerts.push({ kind: "block", title: "Egress geblokkeerd", body: egress.msg });
  if (violations.length > 0) alerts.push({ kind: "warn", title: `Runtime hardening · ${violations.length} egress-poging(en)`, body: violations.slice(-1)[0] ?? "" });
  if (abuse && abuse.level === "throttle") alerts.push({ kind: "warn", title: "Abuse-protectie THROTTLE", body: abuse.reasons.join(" · ") });
  if (egress && egress.ok) alerts.push({ kind: "info", title: "Egress uitgevoerd", body: egress.msg });

  return (
    <>
      <PageHero
        eyebrow="Try-it · live · lokaal"
        title={<>Test PiM op <span className="text-primary">echte tekst</span></>}
        description="Kies een scenario of plak je eigen fragment. De verdict-balk onderaan blijft altijd in beeld."
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 pb-32">
        {/* — Alerts (één strip) — */}
        {alerts.length > 0 && (
          <div className="mt-4 space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={`panel p-3 flex items-start gap-2.5 ${
                a.kind === "block" ? "border-red/60 bg-red/5" :
                a.kind === "warn" ? "border-orange/50 bg-orange/5" :
                "border-green/40 bg-green/5"
              }`}>
                {a.kind === "block" ? <ShieldX className="h-4 w-4 text-red flex-shrink-0 mt-0.5" /> :
                 a.kind === "warn" ? <AlertTriangle className="h-4 w-4 text-orange flex-shrink-0 mt-0.5" /> :
                 <ShieldCheck className="h-4 w-4 text-green flex-shrink-0 mt-0.5" />}
                <div className="text-xs min-w-0 flex-1">
                  <div className={`font-mono uppercase tracking-wider text-[10px] mb-0.5 ${
                    a.kind === "block" ? "text-red" : a.kind === "warn" ? "text-orange" : "text-green"
                  }`}>{a.title}</div>
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
            <Link to="/scenarios" className="text-[11px] font-mono text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5">
              Alle scenarios <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Drie demo's</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {STARTERS.map((p) => <PresetChip key={p.id} preset={p} active={activePreset.id === p.id} onClick={() => loadPreset(p)} />)}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Scenarios uit de pipeline</div>
              <div className="flex flex-wrap gap-1.5">
                {SCENARIO_PRESETS.map((p) => <PresetChip key={p.id} preset={p} active={activePreset.id === p.id} onClick={() => loadPreset(p)} compact />)}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-border/30">
              <span className="text-foreground/80">{activePreset.label}</span> — {activePreset.hint}
              {activePreset.scenarioId && (
                <> · <Link to="/scenarios" hash={activePreset.scenarioId} className="text-primary hover:underline">lees scenario</Link></>
              )}
            </p>
          </div>
        </section>

        {/* — Sectie 1: Input — */}
        <Section title="Onderwijsfragment" eyebrow="01 · Input" defaultOpen>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            className="w-full font-mono text-sm bg-background/60 border border-border/60 rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Plak hier docentnotitie, leerlingtekst, dossierfragment..."
          />
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="font-mono">{text.length} tekens · {totalSpans} spans</span>
            <span className="font-mono">profiel: <span className="text-foreground/80">{profile.label}</span></span>
          </div>
        </Section>

        {/* — Sectie 2: Detectie & Draft — */}
        <Section title="Detectie & draft" eyebrow="02 · Verwerking" defaultOpen>
          <RiskBanner level={signals.riskLevel} reasons={signals.reasons} />

          {totalSpans > 0 && (
            <div className="mt-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Spans</div>
              <div className="flex flex-wrap gap-1.5">
                {[...signals.directPii, ...signals.contextualPii].map((s, i) => (
                  <span key={i} className={`font-mono text-[11px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                    s.contextual ? "border-cyan/60 bg-cyan/10" : "border-orange/60 bg-orange/10"
                  }`}>
                    <span className={`uppercase text-[9px] font-semibold ${s.contextual ? "text-cyan" : "text-orange"}`}>{s.category}</span>
                    <span className="text-foreground/90">{s.text.length > 22 ? s.text.slice(0, 20) + "…" : s.text}</span>
                  </span>
                ))}
              </div>
              <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                regex {sourceCounts.regex} · lex {sourceCounts.lex} · slm {sourceCounts.slm} · ctx {sourceCounts.ctx}
              </div>
            </div>
          )}

          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
              <div className="font-mono text-[10px] uppercase tracking-wider text-purple">Processed draft · {mode}</div>
              <div className="flex items-center gap-2">
                {llmStreaming && <span className="font-mono text-[10px] text-purple">streaming…</span>}
                {repaired && !llmDraft && <span className="font-mono text-[10px] text-orange inline-flex items-center gap-1"><Wrench className="h-3 w-3" /> auto-repair</span>}
                {llmDraft && <span className="font-mono text-[10px] text-purple">Qwen rewrite</span>}
              </div>
            </div>
            <AnonymizedText text={draftDisplay} streaming={llmStreaming} />
            {guard.issues.length > 0 && (
              <ul className="mt-2 text-xs text-orange space-y-0.5">
                {guard.issues.map((i, k) => <li key={k}>⚠ {i}</li>)}
              </ul>
            )}
          </div>

          {handle && (
            <div className="mt-3 panel p-2.5 border-cyan/40 bg-cyan/5">
              <div className="flex items-center gap-2 font-mono text-[11px] text-cyan">
                <Lock className="h-3 w-3" /> Mapping container · {handle.tokenCount} tokens · AES-GCM
              </div>
            </div>
          )}
          {restored !== null && (
            <div className="mt-2 panel p-2.5 border-cyan/40">
              <div className="font-mono text-[10px] text-cyan uppercase tracking-wider mb-1">Restored (lokaal)</div>
              <pre className="font-mono text-[11px] whitespace-pre-wrap text-foreground/90">{restored}</pre>
            </div>
          )}
        </Section>

        {/* — Sectie 3: Mode & Action — */}
        <Section title="Mode & actie" eyebrow="03 · Bestemming">
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {(["anonymous", "pseudonymous"] as Mode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all border ${
                mode === m
                  ? m === "anonymous" ? "bg-purple/15 border-purple text-purple" : "bg-cyan/15 border-cyan text-cyan"
                  : "bg-card/40 border-border/60 text-muted-foreground"
              }`}>{m}</button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <button key={a.id} onClick={() => setAction(a.id)} className={`flex flex-col items-center gap-1 px-1.5 py-2 rounded-lg text-[10px] font-medium border transition-all ${
                  action === a.id ? "bg-primary/15 border-primary text-primary" : "bg-card/40 border-border/50 text-muted-foreground"
                }`} title={a.label}>
                  <Icon className="h-3.5 w-3.5" />
                  <span className="leading-none">{a.label}</span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* — Sectie 4: Live pipeline — */}
        <Section title="Live pipeline" eyebrow="04 · Heartbeat">
          <div className="flex items-center justify-center mb-3">
            <RiskGauge score={decisionSignals.riskScore} level={decisionSignals.riskLevel} />
          </div>
          <PipelineTimeline steps={steps} />
        </Section>

        {/* — Sectie 5: Geavanceerd — */}
        <Section title="Geavanceerd" eyebrow="05 · Profiel · SLM · LLM · audit">
          {/* Profile */}
          <div className="mb-4">
            <div className="font-mono text-[10px] uppercase tracking-wider text-primary mb-1.5">Pipeline profile</div>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {Object.values(PIPELINE_PROFILES).map((p) => {
                const selectable = RELEASE_1_PROFILES.includes(p.id);
                const active = profileId === p.id;
                return (
                  <button key={p.id} disabled={!selectable} onClick={() => selectable && setProfileId(p.id)}
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                      active ? "bg-primary/20 border-primary text-primary" :
                      selectable ? "bg-card/40 border-border/60 text-foreground/80" :
                      "bg-card/20 border-border/30 text-muted-foreground/50 cursor-not-allowed"
                    }`} title={p.description}>
                    {p.label}{!selectable && " · design"}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{profile.description}</p>
            <div className="mt-1 font-mono text-[10px] text-muted-foreground">
              {activeDetectorIds.length} detectors · egress {profile.egressPolicy}
            </div>
          </div>

          {/* SLM */}
          <div className="mb-4 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono text-[10px] uppercase tracking-wider text-cyan flex items-center gap-1"><Cpu className="h-3 w-3" /> Browser SLM (NER)</div>
              <button onClick={() => profile.detectors.nerSlm && setSlmEnabled((v) => !v)}
                disabled={!profile.detectors.nerSlm}
                className={`relative h-5 w-9 rounded-full ${
                  !profile.detectors.nerSlm ? "bg-card border border-border/40 opacity-40" :
                  slmEnabled ? "bg-cyan" : "bg-card border border-border"
                }`} aria-label="Toggle SLM">
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background transition-transform ${slmEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </div>
            {!profile.detectors.nerSlm && <p className="text-[11px] text-orange">Profiel {profile.id} bevat geen SLM.</p>}
            {slmEnabled && slmStatus && (
              <div className="space-y-1 text-[11px] font-mono">
                <div className="flex items-center gap-1.5">
                  {slmStatus.loading && <Loader2 className="h-3 w-3 animate-spin text-cyan" />}
                  {slmStatus.ready && <ShieldCheck className="h-3 w-3 text-green" />}
                  {slmStatus.error && <ShieldX className="h-3 w-3 text-red" />}
                  <span className={slmStatus.ready ? "text-green" : slmStatus.error ? "text-red" : "text-cyan"}>
                    {slmStatus.ready ? `READY · ${slmStatus.runtime?.toUpperCase()}` : slmStatus.error ? "ERROR" : slmStatus.loading ? "LOADING…" : "IDLE"}
                  </span>
                </div>
                {slmStatus.progress && (
                  <div className="h-1.5 rounded-full bg-card overflow-hidden border border-border/40">
                    <div className="h-full bg-cyan transition-all" style={{ width: `${slmStatus.progress.pct ?? 0}%` }} />
                  </div>
                )}
                {slmStatus.ready && <p className="text-muted-foreground">{slmSpans.length} SLM-entiteit(en)</p>}
              </div>
            )}
          </div>

          {/* LLM rewrite */}
          {mode === "anonymous" && (
            <div className="mb-4 pt-3 border-t border-border/40">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="font-mono text-[10px] uppercase tracking-wider text-purple">LLM rewrite · Qwen2.5</div>
                <button onClick={onTryLlmRewrite}
                  disabled={llmStreaming || (llmStatus?.loading ?? false)}
                  className="text-[11px] font-mono px-2 py-1 rounded-md border border-purple/40 text-purple disabled:opacity-50 inline-flex items-center gap-1">
                  {(llmStreaming || llmStatus?.loading) && <Loader2 className="h-3 w-3 animate-spin" />}
                  {llmDraft ? "Opnieuw" : "Rewrite"}
                </button>
              </div>
              {llmStatus?.progress && (
                <div className="space-y-1">
                  <div className="font-mono text-[10px] text-muted-foreground truncate">{llmStatus.progress.text}</div>
                  <div className="h-1.5 rounded-full bg-card overflow-hidden border border-border/40">
                    <div className="h-full bg-purple transition-all" style={{ width: `${llmStatus.progress.pct ?? 0}%` }} />
                  </div>
                </div>
              )}
              {llmDraft && <p className="mt-1 text-[10px] text-purple font-mono">{llmDraft.reason}</p>}
            </div>
          )}

          {/* Integrity */}
          {integrity.length > 0 && (
            <div className="mb-4 pt-3 border-t border-border/40">
              <div className="font-mono text-[10px] uppercase tracking-wider text-cyan mb-1.5">Model integrity</div>
              {integrity.map((rec) => (
                <div key={rec.key} className="font-mono text-[10px] flex items-start gap-1.5">
                  <span className={
                    rec.status === "verified" ? "text-green" :
                    rec.status === "placeholder" ? "text-orange" :
                    rec.status === "mismatch" ? "text-red" : "text-muted-foreground"
                  }>●</span>
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
              <div className="font-mono text-[10px] uppercase tracking-wider text-green">Audit feed (metadata)</div>
              {audit.length > 0 && <button onClick={() => setAudit([])} className="text-[10px] text-muted-foreground">Wis</button>}
            </div>
            {audit.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">Geen events.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-auto">
                {audit.map((e, i) => (
                  <div key={i} className="font-mono text-[10px] p-1.5 rounded bg-background/60 border border-border/50 flex items-center gap-2">
                    <span className={e.verdict === "ALLOW" ? "text-green" : e.verdict === "ALLOW_WITH_WARNING" ? "text-orange" : "text-red"}>{e.verdict}</span>
                    <span className="text-foreground/85 truncate">{e.action} · {e.mode} · {e.ruleId}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* — Sectie 6: Review queue — */}
        <Section title={`Review queue${reviewItems.length ? ` · ${reviewItems.length}` : ""}`} eyebrow="06 · Menselijke check">
          <p className="text-[11px] text-muted-foreground mb-2">Alleen 'repair' of 'fail'. Inhoud blijft lokaal.</p>
          {reviewItems.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Queue is leeg.</p>
          ) : (
            <>
              <button onClick={() => clearReviewQueue()} className="mb-2 text-[10px] font-mono text-muted-foreground">Wis queue</button>
              <ul className="space-y-2">
                {reviewItems.slice(-5).reverse().map((it) => (
                  <li key={it.id} className={`p-2 rounded-lg border bg-background/60 ${
                    it.resolved ? "border-green/30 opacity-60" :
                    it.guardStatus === "fail" ? "border-red/40" : "border-orange/40"
                  }`}>
                    <div className="flex items-center justify-between gap-2 mb-1 flex-wrap font-mono text-[10px]">
                      <span className={it.guardStatus === "fail" ? "text-red" : "text-orange"}>● {it.guardStatus}</span>
                      <span className="text-muted-foreground">{it.mode} · {it.riskLevel} · {new Date(it.ts).toLocaleTimeString()}</span>
                      {!it.resolved && (
                        <button onClick={() => resolveReview(it.id)} className="text-green inline-flex items-center gap-0.5"><Check className="h-3 w-3" />Resolve</button>
                      )}
                    </div>
                    <pre className="font-mono text-[10px] whitespace-pre-wrap text-foreground/85 bg-card/40 rounded p-1.5 max-h-24 overflow-auto">{it.draftPreview}</pre>
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
            <span className={`hidden sm:inline font-mono text-[10px] px-1.5 py-0.5 rounded border ${
              guard.status === "pass" ? "border-green/40 text-green" :
              guard.status === "repair" ? "border-orange/40 text-orange" :
              "border-red/50 text-red"
            }`}>guard {guard.status}</span>
            <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
              decisionSignals.riskLevel === "low" ? "border-green/40 text-green" :
              decisionSignals.riskLevel === "medium" ? "border-orange/40 text-orange" :
              "border-red/50 text-red"
            }`}>{decisionSignals.riskLevel}</span>
            <div className="flex-1" />
            <button onClick={() => setVerdictOpen((v) => !v)} className="text-[10px] font-mono text-muted-foreground px-2 py-1 rounded hover:text-foreground">
              {verdictOpen ? "verberg" : "details"}
            </button>
            <button onClick={onAct} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 inline-flex items-center gap-1">
              <Shield className="h-3 w-3" /> Voer uit
            </button>
          </div>
          {verdictOpen && (
            <div className="mt-2 pt-2 border-t border-border/40 space-y-1 text-[11px]">
              <div className="text-foreground/85">{decision.reason}</div>
              <div className="font-mono text-[10px] text-muted-foreground">rule {decision.ruleId} · code {decision.reasonCode}</div>
              {decision.flag && <div className="font-mono text-[10px] text-primary truncate">flag: {decision.flag}</div>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ title, eyebrow, defaultOpen, children }: { title: string; eyebrow: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <details open={defaultOpen} className="panel p-0 mt-3 group overflow-hidden">
      <summary className="cursor-pointer list-none flex items-center justify-between gap-2 p-4 hover:bg-accent/20">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{eyebrow}</div>
          <div className="font-display font-bold text-sm">{title}</div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90 flex-shrink-0" />
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

function PresetChip({ preset, active, onClick, compact }: { preset: Preset; active: boolean; onClick: () => void; compact?: boolean }) {
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
    <button onClick={onClick} className={`text-left font-mono text-[11px] ${compact ? "px-2.5 py-1 rounded-full" : "px-3 py-2 rounded-lg"} border transition-colors ${active ? activeMap[preset.tone] : toneMap[preset.tone] + " bg-card/40"}`}>
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
    <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.klass}`}>
      <Icon className="h-3 w-3" />
      {verdict}
    </span>
  );
}