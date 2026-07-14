import { useCallback, useEffect, useMemo, useState } from "react";
import type { Action, Mode, PiiCategory } from "@/lib/pim";
import { usesBert, detectionSettingsToNerVariant, setNerVariant } from "@/lib/pim";
import { useNerSpans } from "@/hooks/useNerSpans";
import { usePimSettings } from "@/hooks/usePimSettings";
import { usePimEngine } from "@/hooks/usePimEngine";
import { AppHeader } from "./AppHeader";
import { StatusFooter } from "./StatusFooter";
import { ProductShellProvider } from "./ProductShellContext";
import { QuickMode } from "./modes/QuickMode";
import { StartMode } from "./modes/StartMode";
import { WriteMode } from "./modes/WriteMode";
import { ExpertPanel } from "./ExpertPanel";
import type { ProductMode } from "./types";
import { DEFAULT_AUTO_REDACT } from "@/components/pim/writer/pimGeneralizations";

/**
 * ProductShell, één gedeelde chrome (header, footer) en één engine-instance
 * voor alle drie de modi. De modi zijn inhoudsvlakken; ze renderen geen
 * eigen header, footer, monitor of trust-badge.
 */
export function ProductShell({ mode }: { mode: ProductMode }) {
  const settings = usePimSettings();
  const [text, setText] = useState("");
  const [pimMode, setPimMode] = useState<Mode>("anonymous");
  const [action, setAction] = useState<Action>("send_external_ai");
  const [writerContent, setWriterContent] = useState<string | null>(null);
  const [writerAutoRedact, setWriterAutoRedact] = useState<ReadonlySet<PiiCategory>>(
    () => new Set(DEFAULT_AUTO_REDACT),
  );
  const [writerStrict, setWriterStrict] = useState(false);
  const [nerEnabled, setNerEnabled] = useState(false);
  const [nerSourceText, setNerSourceText] = useState("");
  const usesNerSlm = usesBert(settings.detectionSettings);

  useEffect(() => {
    const variant = detectionSettingsToNerVariant(settings.detectionSettings);
    if (variant) setNerVariant(variant);
  }, [settings.detectionSettings]);

  // Modus-bewuste bron: schrijfmodus gebruikt de editor-tekst,
  // quick/start gebruiken de shell-`text`. Zo valt een lege writer
  // niet terug op oude Quick-tekst.
  const activeNerText = mode === "write" ? nerSourceText : text;
  const {
    nerSpans,
    nerStatus,
    startNer: startNerLoad,
  } = useNerSpans(activeNerText, { enabled: usesNerSlm && nerEnabled });

  useEffect(() => {
    if (!usesNerSlm) setNerEnabled(false);
  }, [usesNerSlm]);

  useEffect(() => {
    if (usesNerSlm && nerStatus?.working) setNerEnabled(true);
  }, [usesNerSlm, nerStatus?.working]);

  const startNer = useCallback(() => {
    if (!usesNerSlm) return;
    setNerEnabled(true);
    startNerLoad();
  }, [startNerLoad, usesNerSlm]);

  const engineConfig = useMemo(
    () => ({
      detectionSettings: settings.detectionSettings,
      thresholdOverrides: settings.thresholdOverrides,
      disabledCategories: settings.disabledCategories,
      integrity: settings.integrity,
    }),
    [
      settings.detectionSettings,
      settings.thresholdOverrides,
      settings.disabledCategories,
      settings.integrity,
    ],
  );
  const {
    state: engineState,
    evaluate,
    previewDecision,
    requestAction,
    reset,
  } = usePimEngine(engineConfig);

  // Reset-event vanuit BurgerMenu ("nieuwe test").
  useEffect(() => {
    const onReset = () => {
      setText("");
      setNerSourceText("");
      setNerEnabled(false);
      setWriterContent(null);
      setWriterAutoRedact(new Set(DEFAULT_AUTO_REDACT));
      setWriterStrict(false);
      reset();
    };
    window.addEventListener("pim:reset", onReset);
    return () => window.removeEventListener("pim:reset", onReset);
  }, [reset]);

  // Slice C.1, BurgerMenu leest deze flag om te weten of "Nieuwe tekst"
  // een bevestiging moet vragen. Alleen writer-inhoud is duurbaar; quick/start
  // is een tekstveld en verdient geen extra vraag.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const has = writerContent && writerContent.replace(/<[^>]*>/g, "").trim().length > 0;
    document.body.setAttribute("data-pim-writer-has-content", has ? "1" : "0");
    return () => document.body.removeAttribute("data-pim-writer-has-content");
  }, [writerContent]);

  const ctx = useMemo(
    () => ({
      engineState,
      evaluate,
      previewDecision,
      requestAction,
      reset,
      settings,
      text,
      setText,
      mode: pimMode,
      setMode: setPimMode,
      action,
      setAction,
      writerContent,
      setWriterContent,
      writerAutoRedact,
      setWriterAutoRedact,
      writerStrict,
      setWriterStrict,
      usesNerSlm,
      nerEnabled,
      nerSpans,
      nerStatus,
      startNer,
      nerSourceText,
      setNerSourceText,
    }),
    [
      engineState,
      evaluate,
      previewDecision,
      requestAction,
      reset,
      settings,
      text,
      pimMode,
      action,
      writerContent,
      writerAutoRedact,
      writerStrict,
      usesNerSlm,
      nerEnabled,
      nerSpans,
      nerStatus,
      startNer,
      nerSourceText,
    ],
  );

  return (
    <ProductShellProvider value={ctx}>
      <div className="min-h-screen flex flex-col bg-[#f6f7fb] text-[#0f172a]">
        <AppHeader mode={mode} />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
            {mode === "quick" && <QuickMode />}
            {mode === "start" && <StartMode />}
            {mode === "write" && <WriteMode />}
          </div>
        </main>
        <StatusFooter />
        <ExpertPanel mode={mode} />
      </div>
    </ProductShellProvider>
  );
}
