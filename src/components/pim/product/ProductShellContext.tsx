import { createContext, useContext } from "react";
import type { Action, Mode, NerStatus, PiiCategory, PiiSpan } from "@/lib/pim";
import type { EngineState, PimEngine } from "@/lib/pim/engine";
import type { PimSettings } from "@/hooks/usePimSettings";

/** Wanneer PiM kijkt: meelezen terwijl je typt, of pas als jij het vraagt. */
export type AnalysisMode = "live" | "manual";

export interface ProductShellContextValue {
  engineState: EngineState;
  evaluate: PimEngine["evaluate"];
  previewDecision: PimEngine["previewDecision"];
  requestAction: PimEngine["requestAction"];
  reset: PimEngine["reset"];
  settings: PimSettings;
  text: string;
  setText: (v: string) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
  action: Action;
  setAction: (a: Action) => void;
  /**
   * Eén analysemodel voor beide schermen. `analysisTick` telt op zodra de
   * gebruiker "Nu nakijken" kiest; schermen luisteren daarop in plaats van
   * ieder een eigen knop en debounce te bouwen. `isStale` betekent: de tekst
   * is veranderd sinds de laatste uitkomst.
   */
  analysisMode: AnalysisMode;
  setAnalysisMode: (m: AnalysisMode) => void;
  analysisTick: number;
  runAnalysis: () => void;
  isStale: boolean;
  markStale: () => void;
  clearStale: () => void;
  /**
   * Cached editor HTML voor WriteMode. WriterWorkspace unmount bij modewissel
   * en zou anders zijn Tiptap-state kwijtraken, de shell bewaart de HTML
   * hier zodat nakijken → schrijven → nakijken de tekst behoudt.
   */
  writerContent: string | null;
  setWriterContent: (html: string | null) => void;
  /**
   * Schrijf-instellingen leven op shell-niveau zodat het gedeelde
   * instellingenpaneel ze kan bewerken zonder dat WriterWorkspace een eigen
   * paneel hoeft te renderen.
   */
  writerAutoRedact: ReadonlySet<PiiCategory>;
  setWriterAutoRedact: (next: ReadonlySet<PiiCategory>) => void;
  writerStrict: boolean;
  setWriterStrict: (v: boolean) => void;
  /**
   * Centrale NER/BERT-runtime, gedeeld door beide schermen.
   * `nerSourceText` is de tekstbron die actief door NER moet;
   * in het schrijfscherm zet WriterWorkspace hier zijn plainText in,
   * bij nakijken valt `ProductShell` terug op de shell-`text`.
   */
  usesNerSlm: boolean;
  nerEnabled: boolean;
  nerSpans: PiiSpan[];
  nerStatus: NerStatus | null;
  startNer: () => void;
  nerSourceText: string;
  setNerSourceText: (v: string) => void;
}

const ProductShellContext = createContext<ProductShellContextValue | null>(null);

export const ProductShellProvider = ProductShellContext.Provider;

export function useProductShell(): ProductShellContextValue {
  const ctx = useContext(ProductShellContext);
  if (!ctx) throw new Error("useProductShell must be used inside <ProductShell>");
  return ctx;
}
