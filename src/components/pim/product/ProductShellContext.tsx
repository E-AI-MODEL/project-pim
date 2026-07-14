import { createContext, useContext } from "react";
import type { Action, Mode } from "@/lib/pim";
import type { UsePimEngineResult } from "@/hooks/usePimEngine";
import type { PimSettings } from "@/hooks/usePimSettings";

export interface ProductShellContextValue {
  engine: UsePimEngineResult;
  settings: PimSettings;
  text: string;
  setText: (v: string) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
  action: Action;
  setAction: (a: Action) => void;
}

const ProductShellContext = createContext<ProductShellContextValue | null>(null);

export const ProductShellProvider = ProductShellContext.Provider;

export function useProductShell(): ProductShellContextValue {
  const ctx = useContext(ProductShellContext);
  if (!ctx) throw new Error("useProductShell must be used inside <ProductShell>");
  return ctx;
}