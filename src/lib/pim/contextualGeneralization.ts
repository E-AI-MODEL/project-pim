// Contextual Generalization + Repair, spec hfst 29 + 31.
// Doel: residuele kleine-groep / locatie / temporele specificiteit
// generaliseren zodat de Draft Check Guard alsnog "pass" geeft.
// Loopt ALLEEN op de output van anonymize() (anonieme modus), nooit
// op pseudonymous (daar zou het tokens kunnen breken).

import type { PrivacySignals } from "./types";

const RUBRIC_PATTERNS: { test: (s: PrivacySignals) => boolean; apply: (t: string) => string }[] = [
  {
    // Kleine-groep risico: groep 1-8, klas 5A, 4 vwo, etc.
    test: (s) =>
      s.directPii.some((p) => p.category === "context_small_group") ||
      s.contextualPii.some((p) => p.category === "context_small_group"),
    apply: (t) =>
      t
        .replace(/\b(?:groep|klas)\s?[1-8][A-Za-z]?\b/gi, "een groep")
        .replace(/\b[1-6]\s?(?:havo|vwo|vmbo|mavo|gymnasium)[A-Za-z]?\b/gi, "een onderwijsniveau"),
  },
  {
    // Zorg / incident / safeguarding → ontper­soon­lijk voornaamwoorden in zachte zin.
    test: (s) =>
      s.directPii.some((p) => p.category === "context_care" || p.category === "context_incident") ||
      s.contextualPii.some(
        (p) => p.category === "context_care" || p.category === "context_incident",
      ),
    apply: (t) => t.replace(/\b(?:hij|zij|hem|haar)\b/gi, "de persoon"),
  },
  {
    // Temporele specificiteit
    test: () => true,
    apply: (t) =>
      t
        .replace(/\b(?:gisteren|vandaag|vorige week|afgelopen \w+)\b/gi, "in een recente periode")
        .replace(
          /\b\d{1,2}\s?(?:januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\b/gi,
          "een periode",
        ),
  },
  {
    // Locatie-specificiteit ("in Utrecht", "in Amsterdam")
    test: () => true,
    apply: (t) => t.replace(/\bin\s+[A-Z][a-z]{2,}\b/g, "in een regio"),
  },
];

export function applyContextualGeneralization(text: string, signals: PrivacySignals): string {
  let out = text;
  for (const rule of RUBRIC_PATTERNS) {
    if (rule.test(signals)) out = rule.apply(out);
  }
  return out;
}

/** Repair: pas generalisatie toe + brede fallback patronen. Spec hfst 31. */
export function repairAnonymousDraft(draft: string, signals: PrivacySignals): string {
  let out = applyContextualGeneralization(draft, signals);
  // Brede fallback: resterende cijferreeksen 5+ tellen zijn vaak resten van id/postcode.
  out = out.replace(/\b\d{5,}\b/g, "[nummer]");
  return out;
}
