// §8.1 — alleen state + PIM-koppeling. GEEN uitleg.
import { useMemo, useState, useEffect, useRef } from "react";
import {
  computeSignals, anonymize, pseudonymize, draftCheck, decide, executeAction,
  modelGateFor, onModelIntegrity, type ModelIntegrityRecord,
  DEFAULT_PROFILE, type CertifiedPayload, type PayloadType,
  type Mode, type Action, type PipelineProfileId, type PiiCategory,
} from "@/lib/pim";
import { InputPanel } from "./InputPanel";
import { ModeTargetBar } from "./ModeTargetBar";
import { ResultPanel } from "./ResultPanel";
import { AdvancedPanel } from "./AdvancedPanel";
import type { Example } from "./ExamplePicker";

interface ResultState {
  decision: ReturnType<typeof decide>;
  safeText: string;
  signals: ReturnType<typeof computeSignals>;
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
    try {
      const signals = computeSignals(text, [], profileId, disabledCategories);
      const draft = mode === "anonymous"
        ? anonymize(text, signals)
        : pseudonymize(text, signals).draft;
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
      setResult({ decision, safeText: draft.text, signals: decisionSignals });
      setEgressMsg(null);
    } finally {
      setBusy(false);
    }
  };

  const onPrimary = async () => {
    if (!result) return;
    if (result.decision.verdict === "BLOCK") {
      // Reset → trigger nieuwe ronde; gebruiker past tekst aan.
      setResult(null);
      setEgressMsg(null);
      return;
    }
    setBusy(true);
    try {
      const guardStatus = result.decision.payloadType === "draft_anonymous_certified" ? "pass" as const : "repair" as const;
      const certified: CertifiedPayload = {
        text: result.safeText,
        mode: result.decision.mode,
        payloadType: result.decision.payloadType ?? "unknown",
        profileId: result.decision.profileId ?? profileId,
        guardStatus,
      };
      const r = await executeAction(result.decision, certified);
      setEgressMsg(r.executed ? `✓ ${r.reason}` : `✗ ${r.reason}`);
    } finally {
      setBusy(false);
    }
  };

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
          signals={result.signals}
          integrity={integrity}
          onPrimary={onPrimary}
          egressMsg={egressMsg}
          busy={busy}
        />
      )}
    </div>
  );
}