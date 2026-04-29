import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHero } from "@/components/pim/PageHero";
import {
  computeSignals, anonymize, pseudonymize, draftCheck, decide, executeAction,
  createMappingContainer, restoreFromContainer, destroyContainer,
  installRuntimeHardening, onViolations,
  detectPersonsSlm, loadNerSlm, onNerStatus, type NerStatus,
  PIPELINE_PROFILES, RELEASE_1_PROFILES, DEFAULT_PROFILE, type PipelineProfileId,
  onModelIntegrity, type ModelIntegrityRecord,
  repairAnonymousDraft,
  activeDetectorsFor,
  enqueueReview, onReviewQueue, resolveReview, clearReviewQueue, type ReviewItem,
  recordSubmission, type AbuseSignal,
  rewriteAnonymousDraft, onRewriteStatus, type RewriteStatus,
  type Mode, type Action, type Verdict, type AuditEvent, type MappingHandle,
  type PiiSpan,
} from "@/lib/pim";
import { Shield, ShieldAlert, ShieldCheck, ShieldX, Copy, Eye, Save, RotateCcw, Send, Download, Printer, Share2, Lock, AlertTriangle, Cpu, Loader2, Layers, Wrench, Inbox, Check, Sparkles, Activity } from "lucide-react";

export const Route = createFileRoute("/try")({
  head: () => ({
    meta: [
      { title: "Try-it — Project PiM" },
      { name: "description", content: "Test de PIM privacy pipeline live op je eigen tekst. Detectie, generalisatie, AES-GCM mapping, egress guard — alles in jouw browser." },
      { property: "og:title", content: "Try Project PiM live" },
      { property: "og:description", content: "Live PIM privacy pipeline — alles lokaal." },
    ],
  }),
  component: TryPage,
});

const SAMPLE = `Notitie van mentor over Sarah Jansen (groep 6) van basisschool De Wilg in Utrecht.
Vader van Sarah belde 06-12345678 over recent incident op 14-03-2026 — zorgleerling met dyslexie.
Postcode 3511AB, Bredestraat 12. Mail: jansen@example.com. BSN 123456782.`;

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

function TryPage() {
  const [text, setText] = useState(SAMPLE);
  const [mode, setMode] = useState<Mode>("anonymous");
  const [action, setAction] = useState<Action>("display");
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
  const [llmBusy, setLlmBusy] = useState(false);

  const profile = PIPELINE_PROFILES[profileId];
  const activeDetectorIds = useMemo(() => activeDetectorsFor(profileId).map((d) => d.id), [profileId]);

  // Install runtime hardening once on mount.
  useEffect(() => {
    installRuntimeHardening();
    const off = onViolations(setViolations);
    const offS = onNerStatus(setSlmStatus);
    const offI = onModelIntegrity(setIntegrity);
    const offR = onReviewQueue(setReviewItems);
    const offL = onRewriteStatus(setLlmStatus);
    return () => { off(); offS(); offI(); offR(); offL(); };
  }, []);

  // Profile dictates SLM availability. rules-only profiel forceert SLM uit.
  useEffect(() => {
    if (!profile.detectors.nerSlm) setSlmEnabled(false);
  }, [profile.detectors.nerSlm]);

  // Trigger model load on enable.
  useEffect(() => {
    if (slmEnabled && profile.detectors.nerSlm) loadNerSlm().catch(() => {});
  }, [slmEnabled, profile.detectors.nerSlm]);

  // Run SLM inference (debounced) when enabled and ready.
  useEffect(() => {
    if (!slmEnabled || !slmStatus?.ready) { setSlmSpans([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const spans = await detectPersonsSlm(text);
      if (!cancelled) setSlmSpans(spans);
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [text, slmEnabled, slmStatus?.ready]);

  const signals = useMemo(() => computeSignals(text, slmEnabled ? slmSpans : []), [text, slmEnabled, slmSpans]);

  // For pseudonymous: generate plain mapping in-memory once, then push to AES container async
  const processed = useMemo(() => {
    if (mode === "anonymous") return { draft: anonymize(text, signals), plainMap: null as Map<string, string> | null };
    const r = pseudonymize(text, signals);
    return { draft: r.draft, plainMap: r.mapping };
  }, [text, mode, signals]);

  // Async: encrypt mapping into AES-GCM container whenever pseudonymous draft changes
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
  }, [processed.draft.text, mode]);

  // Initial guard on the raw draft.
  const initialGuard = useMemo(() => draftCheck(processed.draft, mode), [processed.draft, mode]);

  // Auto-repair: alleen anonymous; alleen als initial guard niet "pass".
  // Spec hfst 31: contextuele generalisatie + brede fallback patronen.
  const repaired = useMemo(() => {
    if (mode !== "anonymous" || initialGuard.status === "pass") return null;
    const repairedText = repairAnonymousDraft(processed.draft.text, signals);
    if (repairedText === processed.draft.text) return null;
    const newDraft = { ...processed.draft, text: repairedText };
    const newGuard = draftCheck(newDraft, mode);
    return { draft: newDraft, guard: newGuard };
  }, [mode, initialGuard.status, processed.draft, signals]);

  const finalDraft = repaired?.draft ?? processed.draft;
  const generalizedGuard = repaired?.guard ?? initialGuard;

  // Optionele LLM-rewrite bovenop generalisatie. Pas guard opnieuw toe.
  const llmRepaired = useMemo(() => {
    if (mode !== "anonymous" || !llmDraft) return null;
    const newDraft = { ...processed.draft, text: llmDraft.text };
    return { draft: newDraft, guard: draftCheck(newDraft, mode) };
  }, [mode, llmDraft, processed.draft]);

  const effectiveDraft = llmRepaired?.draft ?? finalDraft;
  const guard = llmRepaired?.guard ?? generalizedGuard;

  // Auto-enqueue: als de finale guard niet "pass" is, zet item in review queue.
  // Dedup op (mode + draftText) zodat typen niet honderd items genereert.
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

  // Reset LLM-output bij significante input-wijziging.
  useEffect(() => { setLlmDraft(null); }, [text, mode]);

  const onTryLlmRewrite = async () => {
    setLlmBusy(true);
    try {
      const r = await rewriteAnonymousDraft(finalDraft.text);
      if (r.usedLlm) setLlmDraft({ text: r.text, reason: r.reason });
    } finally { setLlmBusy(false); }
  };

  // Spec hfst 32: PIM beslist op de DRAFT, niet op de input. Recompute
  // signals over de uiteindelijke draft (na anonimize + eventuele repair).
  // Anonieme drafts zonder ruwe PII krijgen nu de risk-score van de output.
  const decisionSignals = useMemo(
    () => mode === "anonymous" ? computeSignals(effectiveDraft.text, []) : signals,
    [mode, effectiveDraft.text, signals],
  );
  const decision = useMemo(
    () => decide({ mode, action, signals: decisionSignals, draftCheck: guard, modelVerified: true }),
    [mode, action, decisionSignals, guard],
  );

  const onAct = async () => {
    setEgress(null);
    setRestored(null);
    let payloadText = effectiveDraft.text;

    // AbuseDetection: hard-block bij level === "block".
    const ab = recordSubmission(text, signals);
    setAbuse(ab);
    if (ab.level === "block") {
      setEgress({ ok: false, msg: `Abuse-protectie BLOCK: ${ab.reasons.join("; ")}` });
      return;
    }

    // Restore-actie: alleen lokaal, alleen via AES container
    if (decision.action === "restore" && decision.verdict !== "BLOCK") {
      if (!handle) {
        setEgress({ ok: false, msg: "Geen mapping container — restore onmogelijk." });
        return;
      }
      payloadText = await restoreFromContainer(handle, effectiveDraft.text);
      setRestored(payloadText);
    }

    const result = await executeAction(decision, { text: payloadText, mode });
    setEgress({ ok: result.executed, msg: result.reason });

    setAudit((a) => [{
      ts: decision.timestamp,
      action: decision.action,
      mode: decision.mode,
      verdict: decision.verdict,
      reasonCode: decision.reasonCode,
      ruleId: decision.ruleId,
      riskLevel: decision.riskLevel,
      policyVersion: decision.policyVersion,
    }, ...a].slice(0, 20));
  };

  return (
    <>
      <PageHero
        eyebrow="Try-it · live, lokaal, AES-GCM"
        title={<>Test de pipeline op <span className="text-primary">echte tekst</span></>}
        description="Type of plak een fragment, kies modus en actie. Mapping wordt versleuteld met AES-GCM. Egress wordt écht uitgevoerd via clipboard, print, share of download — maar alleen na PIM ALLOW."
      />

      {violations.length > 0 && (
        <div className="mx-auto max-w-7xl px-6 mt-4">
          <div className="panel p-4 border-orange/50 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-semibold text-orange mb-1">Runtime hardening detecteerde {violations.length} egress-poging(en):</div>
              <ul className="font-mono text-muted-foreground space-y-0.5">
                {violations.slice(-3).map((v, i) => <li key={i}>· {v}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto max-w-7xl px-6 py-10 grid gap-5 lg:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <div className="panel p-4 flex items-start gap-3 border-primary/40">
            <Layers className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-wider text-primary mb-1">Pipeline profile</div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(Object.values(PIPELINE_PROFILES)).map((p) => {
                  const selectable = RELEASE_1_PROFILES.includes(p.id);
                  const active = profileId === p.id;
                  return (
                    <button
                      key={p.id}
                      disabled={!selectable}
                      onClick={() => selectable && setProfileId(p.id)}
                      className={`text-[11px] font-mono px-2.5 py-1 rounded-full border transition-colors ${
                        active
                          ? "bg-primary/20 border-primary text-primary"
                          : selectable
                            ? "bg-card/40 border-border/60 text-foreground/80 hover:border-border"
                            : "bg-card/20 border-border/30 text-muted-foreground/50 cursor-not-allowed"
                      }`}
                      title={selectable ? p.description : "Design-only — niet vrijgegeven in release 1"}
                    >
                      {p.label}{!selectable && " ·  design"}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{profile.description}</p>
              <div className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                detectors actief ({activeDetectorIds.length}): {activeDetectorIds.join(" · ") || "—"} · egress: {profile.egressPolicy}
              </div>
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-cyan">01 · Raw input</div>
                <h3 className="font-display font-bold">Onderwijsfragment</h3>
              </div>
              <button onClick={() => setText(SAMPLE)} className="text-xs px-2.5 py-1 rounded-md border border-border hover:bg-accent">Reset</button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="w-full font-mono text-sm bg-background/60 border border-border/60 rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Plak hier docentnotitie, leerlingtekst, dossierfragment..."
            />
          </div>

          <div className="panel p-5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-cyan mb-1">02 · Detectie & signals</div>
            <h3 className="font-display font-bold mb-4">Privacy signals</h3>
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <Stat label="Direct PII" value={signals.directPii.length} accent="orange" />
              <Stat label="Contextueel" value={signals.contextualPii.length} accent="cyan" />
              <Stat label="Risk score" value={`${(signals.riskScore * 100).toFixed(0)}%`} accent={signals.riskScore > 0.4 ? "red" : signals.riskScore > 0.18 ? "orange" : "green"} />
            </div>
            <div className="mb-3">
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Risk level: <span className="text-foreground capitalize">{signals.riskLevel}</span></div>
              <div className="h-2 rounded-full bg-card overflow-hidden border border-border/40">
                <div className="h-full transition-all" style={{
                  width: `${signals.riskScore * 100}%`,
                  background: signals.riskScore > 0.4 ? "var(--red)" : signals.riskScore > 0.18 ? "var(--orange)" : "var(--green)",
                }} />
              </div>
            </div>
            {signals.directPii.length + signals.contextualPii.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {[...signals.directPii, ...signals.contextualPii].map((s, i) => (
                  <span key={i} className={`font-mono text-[11.5px] px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 ${
                    s.contextual
                      ? "border-cyan/60 bg-cyan/15 text-foreground"
                      : "border-orange/60 bg-orange/15 text-foreground"
                  }`}>
                    <span className={`font-semibold uppercase tracking-wide text-[10px] ${s.contextual ? "text-cyan" : "text-orange"}`}>
                      {s.category}
                    </span>
                    <span className="text-foreground/95">
                      {s.text.length > 28 ? s.text.slice(0, 26) + "…" : s.text}
                    </span>
                  </span>
                ))}
              </div>
            )}
            {signals.reasons.length > 0 && (
              <ul className="mt-3 text-xs text-foreground/80 space-y-1">
                {signals.reasons.map((r, i) => <li key={i}>· {r}</li>)}
              </ul>
            )}
          </div>

          <div className="panel p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="font-mono text-[11px] uppercase tracking-wider text-purple">03 · Processed draft ({mode})</div>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                guard.status === "pass" ? "border-green/40 bg-green/10 text-green" :
                guard.status === "repair" ? "border-orange/40 bg-orange/10 text-orange" :
                "border-red/50 bg-red/10 text-red"
              }`}>
                Draft Check: {guard.status}
              </span>
            </div>
            <h3 className="font-display font-bold mb-3">{mode === "anonymous" ? "Anonymous candidate" : "Pseudonymous candidate"}</h3>
            {repaired && (
              <div className="mb-3 panel p-3 border-orange/40 bg-orange/5">
                <div className="flex items-center gap-2 mb-1">
                  <Wrench className="h-3.5 w-3.5 text-orange" />
                  <span className="font-mono text-[11px] text-orange uppercase tracking-wider">Auto-repair toegepast</span>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  Initial guard: {initialGuard.status} → contextual generalization + brede fallback patronen → guard nu: <span className="text-foreground">{generalizedGuard.status}</span>
                </div>
              </div>
            )}
            {llmRepaired && (
              <div className="mb-3 panel p-3 border-purple/40 bg-purple/5">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-purple" />
                  <span className="font-mono text-[11px] text-purple uppercase tracking-wider">LLM-rewrite (Qwen, lokaal)</span>
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  Generalized guard: {generalizedGuard.status} → Qwen rewrite → guard nu: <span className="text-foreground">{guard.status}</span>
                </div>
              </div>
            )}
            <pre className="font-mono text-sm whitespace-pre-wrap bg-background/70 border border-border/60 rounded-lg p-3 max-h-64 overflow-auto text-foreground/95 leading-relaxed">
{effectiveDraft.text}
            </pre>
            {guard.issues.length > 0 && (
              <ul className="mt-3 text-xs text-orange space-y-1">
                {guard.issues.map((i, k) => <li key={k}>⚠ {i}</li>)}
              </ul>
            )}
            {mode === "anonymous" && (
              <div className="mt-4 panel p-3 border-purple/30 bg-purple/5">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-purple" />
                    <span className="font-mono text-[11px] text-purple uppercase tracking-wider">Optioneel · LLM rewrite</span>
                  </div>
                  <button
                    onClick={onTryLlmRewrite}
                    disabled={llmBusy || (llmStatus?.loading ?? false)}
                    className="text-[11px] font-mono px-2.5 py-1 rounded-md border border-purple/40 text-purple hover:bg-purple/10 disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {llmBusy || llmStatus?.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {llmDraft ? "Opnieuw" : "Rewrite met Qwen"}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Laadt <span className="font-mono text-foreground/80">Qwen2.5-0.5B-Instruct</span> via @mlc-ai/web-llm (~400MB, eerste keer). Lokaal, geen egress. Output gaat door dezelfde Draft Check Guard.
                </p>
                {llmStatus?.progress && (
                  <div className="mt-2">
                    <div className="font-mono text-[10px] text-muted-foreground truncate mb-1">{llmStatus.progress.text}</div>
                    <div className="h-1.5 rounded-full bg-card overflow-hidden border border-border/40">
                      <div className="h-full bg-purple transition-all" style={{ width: `${llmStatus.progress.pct ?? 0}%` }} />
                    </div>
                  </div>
                )}
                {llmStatus?.error && (
                  <p className="mt-2 text-[10px] text-red font-mono break-words">{llmStatus.error}</p>
                )}
                {llmDraft && (
                  <p className="mt-2 text-[10px] text-purple font-mono">{llmDraft.reason}</p>
                )}
              </div>
            )}
            {handle && (
              <div className="mt-4 panel p-3 border-cyan/40 bg-cyan/5">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="h-3.5 w-3.5 text-cyan" />
                  <span className="font-mono text-[11px] text-cyan uppercase tracking-wider">Secure Mapping Container</span>
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  Handle: <span className="text-foreground">{handle.id.slice(0, 12)}…</span> · {handle.tokenCount} tokens · AES-GCM 256
                </div>
                <div className="font-mono text-[10px] text-muted-foreground mt-1">
                  Originelen versleuteld in module-private register. UI heeft geen directe toegang.
                </div>
              </div>
            )}
            {restored !== null && (
              <div className="mt-3 panel p-3 border-cyan/40">
                <div className="font-mono text-[11px] text-cyan uppercase tracking-wider mb-1">Restored (alleen lokaal)</div>
                <pre className="font-mono text-xs whitespace-pre-wrap text-foreground leading-relaxed">{restored}</pre>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="panel p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-cyan flex items-center gap-1.5">
                  <Cpu className="h-3 w-3" /> Browser SLM (NER)
                </div>
                <h3 className="font-display font-bold text-sm mt-0.5">Lokale namen-detectie</h3>
              </div>
              <button
                onClick={() => profile.detectors.nerSlm && setSlmEnabled((v) => !v)}
                disabled={!profile.detectors.nerSlm}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  !profile.detectors.nerSlm ? "bg-card border border-border/40 opacity-40 cursor-not-allowed" :
                  slmEnabled ? "bg-cyan" : "bg-card border border-border"
                }`}
                aria-label="Toggle SLM"
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform ${slmEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            {!profile.detectors.nerSlm && (
              <p className="text-[11px] text-orange leading-relaxed">
                Profiel <span className="font-mono">{profile.id}</span> bevat geen SLM. Toggle uitgeschakeld.
              </p>
            )}
            {profile.detectors.nerSlm && !slmEnabled && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Aan: laadt <span className="font-mono text-foreground/80">bert-base-multilingual-cased-ner-hrl</span> via @huggingface/transformers (WebGPU → WASM). ±150 MB eerste keer, dan gecached.
              </p>
            )}
            {slmEnabled && slmStatus && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] font-mono">
                  {slmStatus.loading && <Loader2 className="h-3 w-3 animate-spin text-cyan" />}
                  {slmStatus.ready && <ShieldCheck className="h-3 w-3 text-green" />}
                  {slmStatus.error && <ShieldX className="h-3 w-3 text-red" />}
                  <span className={slmStatus.ready ? "text-green" : slmStatus.error ? "text-red" : "text-cyan"}>
                    {slmStatus.ready ? `READY · ${slmStatus.runtime?.toUpperCase()}` :
                     slmStatus.error ? "ERROR" :
                     slmStatus.loading ? "LOADING…" : "IDLE"}
                  </span>
                </div>
                {slmStatus.progress && (
                  <div>
                    <div className="font-mono text-[10px] text-muted-foreground truncate mb-1">{slmStatus.progress.file}</div>
                    <div className="h-1.5 rounded-full bg-card overflow-hidden border border-border/40">
                      <div className="h-full bg-cyan transition-all" style={{ width: `${slmStatus.progress.pct ?? 0}%` }} />
                    </div>
                  </div>
                )}
                {slmStatus.error && (
                  <p className="text-[10px] text-red font-mono break-words">{slmStatus.error}</p>
                )}
                {slmStatus.ready && (
                  <p className="text-[10px] text-muted-foreground">
                    {slmSpans.length} entiteit(en) gevonden door SLM. Gefuseerd met regex-detectoren.
                  </p>
                )}
                {integrity.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/40">
                    {integrity.map((rec) => (
                      <div key={rec.key} className="font-mono text-[10px] flex items-start gap-1.5">
                        <span className={
                          rec.status === "verified" ? "text-green" :
                          rec.status === "placeholder" ? "text-orange" :
                          rec.status === "mismatch" ? "text-red" : "text-muted-foreground"
                        }>●</span>
                        <div className="min-w-0">
                          <div className="text-foreground/80 truncate">{rec.modelId}</div>
                          <div className="text-muted-foreground">integrity: {rec.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="panel p-5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-orange mb-2">04 · Mode</div>
            <div className="grid grid-cols-2 gap-2">
              {(["anonymous", "pseudonymous"] as Mode[]).map((m) => (
                <button key={m} onClick={() => setMode(m)} className={`px-3 py-2.5 rounded-lg text-sm font-semibold transition-all border ${
                  mode === m
                    ? m === "anonymous" ? "bg-purple/15 border-purple text-purple" : "bg-cyan/15 border-cyan text-cyan"
                    : "bg-card/40 border-border/60 text-muted-foreground hover:border-border"
                }`}>{m}</button>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <div className="font-mono text-[11px] uppercase tracking-wider text-orange mb-2">05 · Action</div>
            <div className="grid grid-cols-4 gap-1.5">
              {ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <button key={a.id} onClick={() => setAction(a.id)} className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg text-[10px] font-medium transition-all border ${
                    action === a.id ? "bg-primary/15 border-primary text-primary" : "bg-card/40 border-border/50 text-muted-foreground hover:border-border"
                  }`} title={a.label}>
                    <Icon className="h-4 w-4" />
                    <span className="leading-none">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <VerdictCard verdict={decision.verdict} reason={decision.reason} reasonCode={decision.reasonCode} ruleId={decision.ruleId} flag={decision.flag} onAct={onAct} egress={egress} />

          <div className="panel p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-wider text-green">07 · Minimal audit</div>
                <h3 className="font-display font-bold text-sm">Metadata only — geen inhoud</h3>
              </div>
              {audit.length > 0 && <button onClick={() => setAudit([])} className="text-[11px] text-muted-foreground hover:text-foreground">Wis</button>}
            </div>
            {audit.length === 0 ? (
              <p className="text-xs text-muted-foreground">Geen events. Klik "Voer actie uit" om een audit-record te maken.</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-auto">
                {audit.map((e, i) => (
                  <div key={i} className="font-mono text-[11px] p-2 rounded-md bg-background/60 border border-border/50 grid grid-cols-[auto_1fr] gap-x-2 items-center">
                    <span className={
                      e.verdict === "ALLOW" ? "text-green" :
                      e.verdict === "ALLOW_WITH_WARNING" ? "text-orange" : "text-red"
                    }>{e.verdict}</span>
                    <span className="text-foreground/85 truncate">{e.action} · {e.mode} · {e.ruleId}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-orange flex items-center gap-1.5">
                <Inbox className="h-3 w-3" /> 08 · Review queue
              </div>
              <h3 className="font-display font-bold">Drafts die menselijke check vragen</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Alleen 'repair' of 'fail' guard-resultaten. Inhoud blijft lokaal — nooit egress. Originele tekst wordt niet bewaard, alleen de geredacteerde draft (max 400 tekens).
              </p>
            </div>
            {reviewItems.length > 0 && (
              <button onClick={() => clearReviewQueue()} className="text-[11px] text-muted-foreground hover:text-foreground">
                Wis queue
              </button>
            )}
          </div>
          {reviewItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">Queue is leeg. Wijzig de input zodat de guard een 'repair' of 'fail' geeft om dit paneel te zien werken.</p>
          ) : (
            <ul className="space-y-2">
              {reviewItems.map((it) => (
                <li key={it.id} className={`p-3 rounded-lg border bg-background/60 ${
                  it.resolved ? "border-green/30 opacity-60" :
                  it.guardStatus === "fail" ? "border-red/40" : "border-orange/40"
                }`}>
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <span className={
                        it.guardStatus === "fail" ? "text-red" :
                        it.guardStatus === "repair" ? "text-orange" : "text-green"
                      }>
                        ● {it.guardStatus.toUpperCase()}
                      </span>
                      <span className="text-muted-foreground">{it.mode}</span>
                      <span className="text-muted-foreground">risk: {it.riskLevel}</span>
                      <span className="text-muted-foreground">{new Date(it.ts).toLocaleTimeString()}</span>
                    </div>
                    {!it.resolved && (
                      <button
                        onClick={() => resolveReview(it.id)}
                        className="text-[11px] font-mono px-2 py-0.5 rounded-md border border-green/40 text-green hover:bg-green/10 inline-flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" /> Resolve
                      </button>
                    )}
                  </div>
                  {it.issues.length > 0 && (
                    <ul className="mb-2 text-[11px] text-orange space-y-0.5">
                      {it.issues.map((iss, k) => <li key={k}>⚠ {iss}</li>)}
                    </ul>
                  )}
                  <pre className="font-mono text-[11px] whitespace-pre-wrap text-foreground/85 leading-relaxed bg-card/40 border border-border/40 rounded p-2 max-h-32 overflow-auto">
{it.draftPreview}
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent: "orange" | "cyan" | "green" | "red" }) {
  return (
    <div className={`rounded-lg border p-3 bg-card/60 border-${accent}/40`}>
      <div className="text-[11px] font-mono uppercase tracking-wider text-foreground/70">{label}</div>
      <div className={`font-display text-2xl font-bold text-${accent} mt-0.5`}>{value}</div>
    </div>
  );
}

function VerdictCard({ verdict, reason, reasonCode, ruleId, flag, onAct, egress }: {
  verdict: Verdict; reason: string; reasonCode: string; ruleId: string; flag?: string;
  onAct: () => void; egress: { ok: boolean; msg: string } | null;
}) {
  const cfg = {
    ALLOW: { Icon: ShieldCheck, klass: "verdict-allow", bar: "bar-green", border: "border-green/50", glow: "shadow-[var(--shadow-glow-green)]" },
    ALLOW_WITH_WARNING: { Icon: ShieldAlert, klass: "verdict-warn", bar: "bar-orange", border: "border-orange/50", glow: "shadow-[var(--shadow-glow-orange)]" },
    BLOCK: { Icon: ShieldX, klass: "verdict-block", bar: "bar-red", border: "border-red/60", glow: "shadow-[var(--shadow-glow-red)]" },
  }[verdict];
  const { Icon } = cfg;
  return (
    <div className={`pipeline-stage p-6 ${cfg.border} ${cfg.glow}`}>
      <div className={`stage-bar ${cfg.bar} -mx-6 -mt-6 mb-5`} />
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
        <Shield className="h-3.5 w-3.5" /> 06 · PIM Decision
      </div>
      <div className="flex items-start gap-3">
        <Icon className={`h-10 w-10 ${cfg.klass} flex-shrink-0`} />
        <div className="min-w-0">
          <div className={`font-display font-black text-2xl leading-none ${cfg.klass}`}>{verdict}</div>
          {flag && <div className="font-mono text-[10px] text-primary mt-1 truncate">{flag}</div>}
          <div className="font-mono text-[10px] text-muted-foreground">{ruleId}</div>
        </div>
      </div>
      <p className="mt-4 text-sm text-foreground/90 leading-relaxed">{reason}</p>
      <div className="mt-3 font-mono text-[10px] text-muted-foreground">reasonCode: {reasonCode}</div>
      <button onClick={onAct} className="mt-5 w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
        Voer actie uit (egress + audit)
      </button>
      {egress && (
        <div className={`mt-3 p-3 rounded-lg border text-xs ${egress.ok ? "border-green/40 bg-green/5 text-green" : "border-red/40 bg-red/5 text-red"}`}>
          <div className="font-semibold mb-0.5">{egress.ok ? "Egress uitgevoerd" : "Egress geblokkeerd"}</div>
          <div className="text-foreground/80">{egress.msg}</div>
        </div>
      )}
    </div>
  );
}
