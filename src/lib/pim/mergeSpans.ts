// Gedeelde, bron-bewuste span-merge — spoor A.
//
// Vóór deze module bestonden er drie losse merges (risk.ts, detectorRegistry.ts
// ×2) die overlap oplosten met "hoogste confidence wint". Dat is destructief:
// een precieze regex-identifier (BSN/IBAN/e-mail) kon sneuvelen onder een
// SLM-naamgok met toevallig hogere confidence, en een korte regex-voornaam kon
// een volledige SLM-naam verdringen (coverage-verlies).
//
// mergeSpans lost overlap op via een PRECEDENTIE-ladder i.p.v. ruwe confidence:
//   1. Gestructureerde identifiers (regex, gevalideerd) zijn autoritair en
//      worden nooit overschreven door een niet-identifier.
//   2. Voor naam-achtige spans (name/school/address) wint de RUIMERE dekking,
//      zodat regex en SLM elkaar versterken i.p.v. concurreren: vindt de SLM
//      "Jan Jansen" waar regex alleen "Jan" zag, dan blijft de volledige naam.
//   3. Niet-overlappende SLM-spans worden altijd toegevoegd → hogere
//      dekkingsgraad zodra het model aanstaat.

import type { PiiSpan, PiiCategory } from "./types";

/** Categorieën die uit gevalideerde/gestructureerde regex-regels komen. */
const STRUCTURED_IDENTIFIER: ReadonlySet<PiiCategory> = new Set([
  "email", "phone", "bsn", "iban", "postcode", "student_id", "credit_card",
  "license_plate", "url", "ip_address", "social_handle", "birthdate_text",
  "date", "class_code", "id_document",
]);

/** Herkomst afleiden uit de ruleId-prefix (zelfde conventie als detectorSourceLabel). */
function sourceOf(ruleId: string): "regex" | "lex" | "slm" | "ctx" {
  if (ruleId.startsWith("slm.")) return "slm";
  if (ruleId.startsWith("lex.")) return "lex";
  if (ruleId.startsWith("ctx.")) return "ctx";
  return "regex";
}

/**
 * Precedentie van een span. Hoger = autoritairder bij overlap. Identifiers
 * staan bovenaan; daaronder bepaalt de bron de volgorde (curatuur > regex > SLM
 * > heuristiek). Confidence is pas de laatste tiebreaker (in de sort).
 */
export function spanRank(s: PiiSpan): number {
  if (STRUCTURED_IDENTIFIER.has(s.category)) return 100;
  switch (sourceOf(s.ruleId)) {
    case "lex": return 80;   // gecureerd lexicon (schoolkoepels etc.)
    case "regex": return 72; // regex naam/adres-heuristiek
    case "slm": return 64;   // model-naamherkenning
    default: return 50;      // contextuele heuristiek
  }
}

/** Beslis of `cand` de al-behouden `kept` mag vervangen bij overlap. */
function preferReplacement(kept: PiiSpan, cand: PiiSpan): boolean {
  const keptStruct = STRUCTURED_IDENTIFIER.has(kept.category);
  const candStruct = STRUCTURED_IDENTIFIER.has(cand.category);

  // Identifier-regel: een gestructureerde identifier is autoritair.
  if (keptStruct && !candStruct) return false;
  if (candStruct && !keptStruct) return true;
  // Twee identifiers die overlappen: alleen vervangen bij duidelijk hogere
  // confidence (anders blijft de eerst-gekozen, hoogst gesorteerde staan).
  if (keptStruct && candStruct) return cand.confidence > kept.confidence + 0.2;

  // Beide naam-achtig/contextueel: kies de RUIMERE dekking, maar alleen als
  // de kandidaat de behouden span volledig omvat (geen partiële coverage-verlies).
  const candCoversKept = cand.start <= kept.start && cand.end >= kept.end;
  const candLonger = (cand.end - cand.start) > (kept.end - kept.start);
  if (candCoversKept && candLonger) return true;
  if (cand.start === kept.start && cand.end === kept.end) return cand.confidence > kept.confidence;
  return false;
}

/**
 * Voeg overlappende spans samen volgens de precedentie-ladder.
 * `disabled` filtert categorieën die de gebruiker heeft uitgezet.
 */
export function mergeSpans(
  spans: PiiSpan[],
  disabled?: ReadonlySet<PiiCategory>,
): PiiSpan[] {
  const pool = disabled ? spans.filter((s) => !disabled.has(s.category)) : spans.slice();
  // Sorteer zodat de sterkste kandidaat per startpositie eerst langskomt:
  // start asc → rank desc → langste dekking → hoogste confidence.
  pool.sort((a, b) =>
    a.start - b.start ||
    spanRank(b) - spanRank(a) ||
    (b.end - b.start) - (a.end - a.start) ||
    b.confidence - a.confidence,
  );
  const out: PiiSpan[] = [];
  for (const s of pool) {
    const last = out[out.length - 1];
    if (last && s.start < last.end) {
      if (preferReplacement(last, s)) out[out.length - 1] = s;
      continue;
    }
    out.push(s);
  }
  return out;
}
