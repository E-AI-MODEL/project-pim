// Detector Registry, profile-free detection layers.
// Detectors are plug-ins. The runtime uses explicit layers: Regex, Lexicon,
// Context and the selected BERT model. Profiles are not part of the user-facing
// or egress decision path anymore.

import type { PiiSpan } from "./types";
import { detectPii as runRegexDetectors } from "./detectors";
import { detectPersonsSlm } from "./nerSlm";
import { mergeSpans } from "./mergeSpans";
import {
  coerceDetectionSettings,
  usesBert,
  type DetectionLayerSettings,
} from "./detectionSettings";

export type DetectorKind = "rules" | "specialLexicon" | "nerSlm" | "contextSlm";

export interface DetectorContext {
  detectionSettings: DetectionLayerSettings;
  /** Caller may opt-out of slow async detectors, e.g. BERT not loaded yet. */
  enableAsync: boolean;
}

export interface Detector {
  id: string;
  kind: DetectorKind;
  /** Whether this detector is async/model-based. */
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

/** Active detectors in fixed order: sync first, async after. */
export function activeDetectorsFor(
  settingsInput?: DetectionLayerSettings | string | null,
): Detector[] {
  const settings = coerceDetectionSettings(settingsInput);
  return listDetectors()
    .filter((d) => {
      if (d.kind === "rules") return true; // Regex is always on in normal PiM.
      if (d.kind === "specialLexicon") return settings.lexicon;
      if (d.kind === "nerSlm") return usesBert(settings);
      if (d.kind === "contextSlm") return settings.context;
      return false;
    })
    .sort((a, b) => Number(a.async) - Number(b.async));
}

// ---------- Built-in detectors ----------

registerDetector({
  id: "builtin.regex",
  kind: "rules",
  async: false,
  run: (text) => runRegexDetectors(text),
});

// Special lexicon, school names / education terms the regex layer misses.
const EDU_LEXICON: {
  term: RegExp;
  category: PiiSpan["category"];
  ruleId: string;
  confidence: number;
  contextual: boolean;
}[] = [
  {
    term: /\b(?:cito|iep|route 8)\b/gi,
    category: "context_role",
    ruleId: "lex.toets",
    confidence: 0.5,
    contextual: true,
  },
  {
    term: /\b(?:samenwerkingsverband|swv)\b/gi,
    category: "context_role",
    ruleId: "lex.swv",
    confidence: 0.5,
    contextual: true,
  },
  {
    term: /\b(?:leerlingvolgsysteem|parnassys|magister|somtoday|esis)\b/gi,
    category: "school",
    ruleId: "lex.lvs",
    confidence: 0.65,
    contextual: false,
  },
  {
    term: /\b(?:Carmel(?:college)?|Ons Middelbaar Onderwijs|OMO|Stichting Lucas(?: Onderwijs)?|Stichting Carmelcollege|Onderwijsgroep Tilburg|Onderwijsgroep Amersfoort|Onderwijsgroep Galilei|SCOH|SKOzoK|SKPO|SKOFV|INOS|Delta-?onderwijs|Spaarnesant|Stichting Klasse|Stichting Florente|Stichting Conexus|Stichting Trinamiek|Stichting Sirius|Cedergroep|Stichting BOOR|Stichting LVO|LVO Limburg|Dunamare|Atlas Onderwijsgroep|Spinoza20first|Voila|Movare|Innovo|Kindante|Stichting Penta|Stichting Meerwerf)\b/g,
    category: "school",
    ruleId: "lex.school_koepel",
    confidence: 0.85,
    contextual: false,
  },
  {
    term: /\b(?:OBS|RKBS|PCBS|CBS|SBO|SO|VSO|ISK)\s+[A-Z][\wà-ÿ]+(?:\s+[A-Z]?[\wà-ÿ]+){0,3}\b/g,
    category: "school",
    ruleId: "lex.school_prefix",
    confidence: 0.8,
    contextual: false,
  },
  {
    term: /\b(?:Lyceum|Gymnasium|College|Scholengemeenschap|Praktijkschool|Mavo|Atheneum)\s+[A-Z][\wà-ÿ]+(?:\s+[A-Z]?[\wà-ÿ]+){0,2}\b/g,
    category: "school",
    ruleId: "lex.school_suffix",
    confidence: 0.75,
    contextual: false,
  },
  {
    term: /\b(?:Amsterdam|Rotterdam|Den Haag|'s-Gravenhage|Utrecht|Eindhoven|Groningen|Tilburg|Almere|Breda|Nijmegen|Apeldoorn|Haarlem|Arnhem|Enschede|Amersfoort|Zaanstad|Haarlemmermeer|Den Bosch|'s-Hertogenbosch|Zwolle|Leeuwarden|Maastricht|Dordrecht|Alphen aan den Rijn|Alkmaar|Emmen|Venlo|Deventer|Sittard|Helmond|Amstelveen|Hilversum|Heerlen|Hengelo|Purmerend|Roosendaal|Schiedam|Spijkenisse|Vlaardingen|Bergen op Zoom|Veenendaal|Katwijk|Lelystad|Hardenberg|Middelburg|Zeist|Nieuwegein|Roermond|Doetinchem|Terneuzen|Kerkrade|Barneveld|Woerden|Hoogeveen|Velsen)\b/gi,
    category: "address",
    ruleId: "lex.city",
    confidence: 0.7,
    contextual: false,
  },
  {
    term: /\b(?:Leiden|Assen|Delft)\b/g,
    category: "address",
    ruleId: "lex.city",
    confidence: 0.7,
    contextual: false,
  },
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
          start: m.index,
          end: m.index + m[0].length,
          text: m[0],
          category: e.category,
          ruleId: e.ruleId,
          confidence: e.confidence,
          contextual: e.contextual,
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
  run: async (text, ctx) =>
    ctx.enableAsync && usesBert(ctx.detectionSettings) ? await detectPersonsSlm(text) : [],
});

registerDetector({
  id: "builtin.contextSlm",
  kind: "contextSlm",
  async: false,
  run: (text) => {
    const out: PiiSpan[] = [];
    const family =
      /\b(?:vader|moeder|ouder|verzorger|opa|oma|broer|zus)\s+van\s+([A-Z][a-zà-ÿ]{2,})\b/g;
    let m: RegExpExecArray | null;
    while ((m = family.exec(text)) !== null) {
      out.push({
        start: m.index,
        end: m.index + m[0].length,
        text: m[0],
        category: "context_role",
        ruleId: "ctx.family_relation",
        confidence: 0.7,
        contextual: true,
      });
    }
    const careRe =
      /\b(?:zorgleerling|dyslexie|dyscalculie|adhd|autisme|pleegzorg|jeugdzorg|incident|schorsing|geschorst|misbruik)\b/gi;
    while ((m = careRe.exec(text)) !== null) {
      const around = text.slice(
        Math.max(0, m.index - 80),
        Math.min(text.length, m.index + m[0].length + 80),
      );
      const hasNameish = /\b[A-Z][a-zà-ÿ]{2,}(?:\s+[A-Z][a-zà-ÿ]{2,})?\b/.test(around);
      if (hasNameish) {
        out.push({
          start: m.index,
          end: m.index + m[0].length,
          text: m[0],
          category: "context_care",
          ruleId: "ctx.cooccurrence_name_care",
          confidence: 0.8,
          contextual: true,
        });
      }
    }
    return out;
  },
});

/** Run all active detectors and merge spans. */
export async function runRegistry(
  text: string,
  ctx: { detectionSettings?: DetectionLayerSettings | string | null; enableAsync: boolean },
): Promise<PiiSpan[]> {
  const detectionSettings = coerceDetectionSettings(ctx.detectionSettings);
  const detectors = activeDetectorsFor(detectionSettings);
  const all: PiiSpan[] = [];
  for (const d of detectors) {
    if (d.async && !ctx.enableAsync) continue;
    const r = await d.run(text, { detectionSettings, enableAsync: ctx.enableAsync });
    all.push(...r);
  }
  return mergeSpans(all);
}

/** Sync path: Regex + Lexicon + Context, depending on detection settings. */
export function runRegistrySync(
  text: string,
  settingsInput?: DetectionLayerSettings | string | null,
): PiiSpan[] {
  const detectionSettings = coerceDetectionSettings(settingsInput);
  const detectors = activeDetectorsFor(detectionSettings).filter((d) => !d.async);
  const all: PiiSpan[] = [];
  for (const d of detectors) {
    const r = d.run(text, { detectionSettings, enableAsync: false }) as PiiSpan[];
    all.push(...r);
  }
  return mergeSpans(all);
}

/** UI-helper: short source tag by ruleId. */
export function detectorSourceLabel(ruleId: string): "regex" | "lex" | "slm" | "ctx" {
  if (ruleId.startsWith("slm.")) return "slm";
  if (ruleId.startsWith("lex.")) return "lex";
  if (ruleId.startsWith("ctx.")) return "ctx";
  return "regex";
}
