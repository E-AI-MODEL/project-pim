import { createContext, useContext } from "react";
import type { Action, Mode, NerStatus, PiiCategory, PiiSpan } from "@/lib/pim";
import type { EngineState, PimEngine } from "@/lib/pim/engine";
import type { PimSettings } from "@/hooks/usePimSettings";

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
   * Cached editor HTML voor WriteMode. WriterWorkspace unmount bij modewissel
   * en zou anders zijn Tiptap-state kwijtraken, de shell bewaart de HTML
   * hier zodat quick → write → quick de tekst behoudt.
   */
  writerContent: string | null;
  setWriterContent: (html: string | null) => void;
  /**
   * Writer-specifieke instellingen leven op shell-niveau zodat het gedeelde
   * expertpaneel ze kan bewerken zonder dat WriterWorkspace een eigen
   * AdvancedPanel hoeft te renderen.
   */
  writerAutoRedact: ReadonlySet<PiiCategory>;
  setWriterAutoRedact: (next: ReadonlySet<PiiCategory>) => void;
  writerStrict: boolean;
  setWriterStrict: (v: boolean) => void;
  /**
   * Centrale NER/BERT-runtime, gedeeld door Quick, Start en Write.
   * `nerSourceText` is de tekstbron die actief door NER moet;
   * in write-mode zet WriterWorkspace hier zijn plainText in,
   * in quick/start valt `ProductShell` terug op de shell-`text`.
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
