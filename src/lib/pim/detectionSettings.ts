// Profile-free PiM detection settings.
// User-facing UI talks in layers: Regex, Lexicon, Context, BERT 100 MB, BERT 180 MB.
// Legacy pipeline profiles stay out of the runtime/UI surface.

import type { NerVariantKey } from "./modelCatalog";

export type BertChoice = "off" | "100mb" | "180mb";

export interface DetectionLayerSettings {
  /** Always true in the normal product: code-based fixed-pattern search. */
  regex: true;
  /** School/education word lists. */
  lexicon: boolean;
  /** Combination checks that can make a person identifiable. */
  context: boolean;
  /** Exactly one BERT variant is active, or none. */
  bert: BertChoice;
}

export const DEFAULT_DETECTION_SETTINGS: DetectionLayerSettings = {
  regex: true,
  lexicon: true,
  context: true,
  bert: "100mb",
};

export const RULES_ONLY_DETECTION_SETTINGS: DetectionLayerSettings = {
  regex: true,
  lexicon: true,
  context: false,
  bert: "off",
};

export const DESIGN_ONLY_DETECTION_SETTINGS: DetectionLayerSettings = {
  regex: true,
  lexicon: true,
  context: true,
  bert: "off",
};

export function detectionSettingsToNerVariant(
  settings: DetectionLayerSettings,
): NerVariantKey | null {
  if (settings.bert === "100mb") return "small";
  if (settings.bert === "180mb") return "large";
  return null;
}

export function nerVariantToBertChoice(variant: NerVariantKey): BertChoice {
  return variant === "large" ? "180mb" : "100mb";
}

export function usesBert(settings: DetectionLayerSettings): boolean {
  return settings.bert !== "off";
}

function profileStringToDetectionSettings(profileId: string): DetectionLayerSettings {
  if (profileId === "education-nl-rules-only") return RULES_ONLY_DETECTION_SETTINGS;
  if (profileId === "healthcare-nl" || profileId.includes("design"))
    return DESIGN_ONLY_DETECTION_SETTINGS;
  return DEFAULT_DETECTION_SETTINGS;
}

/**
 * Compatibility shim for older call sites/tests that may still pass a profile id.
 * Strings are mapped explicitly instead of silently defaulting.
 */
export function coerceDetectionSettings(
  input?: DetectionLayerSettings | string | null,
): DetectionLayerSettings {
  if (!input) return DEFAULT_DETECTION_SETTINGS;
  if (typeof input === "string") return profileStringToDetectionSettings(input);
  return { ...DEFAULT_DETECTION_SETTINGS, ...input, regex: true };
}

export const DETECTION_LAYER_COPY = {
  regex: {
    title: "Regex",
    description:
      "Code die vaste patronen zoekt. Geen taalmodel. Vindt bijvoorbeeld BSN, e-mail, telefoonnummer, IBAN, postcode, leerlingnummer, datums en documentnummers.",
  },
  lexicon: {
    title: "Lexicon",
    description:
      "Woordenlijst voor school- en onderwijswoorden, zoals schoolsystemen, toetsnamen, schooltypen en onderwijsorganisaties.",
  },
  context: {
    title: "Context",
    description:
      "PiM zoekt combinaties waardoor iemand herkenbaar kan worden, zoals zorg + leerling, incident + klas, of kleine groep + locatie.",
  },
  bert100: {
    title: "BERT 100 MB",
    description:
      "Lokaal taalmodel dat woorden labelt als persoon, organisatie of plaats. Sneller en kleiner.",
  },
  bert180: {
    title: "BERT 180 MB",
    description:
      "Lokaal taalmodel dat woorden labelt als persoon, organisatie of plaats. Groter en zwaarder.",
  },
  qwen: {
    title: "Qwen",
    description:
      "Lokaal LLM dat je tekst opnieuw formuleert. Daarna controleert PiM de uitkomst opnieuw.",
  },
} as const;
