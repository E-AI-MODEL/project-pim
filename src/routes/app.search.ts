import { normalizeProductMode, type ProductMode } from "@/components/pim/product/types";

/**
 * Lokale, dependencyvrije validator voor de ?mode= search param op /app.
 * Accepteert "check" | "write"; oude waarden "quick"/"start" worden
 * genormaliseerd naar "check". Fallback = "check".
 */
export function validateAppSearch(input: Record<string, unknown>): { mode: ProductMode } {
  return { mode: normalizeProductMode(input?.mode) };
}
