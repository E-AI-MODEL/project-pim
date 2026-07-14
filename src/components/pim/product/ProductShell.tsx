import { useEffect, useMemo, useState } from "react";
import type { Action, Mode, PiiCategory } from "@/lib/pim";
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
 * ProductShell — één gedeelde chrome (header, footer) en één engine-instance
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
      setWriterContent(null);
      setWriterAutoRedact(new Set(DEFAULT_AUTO_REDACT));
      setWriterStrict(false);
      reset();
    };
    window.addEventListener("pim:reset", onReset);
    return () => window.removeEventListener("pim:reset", onReset);
  }, [reset]);

  // Slice C.1 — BurgerMenu leest deze flag om te weten of "Nieuwe tekst"
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
    ],
  );

  return (
    <ProductShellProvider value={ctx}>
      <div className="min-h-screen flex flex-col bg-[#0a1330] text-[#e8edf3]">
        <AppHeader mode={mode} />
        <main className="flex-1">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
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
