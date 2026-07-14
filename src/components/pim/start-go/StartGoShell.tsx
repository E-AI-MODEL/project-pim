import { useMemo, useState, useEffect } from "react";
import { AlertTriangle, Check, Cpu, Loader2, Sparkles } from "lucide-react";
import {
  usesBert,
  detectionSettingsToNerVariant,
  setNerVariant,
  onRewriteStatus,
  loadRewriteLlm,
  rewriteAnonymousDraft,
  type NerStatus,
  type RewriteStatus,
  type Mode,
  type Action,
  type PiiSpan,
  type EgressResult,
  type PimDecision,
  type PrivacySignals,
} from "@/lib/pim";
import { usePimEngine } from "@/hooks/usePimEngine";
import { useNerSpans } from "@/hooks/useNerSpans";
import { usePimSettings } from "@/hooks/usePimSettings";
import { emitDebug } from "@/lib/pim/debugBus";
import { InputPanel } from "./InputPanel";
import { ModeTargetBar } from "./ModeTargetBar";
import { ResultPanel } from "./ResultPanel";
import { AdvancedPanel } from "./AdvancedPanel";
import type { Example } from "./ExamplePicker";

interface ResultState {
  decision: PimDecision;
  safeText: string;
  originalText: string;
  signals: PrivacySignals;
  mapping: Map<string, string>;
}

export function StartGoShell({ compact = false }: { compact?: boolean } = {}) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("anonymous");
  const [action, setAction] = useState<Action>("send_external_ai");
  const {
    detectionSettings,
    thresholdOverrides,
    disabledCategories,
    integrity,
    advancedPanelProps,
  } = usePimSettings();
  const [nerEnabled, setNerEnabled] = useState(false);
  const [llmStatus, setLlmStatus] = useState<RewriteStatus | null>(null);
  const [llmMsg, setLlmMsg] = useState<string | null>(null);
  const [egressMsg, setEgressMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [llmDraftText, setLlmDraftText] = useState<string | null>(null);
  const usesNerSlm = usesBert(detectionSettings);
  const llmDevice = useLlmDeviceGuard();

  useEffect(() => {
    const variant = detectionSettingsToNerVariant(detectionSettings);
    if (variant) setNerVariant(variant);
  }, [detectionSettings]);

  const {
    nerSpans,
    nerStatus,
    startNer: startNerLoad,
  } = useNerSpans(text, { enabled: usesNerSlm && nerEnabled });

  useEffect(() => onRewriteStatus(setLlmStatus), []);
  useEffect(() => {
    const onReset = () => {
      setText("");
      setCommitted(false);
      setLlmDraftText(null);
      setEgressMsg(null);
      setLlmMsg(null);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("pim:reset", onReset);
    return () => window.removeEventListener("pim:reset", onReset);
  }, []);
  useEffect(() => {
    if (!usesNerSlm) setNerEnabled(false);
  }, [usesNerSlm]);
  useEffect(() => {
    if (usesNerSlm && nerStatus?.working) setNerEnabled(true);
  }, [usesNerSlm, nerStatus?.working]);

  const modelSpans = nerSpans;

  // ── Centrale PiM Evaluation Engine (Fase 2 slice 3) ────────────────────
  // Deze shell doet zelf géén detect / anonymize / guard / decide / egress.
  // Alle logica loopt via @/lib/pim/engine.
  const engineConfig = useMemo(
    () => ({
      detectionSettings,
      thresholdOverrides,
      disabledCategories,
      integrity,
    }),
    [detectionSettings, thresholdOverrides, disabledCategories, integrity],
  );
  const engine = usePimEngine(engineConfig);

  // Live evaluatie op elke input-mutatie — engine is idempotent en snel.
  useMemo(() => {
    if (!text.trim()) return;
    engine.evaluate({
      text,
      mode,
      extraSpans: modelSpans,
      autoRepair: false,
      llmDraftText,
    });
  }, [engine, text, mode, modelSpans, llmDraftText]);

  // Reset llm-override zodra brontekst of modus wijzigt.
  useEffect(() => {
    setLlmDraftText(null);
  }, [text, mode]);

  // Debounced commit — bepaalt wanneer het ResultPanel verschijnt.
  useEffect(() => {
    setCommitted(false);
    setEgressMsg(null);
    if (!text.trim()) return;
    const t = setTimeout(() => setCommitted(true), 450);
    return () => clearTimeout(t);
  }, [
    text,
    mode,
    action,
    modelSpans,
    detectionSettings,
    thresholdOverrides,
    disabledCategories,
    integrity,
    llmDraftText,
  ]);

  const previewSignals: PrivacySignals = engine.state.signals ?? {
    directPii: [],
    contextualPii: [],
    riskScore: 0,
    riskLevel: "low",
    reasons: [],
    ruleIds: [],
  };

  const result: ResultState | null = useMemo(() => {
    if (!committed) return null;
    if (!engine.state.signals || !engine.state.guard || !engine.state.draft) return null;
    const decision = engine.previewDecision(action);
    return {
      decision,
      safeText: engine.state.draft.text,
      originalText: text,
      signals: engine.state.signals,
      mapping: engine.state.pseudoMapping ?? new Map(),
    };
  }, [committed, engine, action, text]);

  // Debug bus — één regel per commit-run, net als de oude run().
  useEffect(() => {
    if (!result) return;
    emitDebug("pipeline.run", `run: ${result.decision.verdict}`, {
      mode,
      action,
      detectionSettings,
      hits: result.signals.directPii.length + result.signals.contextualPii.length,
      nerHits: modelSpans.length,
      draftCheck: engine.state.guard?.status,
      payloadType: engine.state.payloadType,
    });
  }, [
    result,
    mode,
    action,
    detectionSettings,
    modelSpans.length,
    engine.state.guard?.status,
    engine.state.payloadType,
  ]);

  const startNer = () => {
    if (!usesNerSlm) return;
    setNerEnabled(true);
    startNerLoad();
  };
  const startLlm = () => {
    setLlmMsg(null);
    void loadRewriteLlm().catch(() => {});
  };

  // Startknop = direct committen (skip debounce). Engine.evaluate liep al live.
  const run = () => {
    if (!text.trim()) return;
    setCommitted(true);
  };

  const rewriteCurrentResult = async () => {
    if (!result || mode !== "anonymous") return;
    setBusy(true);
    setLlmMsg(null);
    try {
      const rewrite = await rewriteAnonymousDraft(result.safeText);
      setLlmMsg(rewrite.reason);
      if (!rewrite.usedLlm) {
        setEgressMsg(`Qwen: ${rewrite.reason}`);
        return;
      }
      // Zet de LLM-tekst als effective draft; engine.evaluate re-runt guard + decide.
      setLlmDraftText(rewrite.text);
      setCommitted(true);
      setEgressMsg(`Qwen: ${rewrite.reason}`);
      emitDebug("model.llm.rewrite", rewrite.reason, {
        inputLen: result.safeText.length,
        outputLen: rewrite.text.length,
      });
    } finally {
      setBusy(false);
    }
  };

  const onPrimary = async (editedText: string) => {
    if (!result) return;
    if (result.decision.verdict === "BLOCK") {
      setCommitted(false);
      setEgressMsg(null);
      return;
    }
    setBusy(true);
    try {
      const outcome = await engine.requestAction({ action, payloadText: editedText });
      setEgressMsg(outcome.executed ? `✓ ${outcome.reason}` : `✗ ${outcome.reason}`);
    } finally {
      setBusy(false);
    }
  };
  const runQuickAction = async (editedText: string, quickAction: Action): Promise<EgressResult> => {
    if (!result) return { executed: false, reason: "no result" };
    const outcome = await engine.requestAction({ action: quickAction, payloadText: editedText });
    emitDebug(
      "pipeline.execute",
      outcome.executed ? "quick egress toegestaan" : "quick egress geblokt",
      {
        executed: outcome.executed,
        reason: outcome.reason,
        action: quickAction,
        quick: true,
      },
    );
    return { executed: outcome.executed, reason: outcome.reason };
  };
  const onExample = (e: Example) => {
    setText(e.text);
    setCommitted(false);
    setLlmDraftText(null);
    setEgressMsg(null);
    setLlmMsg(null);
  };

  return (
    <div
      className={compact ? "space-y-5" : "mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-14 space-y-7"}
    >
      <InputPanel
        text={text}
        onTextChange={(v) => {
          setText(v);
          setCommitted(false);
          setLlmDraftText(null);
          setEgressMsg(null);
          setLlmMsg(null);
        }}
        onStart={run}
        onExample={onExample}
        busy={busy}
        compact={compact}
        mode={mode}
        onModeChange={setMode}
        action={action}
        onActionChange={setAction}
      />
      {!compact && (
        <ModeTargetBar
          mode={mode}
          onModeChange={setMode}
          action={action}
          onActionChange={setAction}
        />
      )}
      <LocalModelStrip
        compact={compact}
        bertEnabled={usesNerSlm}
        nerEnabled={nerEnabled}
        nerStatus={nerStatus}
        nerSpans={nerSpans}
        onStartNer={startNer}
        llmStatus={llmStatus}
        llmDeviceHint={llmDevice.reason}
        mode={mode}
        hasResult={!!result}
        onStartLlm={startLlm}
        onRewrite={rewriteCurrentResult}
        llmMsg={llmMsg}
        busy={busy}
      />
      <AdvancedPanel
        {...advancedPanelProps}
        ner={{ status: nerStatus, onStart: startNer, available: usesNerSlm }}
      />
      {!result && text.trim().length > 0 && (
        <div
          className={`text-xs border-l-2 pl-3 animate-pulse ${compact ? "text-[#e8edf3]/60 border-[#3b6fa0]/50" : "text-muted-foreground border-primary/40"}`}
        >
          PiM leest mee… tot nu toe{" "}
          {previewSignals.directPii.length + previewSignals.contextualPii.length} signalen gevonden.
        </div>
      )}
      {result && (
        <ResultPanel
          decision={result.decision}
          safeText={result.safeText}
          originalText={result.originalText}
          signals={result.signals}
          mapping={result.mapping}
          integrity={integrity}
          onPrimary={onPrimary}
          onCopy={(t) => runQuickAction(t, "copy")}
          onDownload={(t) => runQuickAction(t, "export_file")}
          egressMsg={egressMsg}
          busy={busy}
          onOriginalChange={(v) => {
            setText(v);
            setEgressMsg(null);
          }}
          detectionSettings={detectionSettings}
          disabledCategories={disabledCategories}
          thresholdOverrides={thresholdOverrides}
        />
      )}
    </div>
  );
}

function LocalModelStrip({
  compact,
  bertEnabled,
  nerEnabled,
  nerStatus,
  nerSpans,
  onStartNer,
  llmStatus,
  llmDeviceHint,
  mode,
  hasResult,
  onStartLlm,
  onRewrite,
  llmMsg,
  busy,
}: {
  compact: boolean;
  bertEnabled: boolean;
  nerEnabled: boolean;
  nerStatus: NerStatus | null;
  nerSpans: PiiSpan[];
  onStartNer: () => void;
  llmStatus: RewriteStatus | null;
  llmDeviceHint: string | null;
  mode: Mode;
  hasResult: boolean;
  onStartLlm: () => void;
  onRewrite: () => void;
  llmMsg: string | null;
  busy: boolean;
}) {
  const nerKind = modelStatusKind(nerStatus);
  const llmKind = modelStatusKind(llmStatus);
  const qwenReady = llmKind === "ready";
  const canRewrite = qwenReady && mode === "anonymous" && hasResult && !busy;
  const qwenButton = !qwenReady
    ? llmKind === "error"
      ? "Opnieuw"
      : llmKind === "loading"
        ? "Download bezig"
        : "Download Qwen"
    : mode !== "anonymous"
      ? "Alleen anoniem"
      : hasResult
        ? "Herschrijf"
        : "Qwen klaar";
  return (
    <div className="space-y-2">
      <div
        className={`grid gap-2 ${compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 md:grid-cols-2"}`}
      >
        <ModelCard
          icon="ner"
          title="BERT"
          kind={!bertEnabled ? "idle" : nerKind}
          pct={normalizePct(nerStatus?.progress?.pct)}
          sub={
            !bertEnabled
              ? "Uit - Regex, Lexicon en Context blijven werken"
              : nerKind === "ready"
                ? `${nerStatus?.variant === "large" ? "180 MB" : "100 MB"} - ${nerStatus?.runtime?.toUpperCase() ?? "MODEL"} - werkt - ${nerSpans.length} extra hits`
                : nerKind === "loading"
                  ? (nerStatus?.progress?.file ?? `BERT ${nerStatus?.healthPhase ?? "laden"}`)
                  : nerKind === "error"
                    ? "Laden of testen mislukt"
                    : "Lokaal taalmodel dat woorden labelt als persoon, organisatie of plaats"
          }
          detail={nerStatus?.healthError ?? nerStatus?.error ?? null}
          buttonLabel={
            nerKind === "ready"
              ? "Werkt"
              : nerKind === "loading"
                ? "Bezig"
                : nerKind === "error"
                  ? "Opnieuw"
                  : "Laden/testen"
          }
          onClick={onStartNer}
          disabled={!bertEnabled || nerKind === "ready" || nerKind === "loading"}
        />
        <ModelCard
          icon="llm"
          title="Qwen"
          kind={llmKind}
          pct={normalizePct(llmStatus?.progress?.pct)}
          sub={
            qwenReady
              ? "Lokaal LLM klaar. Formuleert tekst opnieuw; PiM controleert daarna opnieuw."
              : llmKind === "loading"
                ? (llmStatus?.progress?.text ?? "Modeldownload bezig")
                : llmKind === "error"
                  ? "Laden mislukt - probeer opnieuw"
                  : llmDeviceHint
                    ? `Beschikbaar, maar mogelijk zwaar: ${llmDeviceHint}`
                    : "Lokaal LLM dat je tekst opnieuw formuleert"
          }
          detail={llmStatus?.error ?? llmMsg}
          buttonLabel={qwenButton}
          onClick={qwenReady ? onRewrite : onStartLlm}
          disabled={busy || llmKind === "loading" || (qwenReady && !canRewrite)}
        />
      </div>
    </div>
  );
}

function ModelCard({
  icon,
  title,
  kind,
  pct,
  sub,
  detail,
  buttonLabel,
  onClick,
  disabled,
}: {
  icon: "ner" | "llm";
  title: string;
  kind: "ready" | "loading" | "error" | "idle";
  pct?: number;
  sub: string;
  detail: string | null;
  buttonLabel: string;
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon =
    kind === "ready"
      ? Check
      : kind === "loading"
        ? Loader2
        : kind === "error"
          ? AlertTriangle
          : icon === "ner"
            ? Cpu
            : Sparkles;
  const tone =
    kind === "ready"
      ? "border-emerald-400/45 bg-emerald-400/5 text-emerald-200"
      : kind === "loading"
        ? "border-amber-400/45 bg-amber-400/5 text-amber-200"
        : kind === "error"
          ? "border-rose-400/45 bg-rose-400/5 text-rose-200"
          : "border-[#3b6fa0]/30 bg-[#0f1b3d]/45 text-[#e8edf3]/75";
  const led =
    kind === "ready"
      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
      : kind === "loading"
        ? "bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.9)] animate-pulse"
        : kind === "error"
          ? "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.9)]"
          : "bg-[#3b6fa0]/70";
  return (
    <div className={`rounded-xl border p-3 min-w-0 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0a142e]/65 border border-white/10">
            <Icon className={`h-3.5 w-3.5 ${kind === "loading" ? "animate-spin" : ""}`} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-serif-display text-sm text-[#e8edf3] truncate">
              <span className={`h-2 w-2 rounded-full ${led}`} aria-hidden />
              <span className="truncate">{title}</span>
            </div>
            <div className="text-[11px] text-[#e8edf3]/62 leading-snug break-words">{sub}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="shrink-0 h-8 px-2 rounded-md border border-[#3b6fa0]/35 bg-[#3b6fa0]/18 text-[10px] font-plex-mono uppercase tracking-wider text-[#e8edf3] hover:bg-[#3b6fa0]/32 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {buttonLabel}
        </button>
      </div>
      {kind === "loading" && typeof pct === "number" && (
        <div className="mt-3 h-1.5 rounded bg-[#0a142e]/70 overflow-hidden">
          <div className="h-full bg-amber-300/75 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      {detail && (
        <div className="mt-2 text-[10px] font-plex-mono text-[#e8edf3]/55 break-words">
          {detail}
        </div>
      )}
    </div>
  );
}

function modelStatusKind(
  s: { loading?: boolean; ready?: boolean; error?: string | null } | null,
): "ready" | "loading" | "error" | "idle" {
  if (s?.error) return "error";
  if (s?.ready) return "ready";
  if (s?.loading) return "loading";
  return "idle";
}
function normalizePct(pct?: number): number | undefined {
  if (typeof pct !== "number" || Number.isNaN(pct)) return undefined;
  const n = pct <= 1 ? pct * 100 : pct;
  return Math.max(0, Math.min(100, Math.round(n)));
}
function useLlmDeviceGuard(): { blocked: boolean; reason: string | null } {
  const [state, setState] = useState<{ blocked: boolean; reason: string | null }>({
    blocked: false,
    reason: null,
  });
  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    const mobile = window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const lowMem = typeof mem === "number" && mem < 4;
    const hasWebGpu = !!(navigator as Navigator & { gpu?: unknown }).gpu;
    const reason = !hasWebGpu
      ? "WebGPU nodig"
      : mobile
        ? "Desktop aanbevolen"
        : lowMem
          ? "Minimaal 4 GB RAM"
          : null;
    setState({ blocked: !!reason, reason });
  }, []);
  return state;
}
