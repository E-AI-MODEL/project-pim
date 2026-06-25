// Detector Registry — spec hfst 8 / 15 / v3-2.
// Detectors zijn plug-ins. De pipelineProfile bepaalt welke detectors actief
// zijn. Een detector neemt ruwe tekst + ctx en geeft PiiSpans terug.
// Doel: nieuwe detectors (special lexicon, contextSlm, abuse) toevoegen
// zonder processing.ts of try.tsx aan te raken.

import type { PiiSpan } from "./types";
import { detectPii as runRegexDetectors } from "./detectors";
import { detectPersonsSlm } from "./nerSlm";
import { mergeSpans } from "./mergeSpans";
import { PIPELINE_PROFILES, type PipelineProfileId } from "./pipelineProfile";

export type DetectorKind = "rules" | "specialLexicon" | "nerSlm" | "contextSlm";

export interface DetectorContext {
  profileId: PipelineProfileId;
  /** Caller may opt-out of slow async detectors (e.g. SLM not loaded yet). */
  enableAsync: boolean;
}

export interface Detector {
  id: string;
  kind: DetectorKind;
  /** Whether this detector is async (model-based). */
  async: boolean;
  /** Returns spans found in `text`. May return [] if not applicable. */
  run(text: string, ctx: DetectorContext): PiiSpan[] | Promise<PiiSpan[]>;
}

const REGISTRY = new Map<string, Detector>();

export function registerDetector(d: Detector): void {
  REGISTRY.set(d.id, d);
}

export function getDetector(id: string): Detector | undefined {
  return REGISTRY.get(id);
}

export function listDetectors(): Detector[] {
  return Array.from(REGISTRY.values());
}

/** Detectors actief voor een profiel, in vaste volgorde (sync → async). */
export function activeDetectorsFor(profileId: PipelineProfileId): Detector[] {
  const profile = PIPELINE_PROFILES[profileId];
  return listDetectors().filter((d) => {
    if (d.kind === "rules") return profile.detectors.rules;
    if (d.kind === "specialLexicon") return profile.detectors.specialLexicon;
    if (d.kind === "nerSlm") return profile.detectors.nerSlm;
    if (d.kind === "contextSlm") return profile.detectors.contextSlm;
    return false;
  }).sort((a, b) => Number(a.async) - Number(b.async));
}

// ---------- Built-in detectors ----------

registerDetector({
  id: "builtin.regex",
  kind: "rules",
  async: false,
  run: (text) => runRegexDetectors(text),
});

// Special lexicon — schoolnamen / rolwoorden die de regex mist.
// Klein en NL-onderwijs-specifiek. Spec hfst 15.
const EDU_LEXICON: { term: RegExp; category: PiiSpan["category"]; ruleId: string; confidence: number; contextual: boolean }[] = [
  { term: /\b(?:cito|iep|route 8)\b/gi, category: "context_role", ruleId: "lex.toets", confidence: 0.5, contextual: true },
  { term: /\b(?:samenwerkingsverband|swv)\b/gi, category: "context_role", ruleId: "lex.swv", confidence: 0.5, contextual: true },
  { term: /\b(?:leerlingvolgsysteem|parnassys|magister|somtoday|esis)\b/gi, category: "school", ruleId: "lex.lvs", confidence: 0.65, contextual: false },
  // NL onderwijskoepels / -stichtingen — strikt lokaal, geen externe lookup.
  // Bron: publiek bekende koepelorganisaties primair + voortgezet onderwijs.
  { term: /\b(?:Carmel(?:college)?|Ons Middelbaar Onderwijs|OMO|Stichting Lucas(?: Onderwijs)?|Stichting Carmelcollege|Onderwijsgroep Tilburg|Onderwijsgroep Amersfoort|Onderwijsgroep Galilei|SCOH|SKOzoK|SKPO|SKOFV|INOS|Delta-?onderwijs|Spaarnesant|Stichting Klasse|Stichting Florente|Stichting Conexus|Stichting Trinamiek|Stichting Sirius|Cedergroep|Stichting BOOR|Stichting LVO|LVO Limburg|Dunamare|Atlas Onderwijsgroep|Spinoza20first|Voila|Movare|Innovo|Kindante|Stichting Penta|Stichting Meerwerf)\b/g, category: "school", ruleId: "lex.school_koepel", confidence: 0.85, contextual: false },
  // Generieke schoolnaam-patronen die regex.school mist (bv. "het Stedelijk Lyceum", "OBS De Regenboog").
  { term: /\b(?:OBS|RKBS|PCBS|CBS|SBO|SO|VSO|ISK)\s+[A-Z][\wà-ÿ]+(?:\s+[A-Z]?[\wà-ÿ]+){0,3}\b/g, category: "school", ruleId: "lex.school_prefix", confidence: 0.8, contextual: false },
  { term: /\b(?:Lyceum|Gymnasium|College|Scholengemeenschap|Praktijkschool|Mavo|Atheneum)\s+[A-Z][\wà-ÿ]+(?:\s+[A-Z]?[\wà-ÿ]+){0,2}\b/g, category: "school", ruleId: "lex.school_suffix", confidence: 0.75, contextual: false },
  // NL-steden — case-insensitive (`gi`), zodat ook kleine letters ("amsterdam")
  // worden gevangen; de cased NER-modellen missen dat. Categorie `address`
  // (zelfde generalisatie als NER-LOC → "[adres]"). Bewust GECUREERD: steden
  // die óók een gewoon Nederlands woord zijn (Houten=hout, Gouda=kaas, Best,
  // Bunde, Ee, Hem, …) zijn weggelaten om false positives te vermijden.
  { term: /\b(?:Amsterdam|Rotterdam|Den Haag|'s-Gravenhage|Utrecht|Eindhoven|Groningen|Tilburg|Almere|Breda|Nijmegen|Apeldoorn|Haarlem|Arnhem|Enschede|Amersfoort|Zaanstad|Haarlemmermeer|Den Bosch|'s-Hertogenbosch|Zwolle|Leiden|Leeuwarden|Maastricht|Dordrecht|Alphen aan den Rijn|Alkmaar|Emmen|Delft|Venlo|Deventer|Sittard|Helmond|Amstelveen|Hilversum|Heerlen|Hengelo|Purmerend|Roosendaal|Schiedam|Spijkenisse|Vlaardingen|Assen|Bergen op Zoom|Veenendaal|Katwijk|Lelystad|Hardenberg|Middelburg|Zeist|Nieuwegein|Roermond|Doetinchem|Terneuzen|Kerkrade|Barneveld|Woerden|Hoogeveen|Velsen)\b/gi, category: "address", ruleId: "lex.city", confidence: 0.7, contextual: false },
];

registerDetector({
  id: "builtin.specialLexicon",
  kind: "specialLexicon",
  async: false,
  run: (text) => {
    const out: PiiSpan[] = [];
    for (const e of EDU_LEXICON) {
      const re = new RegExp(e.term.source, e.term.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        out.push({
          start: m.index, end: m.index + m[0].length, text: m[0],
          category: e.category, ruleId: e.ruleId, confidence: e.confidence, contextual: e.contextual,
        });
        if (m[0].length === 0) re.lastIndex++;
      }
    }
    return out;
  },
});

registerDetector({
  id: "builtin.nerSlm",
  kind: "nerSlm",
  async: true,
  run: async (text, ctx) => (ctx.enableAsync ? await detectPersonsSlm(text) : []),
});

registerDetector({
  id: "builtin.contextSlm",
  kind: "contextSlm",
  async: false,
  // Heuristic context-classifier — zonder model-download.
  // Markeert familie-relaties ("vader van X") en boost zorg/incident
  // wanneer dichtbij een naam-achtige token staat. Spec hfst 8.
  run: (text) => {
    const out: PiiSpan[] = [];
    // 1) Familie-relatie pattern → context_role
    const family = /\b(?:vader|moeder|ouder|verzorger|opa|oma|broer|zus)\s+van\s+([A-Z][a-zà-ÿ]{2,})\b/g;
    let m: RegExpExecArray | null;
    while ((m = family.exec(text)) !== null) {
      out.push({
        start: m.index, end: m.index + m[0].length, text: m[0],
        category: "context_role", ruleId: "ctx.family_relation",
        confidence: 0.7, contextual: true,
      });
    }
    // 2) Co-occurrence boost: zorg/incident binnen 80 chars van een Hoofdletterwoord (proxy voor naam).
    const careRe = /\b(?:zorgleerling|dyslexie|dyscalculie|adhd|autisme|pleegzorg|jeugdzorg|incident|schorsing|geschorst|misbruik)\b/gi;
    while ((m = careRe.exec(text)) !== null) {
      const around = text.slice(Math.max(0, m.index - 80), Math.min(text.length, m.index + m[0].length + 80));
      const hasNameish = /\b[A-Z][a-zà-ÿ]{2,}(?:\s+[A-Z][a-zà-ÿ]{2,})?\b/.test(around);
      if (hasNameish) {
        out.push({
          start: m.index, end: m.index + m[0].length, text: m[0],
          category: "context_care", ruleId: "ctx.cooccurrence_name_care",
          confidence: 0.8, contextual: true,
        });
      }
    }
    return out;
  },
});

/** Run alle actieve detectors voor een profiel en merge de spans. */
export async function runRegistry(text: string, ctx: DetectorContext): Promise<PiiSpan[]> {
  const detectors = activeDetectorsFor(ctx.profileId);
  const all: PiiSpan[] = [];
  for (const d of detectors) {
    if (d.async && !ctx.enableAsync) continue;
    const r = await d.run(text, ctx);
    all.push(...r);
  }
  // Bron-bewuste merge (spoor A): zelfde precedentie als computeSignals, zodat
  // input-fase, draftCheck en egress-re-consult exact dezelfde spans zien.
  return mergeSpans(all);
}

/** Synchroon pad — voert alleen sync detectors uit (regex + lexicon + heuristic context). */
export function runRegistrySync(text: string, profileId: PipelineProfileId): PiiSpan[] {
  const detectors = activeDetectorsFor(profileId).filter((d) => !d.async);
  const all: PiiSpan[] = [];
  for (const d of detectors) {
    const r = d.run(text, { profileId, enableAsync: false }) as PiiSpan[];
    all.push(...r);
  }
  return mergeSpans(all);
}

/** UI-helper: korte herkomst-tag op basis van ruleId. */
export function detectorSourceLabel(ruleId: string): "regex" | "lex" | "slm" | "ctx" {
  if (ruleId.startsWith("slm.")) return "slm";
  if (ruleId.startsWith("lex.")) return "lex";
  if (ruleId.startsWith("ctx.")) return "ctx";
  return "regex";
}