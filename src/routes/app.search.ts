import { isProductMode, type ProductMode } from "@/components/pim/product/types";

/**
 * Lokale, dependencyvrije validator voor de ?mode= search param op /app.
 * Accepteert uitsluitend "quick" | "start" | "write"; fallback = "quick".
 */
export function validateAppSearch(input: Record<string, unknown>): { mode: ProductMode } {
  const raw = input?.mode;
  return { mode: isProductMode(raw) ? raw : "quick" };
}