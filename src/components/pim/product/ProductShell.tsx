import { useEffect, useMemo, useState } from "react";
import type { Action, Mode } from "@/lib/pim";
import { usePimSettings } from "@/hooks/usePimSettings";
import { usePimEngine } from "@/hooks/usePimEngine";
import { AppHeader } from "./AppHeader";
import { StatusFooter } from "./StatusFooter";
import { ProductShellProvider } from "./ProductShellContext";
import { QuickMode } from "./modes/QuickMode";
import { StartMode } from "./modes/StartMode";
import { WriteMode } from "./modes/WriteMode";
import type { ProductMode } from "./types";

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
      reset();
    };
    window.addEventListener("pim:reset", onReset);
    return () => window.removeEventListener("pim:reset", onReset);
  }, [reset]);

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
    }),
    [engineState, evaluate, previewDecision, requestAction, reset, settings, text, pimMode, action],
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
      </div>
    </ProductShellProvider>
  );
}
