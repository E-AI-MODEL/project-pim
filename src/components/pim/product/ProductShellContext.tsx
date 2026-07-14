import { createContext, useContext } from "react";
import type { Action, Mode } from "@/lib/pim";
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
   * en zou anders zijn Tiptap-state kwijtraken — de shell bewaart de HTML
   * hier zodat quick → write → quick de tekst behoudt.
   */
  writerContent: string | null;
  setWriterContent: (html: string | null) => void;
}

const ProductShellContext = createContext<ProductShellContextValue | null>(null);

export const ProductShellProvider = ProductShellContext.Provider;

export function useProductShell(): ProductShellContextValue {
  const ctx = useContext(ProductShellContext);
  if (!ctx) throw new Error("useProductShell must be used inside <ProductShell>");
  return ctx;
}
