export type ProductMode = "check" | "write";

export const PRODUCT_MODES: ProductMode[] = ["check", "write"];

export function isProductMode(v: unknown): v is ProductMode {
  return v === "check" || v === "write";
}

/**
 * Oude links (?mode=quick / ?mode=start) blijven werken: beide gingen op in
 * één "Tekst nakijken"-scherm.
 */
export function normalizeProductMode(v: unknown): ProductMode {
  if (isProductMode(v)) return v;
  if (v === "quick" || v === "start") return "check";
  return "check";
}

export const MODE_LABEL: Record<ProductMode, string> = {
  check: "Tekst nakijken",
  write: "Zelf schrijven",
};

export const MODE_EXPECTATION: Record<ProductMode, string> = {
  check: "Plak of upload je tekst. Je hoort of je hem mag delen en krijgt een versie zonder persoonsgegevens.",
  write:
    "Schrijf hier je tekst. PiM kleurt persoonsgegevens terwijl je typt en haalt ze op verzoek weg. Opslaan als Word-bestand.",
};
