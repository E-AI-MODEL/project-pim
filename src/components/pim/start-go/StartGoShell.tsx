// §8.1 — alleen state + PIM-koppeling. GEEN uitleg.
import { useMemo, useState, useEffect, useRef } from "react";
import {
  computeSignals, anonymize, pseudonymize, draftCheck, decide, executeAction,
  modelGateFor, onModelIntegrity, type ModelIntegrityRecord,
  DEFAULT_PROFILE, type CertifiedPayload, type PayloadType,
  type Mode, type Action, type PipelineProfileId, type PiiCategory,
} from "@/lib/pim";
import { emitDebug } from "@/lib/pim/debugBus";
import { InputPanel } from "./InputPanel";
import { ModeTargetBar } from "./ModeTargetBar";
import { ResultPanel } from "./ResultPanel";
import { AdvancedPanel } from "./AdvancedPanel";
import type { Example } from "./ExamplePicker";

interface ResultState {
  decision: ReturnType<typeof decide>;
  safeText: string;
  originalText: string;
  signals: ReturnType<typeof computeSignals>;
  mapping: Map<string, string>;
}

export function StartGoShell({ compact = false }: { compact?: boolean } = {}) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("anonymous");
  const [action, setAction] = useState<Action>("send_external_ai");
  const [profileId, setProfileId] = useState<PipelineProfileId>(DEFAULT_PROFILE);
  const [thresholdOverrides, setThresholdOverrides] = useState<Partial<Record<Action, number>>>({});
  const [disabledCategories, setDisabledCategories] = useState<ReadonlySet<PiiCategory>>(new Set());
  const [integrity, setIntegrity] = useState<ModelIntegrityRecord[]>([]);
  const [result, setResult] = useState<ResultState | null>(null);
  const [egressMsg, setEgressMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => onModelIntegrity(setIntegrity), []);

  // Globaal reset-event (uit burgermenu "Nieuwe controle").
  useEffect(() => {
    const onReset = () => {
      setText("");
      setResult(null);
      setEgressMsg(null);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("pim:reset", onReset);
    return () => window.removeEventListener("pim:reset", onReset);
  }, []);

  // Live preview-signals (zonder PiM uit te voeren).
  const previewSignals = useMemo(
    () => computeSignals(text, [], profileId, disabledCategories),
    [text, profileId, disabledCategories],
  );

  // Live oordeel: debounced auto-run zodra de tekst stabiel is.
  // Gebruiker krijgt instant feedback; expliciete knop blijft de
  // formele bevestiging (zelfde codepad) en voert de actie pas uit.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setResult(null); setEgressMsg(null); return; }
    debounceRef.current = setTimeout(() => { run(); }, 450);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, mode, action, integrity, profileId, thresholdOverrides, disabledCategories]);

  const run = () => {
    if (!text.trim()) return;
    setBusy(true);
    const t0 = performance.now();
    try {
      const signals = computeSignals(text, [], profileId, disabledCategories);
      let draft;
      let mapping = new Map<string, string>();
      if (mode === "anonymous") {
        draft = anonymize(text, signals);
      } else {
        const pseudo = pseudonymize(text, signals);
        draft = pseudo.draft;
        mapping = pseudo.mapping;
      }
      const guard = draftCheck(draft, mode);
      const gate = modelGateFor(profileId, action, integrity);
      const payloadType: PayloadType =
        mode === "anonymous" && guard.status === "pass" ? "draft_anonymous_certified" :
        mode === "pseudonymous" ? "draft_pseudonymous_local" :
        "unknown";
      const decisionSignals = computeSignals(draft.text, [], profileId, disabledCategories);
      const decision = decide({
        mode, action, signals: decisionSignals, draftCheck: guard,
        modelVerified: gate.verified, profileId, payloadType, thresholdOverrides,
      });
      setResult({ decision, safeText: draft.text, originalText: text, signals, mapping });
      setEgressMsg(null);
      emitDebug("pipeline.run", `run: ${decision.verdict}`, {
        ms: Math.round(performance.now() - t0),
        inputLen: text.length,
        mode, action, profile: profileId,
        signals: signals.directPii.length + signals.contextualPii.length,
        directHits: signals.directPii.length,
        contextualHits: signals.contextualPii.length,
        draftCheck: guard.status,
        modelGate: gate.reason,
        verdict: decision.verdict,
        payloadType,
      });
    } finally {
      setBusy(false);
    }
  };

  const buildCertified = (editedText: string): CertifiedPayload => {
    if (!result) throw new Error("no result");
    // Bij elke bewerking is de payload niet langer "certified" als anoniem
    // veilig: laat draftCheck herbeoordelen via guardStatus="repair" pad zodat
    // executeAction de re-consult doet.
    const guardStatus =
      result.decision.payloadType === "draft_anonymous_certified" && editedText === result.safeText
        ? ("pass" as const)
        : ("repair" as const);
    return {
      text: editedText,
      mode: result.decision.mode,
      payloadType: result.decision.payloadType ?? "unknown",
      profileId: result.decision.profileId ?? profileId,
      guardStatus,
    };
  };

  const onPrimary = async (editedText: string) => {
    if (!result) return;
    if (result.decision.verdict === "BLOCK") {
      // Reset → trigger nieuwe ronde; gebruiker past tekst aan.
      setResult(null);
      setEgressMsg(null);
      return;
    }
    setBusy(true);
    try {
      const certified = buildCertified(editedText);
      const r = await executeAction(result.decision, certified);
      setEgressMsg(r.executed ? `✓ ${r.reason}` : `✗ ${r.reason}`);
      emitDebug("pipeline.execute", r.executed ? "egress toegestaan" : "egress geblokt", {
        executed: r.executed, reason: r.reason, action: result.decision.action,
      });
    } finally {
      setBusy(false);
    }
  };

  // Egress-gated quick-actions vanuit ResultActions. We bouwen een nep-decision
  // met de juiste action (copy/export_file) en hergebruiken alle drempels.
  const runQuickAction = async (editedText: string, quickAction: Action) => {
    if (!result) return { executed: false, reason: "no result" };
    const certified = buildCertified(editedText);
    // Hergebruik dezelfde verdict-evaluatie maar laat executeAction zelf
    // bepalen op basis van payload + decision.action.
    const quickDecision = { ...result.decision, action: quickAction };
    const r = await executeAction(quickDecision, certified);
    emitDebug("pipeline.execute", r.executed ? "quick egress toegestaan" : "quick egress geblokt", {
      executed: r.executed, reason: r.reason, action: quickAction,
      quick: true,
    });
    return r;
  };

  const onCopy = (editedText: string) => runQuickAction(editedText, "copy");
  const onDownload = (editedText: string) => runQuickAction(editedText, "export_file");

  const onExample = (e: Example) => {
    setText(e.text);
    setResult(null);
    setEgressMsg(null);
  };

  return (
    <div className={compact ? "space-y-5" : "mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-14 space-y-7"}>
      <InputPanel
        text={text}
        onTextChange={(v) => { setText(v); setResult(null); setEgressMsg(null); }}
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
        <ModeTargetBar mode={mode} onModeChange={setMode} action={action} onActionChange={setAction} />
      )}

      <AdvancedPanel
        profileId={profileId}
        onProfileChange={setProfileId}
        thresholds={thresholdOverrides}
        onThresholdChange={(a, v) => setThresholdOverrides((prev) => ({ ...prev, [a]: v }))}
        onResetThresholds={() => setThresholdOverrides({})}
        integrity={integrity}
        disabledCategories={disabledCategories}
        onToggleCategory={(cat) => setDisabledCategories((prev) => {
          const next = new Set(prev);
          if (next.has(cat)) next.delete(cat); else next.add(cat);
          return next;
        })}
        onResetCategories={() => setDisabledCategories(new Set())}
      />

      {!result && text.trim().length > 0 && (
        <div className={`text-xs border-l-2 pl-3 animate-pulse ${compact ? "text-[#e8edf3]/60 border-[#3b6fa0]/50" : "text-muted-foreground border-primary/40"}`}>
          PiM leest mee… tot nu toe {previewSignals.directPii.length + previewSignals.contextualPii.length} {previewSignals.directPii.length + previewSignals.contextualPii.length === 1 ? "signaal" : "signalen"} gevonden.
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
          onCopy={onCopy}
          onDownload={onDownload}
          egressMsg={egressMsg}
          busy={busy}
          onOriginalChange={(v) => { setText(v); setEgressMsg(null); }}
          profileId={profileId}
          disabledCategories={disabledCategories}
          thresholdOverrides={thresholdOverrides}
        />
      )}
    </div>
  );
}