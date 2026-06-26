Plan — PiM UI/UX refactor (8 fases)
Bron: samenvoeging van docs/pim-refactor/00-overzicht.md t/m 05-supplement.md. Backend is gezond, UI/UX is gefragmenteerd. We consolideren naar één design-systeem, één dashboard, vereenvoudigde homepage en schrijfmodus, en een lock-principe i.p.v. silent blocks.

Dit is het enige referentiedocument. Per fase staan hierin: doel, bestanden, acties, acceptatiecriteria, risico's, en concrete code-snippets.

Inhoud
Wat er mis is
Het lock-principe
Fases-tabel
Fase 1 — Backend + lock
Fase 2 — Design tokens
Fase 3 — Model-status consolidatie
Fase 4 — Homepage strippen
Fase 5 — Schrijfmodus strippen
Fase 6 — Dashboard bouwen
Fase 7 — Navigatie
Fase 8 — Cleanup
Design-systeem tokens
Belangrijke ontwerpkeuzes
Bestanden die verdwijnen / nieuw zijn
Acceptatiecriteria (eind)

1. Wat er mis is
   Drie structurele problemen, geen losse cosmetica.

1.1 Drie design-systemen door elkaar
.pim-landing hex-palet op de homepage (#0f1b3d, #1e3a5f, #3b6fa0) in styles.css regel 247-266
oklch :root tokens met cyan/orange/purple/green/red + glow-shadows op /try, /trust, /pipeline (regel 98-157)
shadcn .dark override met neutrale grijzen (regel 159-192)
Zes font-families geladen: Inter, Space Grotesk, JetBrains Mono, Libre Baskerville, IBM Plex Sans, IBM Plex Mono
Gevolg: bij navigatie verandert de hele look — fonts, kleuren, glow-effecten. De homepage ziet er letterlijk anders uit dan /schrijven.

1.2 Negen plekken met model-status
LocalModelStrip in StartGoShell.tsx (regel 150-157)
BERT-sectie in AdvancedPanel.tsx (regel 175-202)
BertOption-kaarten in AdvancedPanel.tsx (regel 207-221)
WriterStatusBar in WriterShell.tsx (regel 216-227)
LiveTechMonitor "Modellen"-tab
LiveTechMonitor "Live"-tab (modellen-mini)
Eigen BERT-strip in try.tsx
LocalStatusPill (indirect, via model-mismatch detectie)
TrustBadge popover
Gevolg: gebruiker weet niet waar BERT aan staat of waarom acties geblokkeerd worden.

1.3 Technisch jargon op eindgebruikerspagina's
AdvancedPanel toont op de homepage: Regex, Lexicon, Context, BERT 100 MB / 180 MB, NER, SLM, DistilBERT, integrity-list. Een docent begrijpt hier niets van. Plus: nestpoppen-structuur op de homepage (MonitorShell verpakt StartGoShell verpakt ResultPanel), vijf routes die deels hetzelfde doen (/, /schrijven, /try, /trust, /pipeline), en een beleidsbug in de backend.

1.4 Beleidsbug in de backend
flags.ts definieert PIM_RULES_ONLY_EXTERNAL_AI_BLOCK (regel 39) en PIM_RULES_ONLY_EXPORT_BLOCK (regel 40), maar decide() in policy.ts roept ze nergens aan. Een gebruiker met BERT uit kan stilletjes naar externe AI sturen of exporteren — geen blokkade, geen waarschuwing. Dit is een echte beleidsbug, geen cosmetica.

2. Het lock-principe
   In plaats van silent blocks kiest de gebruiker zelf voor strikte modus via een toggle in dashboard Instellingen-tab.

Actie
Niet-strikt, BERT uit
Strikt, BERT uit
Beide, BERT aan
display, save_local ALLOW ALLOW ALLOW
copy, print, share ALLOW ALLOW ALLOW (tenzij risk > drempel)
export_file ALLOW_WITH_WARNING BLOCK + slot-icoon ALLOW (tenzij risk > drempel)
send_external_ai ALLOW_WITH_WARNING BLOCK + slot-icoon ALLOW (tenzij risk > drempel)
restore (anon) BLOCK (geen mapping) BLOCK BLOCK

Waarom: kopiëren moet altijd kunnen, anders denken gebruikers dat PiM stuk is. Maar externe AI en export zijn échte egress — die mogen in strikte modus niet zonder volledige detectie. De gebruiker kiest zelf om het "slot dicht te doen".

UI:

Niet-strikt, BERT uit: warning-banner boven actie-knoppen "Naamherkenning staat uit — mogelijk niet alles gedetecteerd."
Strikt, BERT uit: knoppen disabled met slot-icoon + title="Strikte modus staat aan — zet naamherkenning aan om vrij te geven". 3. Fases-tabel

#

Fase
Doel
Duur
Risico
Status
1 Backend + lock PIM*RULES_ONLY*\* checks, strictMode, ALLOW_WITH_WARNING voor BERT-uit, profileId weg, enhanceContextWithBert, Qwen-verbeteringen 2 wk Laag 🟡 in uitvoering — slice 1/4
2 Design tokens Eén token-systeem, glow/gradients weg, fonts terug naar Inter + IBM Plex Mono 3 wk Gemiddeld ⬜
3 Model-status consolidatie 9 plekken → ModelBar + mini-indicator 2 wk Gemiddeld ⬜
4 Homepage strippen MonitorShell-window weg, AdvancedPanel weg 2 wk Laag ⬜
5 Schrijfmodus strippen LiveTechMonitor/AdvancedPanel weg, mini-indicator 1 wk Laag ⬜
6 Dashboard bouwen /dashboard met 5 tabs + ModelBar + SettingsPanel + audit-log 4 wk Hoog ⬜
7 Navigatie /try, /trust, /pipeline weg; BurgerMenu reorganiseren 1 wk Gemiddeld ⬜
8 Cleanup pipelineProfile.ts weg, coerceDetectionSettings shim weg, modelGateFor shim weg, tests updaten 2 wk Laag ⬜

Totaal: ~17 weken bruto, realistisch 10-12 weken met parallelisatie (fase 4 en 5 parallel; fase 6 in deel-PR's). Volgorde lineair: fase 1 eerst (backend moet kloppen), fase 2 daarna (tokens zijn fundering), fase 6 pas na fase 4-5 (dashboard vereist opgeruimde pagina's), fase 7 pas na fase 6 (pas routes verwijderen als dashboard er is).

Fase 1 — Backend + lock
Fase 1 — sub-slices
Lock-principe in decide() — nieuwe strictMode veld op DecideInput. Activeert PIM*RULES_ONLY_EXTERNAL_AI_BLOCK en PIM_RULES_ONLY_EXPORT_BLOCK (al gedefinieerd in flags.ts maar nergens aangeroepen). Nieuwe flag PIM_BERT_OFF_EGRESS_WARN voor niet-strikt + BERT-uit.
enhanceContextWithBert — nieuwe pure functie in src/lib/pim/contextualGeneralization.ts die BERT-name-spans gebruikt om context-detecties te versterken. Confidence ×0.7, span op contextwoord, niet op naam.
profileId deprecaten — uit usePimSettings, types.ts, DetailsDrawer. Optional houden in PimDecision t/m fase 8 (modelGateFor-shim).
Qwen-overhaul — sampling, dedupeSentences, fallback-discriminatie, streaming/non-streaming unificeren.
Fase 1 — bestanden
Bestand
Wijziging
src/lib/pim/types.ts Verwijder profileId uit PimDecision (regel 111) en CertifiedPayload (regel 95)
src/lib/pim/policy.ts Voeg strictMode toe aan DecideInput; voeg PIM_RULES_ONLY*\* checks toe in decide(); verwijder profileId uit base
src/lib/pim/flags.ts Voeg PIM_BERT_OFF_EGRESS_WARN toe
src/hooks/usePimSettings.ts Verwijder profileId/setProfileId; voeg strictMode/setStrictMode toe (persist in localStorage)
src/lib/pim/contextualGeneralization.ts Voeg enhanceContextWithBert() toe
src/lib/pim/risk.ts Roep enhanceContextWithBert() aan in computeSignals() na mergeSpans
src/lib/pim/rewriteLlm.ts Vervang SYSTEM_PROMPT; aanscherpen SAMPLING; versterken dedupeSentences; discrimineren return-type; samenvoegen streaming/non-streaming
src/components/pim/start-go/DetailsDrawer.tsx Verwijder Row k="Profiel" (regel 30)
Alle call-sites van decide() Voeg strictMode toe vanuit usePimSettings

Fase 1 — code: policy.ts decide()
Vervang de decide() functie. Belangrijkste wijzigingen: profileId verwijderd, strictMode parameter, PIM*RULES_ONLY*\* checks ingevoerd, PIM_BERT_OFF_EGRESS_WARN voor niet-strikt.

ts

export interface DecideInput {

if (isEgressAction && payloadType !== "draft_anonymous_certified") {
return fromFlag("PIM_PAYLOAD_TYPE_EGRESS_BLOCK", base,
`Payload-type '${payloadType}' mag de browser niet verlaten — alleen 'draft_anonymous_certified'.`);
}

if (!modelVerified) return fromFlag("PIM_MODEL_INTEGRITY_BLOCK", base);

if (draftCheck.status === "fail") {
const issue = draftCheck.issues[0] ?? "";
if (issue.toLowerCase().includes("residuele")) return fromFlag("PIM_RAW_PII_BLOCK", base, issue);
if (issue.toLowerCase().includes("mode-mix")) return fromFlag("PIM_MODE_STATUS_MISMATCH", base, issue);
return fromFlag("PIM_GUARD_FAILURE_BLOCK", base, issue);
}

if (mode === "pseudonymous") {
if (action === "send_external_ai") return fromFlag("PIM_PSEUDONYM_EXTERNAL_AI_BLOCK", base);
const forbidden: Action[] = ["copy", "export_file", "print", "share"];
if (forbidden.includes(action)) return fromFlag("PIM_PSEUDONYM_EGRESS_BLOCK", base);
if (action === "display" || action === "save_local" || action === "restore") {
return fromFlag("PIM_PSEUDO_LOCAL_ONLY_WARN", base);
}
}

if (mode === "anonymous") {
if (action === "restore") return fromFlag("PIM_ANONYMOUS_RESTORE_BLOCK", base);

    // === LOCK-PRINCIPE ============================================
    if (!bertActive && action === "send_external_ai") {
      if (strictMode) {
        return fromFlag("PIM_RULES_ONLY_EXTERNAL_AI_BLOCK", base,
          "Strikte modus staat aan — naamherkenning is vereist voor externe AI.");
      }
      return fromFlag("PIM_BERT_OFF_EGRESS_WARN", base,
        "Naamherkenning staat uit — mogelijk niet alle gegevens gedetecteerd.");
    }
    if (!bertActive && action === "export_file") {
      if (strictMode) {
        return fromFlag("PIM_RULES_ONLY_EXPORT_BLOCK", base,
          "Strikte modus staat aan — naamherkenning is vereist voor export.");
      }
      return fromFlag("PIM_BERT_OFF_EGRESS_WARN", base,
        "Naamherkenning staat uit — mogelijk niet alle gegevens gedetecteerd.");
    }
    // === EINDE LOCK-PRINCIPE ======================================

    const cats = new Set([...signals.directPii, ...signals.contextualPii].map((s) => s.category));
    const specialCombo = cats.has("context_small_group") && (cats.has("context_care") || cats.has("context_incident"));
    if (specialCombo && isEgressAction) return fromFlag("PIM_SPECIAL_CONTEXT_EGRESS_BLOCK", base);

    const threshold = thresholdOverrides?.[action] ?? DEFAULT_ANON_THRESHOLDS[action];
    if (signals.riskScore > threshold) {
      const code: PimFlagCode =
        action === "send_external_ai" ? "PIM_EXTERNAL_AI_RISK_BLOCK" :
        action === "export_file" ? "PIM_EXPORT_RISK_BLOCK" :
        ["copy","print","share"].includes(action) ? "PIM_COPY_SHARE_RISK_BLOCK" :
        "PIM_DEFAULT_BLOCK";
      return fromFlag(code, base, `Risk ${(signals.riskScore * 100).toFixed(0)}% > drempel ${(threshold * 100).toFixed(0)}% voor "${action}".`);
    }
    if (signals.riskScore > threshold * 0.7 && threshold > 0) {
      return fromFlag("PIM_RISK_NEAR_THRESHOLD_WARN", base);
    }

}

if (draftCheck.status === "repair") return fromFlag("PIM_DRAFT_REPAIR_WARN", base, draftCheck.issues[0]);

return fromFlag("PIM_OK", base);
}
Vergeet niet bovenaan policy.ts:

ts

import { DEFAULT_DETECTION_SETTINGS, usesBert, type DetectionLayerSettings } from "./detectionSettings";
Fase 1 — code: nieuwe flag in flags.ts
Voeg toe aan PIM_FLAGS:

ts

PIM_BERT_OFF_EGRESS_WARN: {
ruleId: "pim.bert.off.egress.warn",
reasonCode: "BERT_OFF_EGRESS",
severity: "warn",
verdict: "ALLOW_WITH_WARNING",
description: "Naamherkenning staat uit — mogelijk niet alle gegevens gedetecteerd.",
},
Fase 1 — code: usePimSettings.ts
Volledige vervanging. Verwijdert profileId, voegt strictMode toe met localStorage-persistentie.

ts

import { useEffect, useState } from "react";
import {
DEFAULT_DETECTION_SETTINGS, onModelIntegrity,
type DetectionLayerSettings, type Action, type PiiCategory, type ModelIntegrityRecord,
} from "@/lib/pim";

const STRICT_MODE_KEY = "pim.strictMode";

export interface PimSettings {
detectionSettings: DetectionLayerSettings;
setDetectionSettings: (settings: DetectionLayerSettings) => void;
thresholdOverrides: Partial<Record<Action, number>>;
setThresholdOverride: (action: Action, value: number) => void;
resetThresholds: () => void;
disabledCategories: ReadonlySet<PiiCategory>;
setCategoryEnabled: (cat: PiiCategory, enabled: boolean) => void;
toggleCategory: (cat: PiiCategory) => void;
resetCategories: () => void;
integrity: ModelIntegrityRecord[];
strictMode: boolean;
setStrictMode: (v: boolean) => void;
}

export function usePimSettings(): PimSettings {
const [detectionSettings, setDetectionSettings] = useState<DetectionLayerSettings>(DEFAULT_DETECTION_SETTINGS);
const [thresholdOverrides, setThresholdOverrides] = useState<Partial<Record<Action, number>>>({});
const [disabledCategories, setDisabledCategories] = useState<ReadonlySet<PiiCategory>>(new Set());
const [integrity, setIntegrity] = useState<ModelIntegrityRecord[]>([]);
const [strictMode, setStrictModeState] = useState<boolean>(() => {
if (typeof window === "undefined") return false;
return localStorage.getItem(STRICT_MODE_KEY) === "true";
});

useEffect(() => onModelIntegrity(setIntegrity), []);

const setStrictMode = (v: boolean) => {
setStrictModeState(v);
if (typeof window !== "undefined") localStorage.setItem(STRICT_MODE_KEY, String(v));
};

const setCategoryEnabled = (cat: PiiCategory, enabled: boolean) =>
setDisabledCategories((prev) => {
const next = new Set(prev);
if (enabled) next.delete(cat); else next.add(cat);
return next;
});

const toggleCategory = (cat: PiiCategory) =>
setDisabledCategories((prev) => {
const next = new Set(prev);
if (next.has(cat)) next.delete(cat); else next.add(cat);
return next;
});

const resetCategories = () => setDisabledCategories(new Set());
const setThresholdOverride = (action: Action, value: number) =>
setThresholdOverrides((prev) => ({ ...prev, [action]: value }));
const resetThresholds = () => setThresholdOverrides({});

return {
detectionSettings, setDetectionSettings,
thresholdOverrides, setThresholdOverride, resetThresholds,
disabledCategories, setCategoryEnabled, toggleCategory, resetCategories,
integrity, strictMode, setStrictMode,
};
}
Fase 1 — code: call-sites van decide()
Zoek met grep -rn "decide({" src/. Verwachte locaties: StartGoShell.tsx (regel 93 en 111), ResultPanel.tsx (regel 47), try.tsx. Voeg strictMode toe:

ts

// Vóór:
const decision = decide({ mode, action, signals, draftCheck: guard, modelVerified: gate.verified, detectionSettings, payloadType, thresholdOverrides });

// Na:
const decision = decide({ mode, action, signals, draftCheck: guard, modelVerified: gate.verified, detectionSettings, payloadType, thresholdOverrides, strictMode });
Fase 1 — code: enhanceContextWithBert
Voeg onderaan src/lib/pim/contextualGeneralization.ts toe.

ts

import type { PiiSpan, PiiCategory } from "./types";
{ word: "conflict", category: "context_incident" },
{ word: "misbruik", category: "context_incident" },
{ word: "melding", category: "context_incident" },
{ word: "klacht", category: "context_incident" },
{ word: "groep", category: "context_small_group" },
{ word: "klas", category: "context_small_group" },
{ word: "brugklas", category: "context_small_group" },
{ word: "gezin", category: "context_family" },
{ word: "ouders", category: "context_family" },
{ word: "scheiding", category: "context_family" },
{ word: "mentor", category: "context_role" },
{ word: "ib'er", category: "context_role" },
{ word: "zorgcoördinator", category: "context_role" },
];

const CONTEXT_WORDS_INDEX = new Map<string, PiiCategory>();
for (const { word, category } of CONTEXT_WORDS) CONTEXT_WORDS_INDEX.set(word, category);

/\*\*

- Versterk context-detectie met BERT-spans. Als BERT een naam, organisatie of
- locatie vindt en er staat een contextwoord in de buurt (±60 tekens), voeg
- dan een contextueel signaal toe op de locatie van het contextwoord.
-
- Ontwerpkeuzes:
- - Confidence wordt VERLAAGD (×0.7) — heuristiek bovenop model, geen directe detectie
- - NIEUWE span op contextwoord-locatie, niet op naam-locatie (voorkomt mergeSpans-conflict)
- - Laat name, school, address toe als bron-categorie
- - Woord→categorie mapping, niet alles context_care
    \*/
    export function enhanceContextWithBert(text: string, bertSpans: PiiSpan[]): PiiSpan[] {
    const extra: PiiSpan[] = [];
    const lowerText = text.toLowerCase();

for (const span of bertSpans) {
const isName = span.category === "name";
const isSchool = span.category === "school";
const isAddress = span.category === "address";
if (!isName && !isSchool && !isAddress) continue;

    const start = Math.max(0, span.start - 60);
    const end = Math.min(text.length, span.end + 40);
    const window = lowerText.slice(start, end);

    for (const [word, category] of CONTEXT_WORDS_INDEX) {
      const wordIdx = window.indexOf(word);
      if (wordIdx === -1) continue;

      const wordStart = start + wordIdx;
      const wordEnd = wordStart + word.length;

      const baseConfidence = isName ? 0.85 : isSchool ? 0.75 : 0.70;
      const confidence = Math.min(baseConfidence, span.confidence * 0.7);

      extra.push({
        start: wordStart, end: wordEnd,
        text: text.slice(wordStart, wordEnd),
        category, ruleId: "ctx.bert_enhanced",
        confidence, contextual: true,
      });
      break;
    }

}
return extra;
}
Fase 1 — code: aanpassing risk.ts
Vervang regel 22 in src/lib/pim/risk.ts:

ts

// Vóór:
const spans = mergeSpans([...baseSpans, ...extraSpans], disabledCategories);

// Na:
import { enhanceContextWithBert } from "./contextualGeneralization";

const bertSpans = extraSpans.filter(s => s.ruleId.startsWith("slm."));
const enhanced = enhanceContextWithBert(text, bertSpans);
const spans = mergeSpans([...baseSpans, ...extraSpans, ...enhanced], disabledCategories);
Fase 1 — code: Qwen SYSTEM_PROMPT
Vervang SYSTEM_PROMPT in src/lib/pim/rewriteLlm.ts (regel 52-58):

ts

const SYSTEM_PROMPT = `Je herschrijft een Nederlandse onderwijstekst tot een anonieme versie.

Doel: Maak de tekst minder herkenbaar door namen, plaatsen, data en kleine groepen te generaliseren, maar behoud de feitelijke inhoud, toon en structuur.

Regels:

1. Vervang persoonsnamen door [persoon], achternamen door [naam], plaatsen door [plaats], datums door [datum], schoolnamen door [school], klascodes door [klas].
2. Laat bestaande blokken tussen vierkante haken (zoals [persoon], [school], [datum]) ALTIJD ongewijzigd.
3. Herschrijf zinnen zodat ze natuurlijk blijven, maar vermijd herhaling van dezelfde woorden of zinsdelen.
4. Schrijf geen nieuwe informatie of fictieve details.
5. Antwoord uitsluitend met de herschreven tekst, zonder extra uitleg of inleiding.`;
   Fase 1 — code: Qwen SAMPLING aanscherpen
   Vervang SAMPLING (regel 63-69):

ts

const SAMPLING = {
temperature: 0.15, // lager — minder variatie
top_p: 0.85, // krapper — minder ruimte voor rare tokens
frequency_penalty: 0.7, // hoger — agressiever tegen herhaling
presence_penalty: 0.6, // hoger — ontmoedigt nieuwe woorden
max_tokens: 768, // meer ruimte voor langere teksten
repetition_penalty: 1.15, // extra vangnet (MLC ondersteunt dit)
} as const;
Fase 1 — code: dedupeSentences versterken
Vervang de hele functie (regel 76-97). Belangrijkste wijziging: herkent placeholder-tokens ([persoon], [bsn]) apart.

ts

export function dedupeSentences(text: string): string {
const seenSentences = new Set<string>();
const seenTokens = new Set<string>();
const outLines: string[] = [];

for (const line of text.split(/\n/)) {
if (line.trim() === "") { outLines.push(""); continue; }
const kept: string[] = [];

    for (const sentence of line.split(/(?<=[.!?])\s+/)) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      const normSentence = trimmed.toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[.!?]+$/, "")
        .trim();

      if (normSentence.length < 8) {
        const tokenMatch = /^\[([a-z]+)\]$/.exec(normSentence);
        if (tokenMatch) {
          const token = tokenMatch[0];
          if (seenTokens.has(token)) continue;
          seenTokens.add(token);
        }
        kept.push(sentence);
        continue;
      }

      if (seenSentences.has(normSentence)) continue;
      seenSentences.add(normSentence);
      kept.push(sentence);
    }

    const joined = kept.join(" ").trim();
    if (joined) outLines.push(joined);

}

return outLines
.join("\n")
.replace(/\n{3,}/g, "\n\n")
.replace(/ +/g, " ")
.trim();
}
Fase 1 — code: RewriteResult discrimineren
Vervang return-type van rewriteAnonymousDraft. Verenigt streaming/non-streaming in één functie met optionele onToken callback.

ts

export type RewriteResult =
| { kind: "ok"; text: string; usedLlm: true; reason: string }
| { kind: "fallback"; text: string; usedLlm: false; reason: string; cause: "not-loaded" | "empty-output" | "error" | "stream-error"; detail?: string };

export async function rewriteAnonymousDraft(
draft: string,
opts?: { onToken?: (chunk: string, accumulated: string) => void },
): Promise<RewriteResult> {
const eng = await loadRewriteLlm();
if (!eng) return { kind: "fallback", text: draft, usedLlm: false, reason: "Qwen niet geladen.", cause: "not-loaded" };

try {
if (opts?.onToken) {
// Streaming-pad
const stream = (await eng.chat.completions.create({
messages: [
{ role: "system", content: SYSTEM_PROMPT },
{ role: "user", content: draft },
],
...SAMPLING, stream: true,
})) as AsyncIterable<{ choices: { delta?: { content?: string } }[] }>;

      let acc = "";
      for await (const chunk of stream) {
        const piece = chunk.choices?.[0]?.delta?.content ?? "";
        if (!piece) continue;
        acc += piece;
        opts.onToken(piece, acc);
      }
      const raw = acc.trim();
      if (!raw || raw.length < 10) {
        return { kind: "fallback", text: draft, usedLlm: false, reason: "Qwen stream gaf lege output.", cause: "empty-output" };
      }
      return { kind: "ok", text: dedupeSentences(raw), usedLlm: true, reason: "Qwen-herschrijving (streaming) toegepast." };
    }

    // Non-streaming-pad
    const res = (await eng.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: draft },
      ],
      ...SAMPLING,
    })) as { choices: { message: { content: string } }[] };
    const raw = res.choices?.[0]?.message?.content?.trim();
    if (!raw || raw.length < 10) {
      return { kind: "fallback", text: draft, usedLlm: false, reason: "Qwen gaf lege output.", cause: "empty-output" };
    }
    return { kind: "ok", text: dedupeSentences(raw), usedLlm: true, reason: "Qwen-herschrijving toegepast." };

} catch (e) {
return { kind: "fallback", text: draft, usedLlm: false, reason: `Qwen-fout: ${(e as Error).message}`, cause: "error", detail: (e as Error).message };
}
}
Verwijder rewriteAnonymousDraftStream (de oude aparte streaming-functie) — de nieuwe rewriteAnonymousDraft met onToken callback vervangt deze.

Fase 1 — code: UI-fallback-berichten opsplitsen
In StartGoShell.tsx regel 100-116 (rewriteCurrentResult), vervang vage setEgressMsg door specifiek gedrag per cause:

ts

const rewrite = await rewriteAnonymousDraft(result.safeText);
if (rewrite.kind === "ok") {
setLlmMsg("Qwen-herschrijving toegepast — PiM controleert nu opnieuw.");
} else {
switch (rewrite.cause) {
case "not-loaded":
setLlmMsg("Qwen is niet geladen. Open het dashboard om te laden.");
break;
case "empty-output":
setLlmMsg("Qwen gaf lege output. Probeer opnieuw, of gebruik de originele anonieme tekst.");
break;
case "error":
case "stream-error":
setLlmMsg(`Qwen-fout: ${rewrite.detail ?? "onbekend"}. Probeer opnieuw.`);
break;
}
}
Fase 1 — code: DetailsDrawer.tsx
Verwijder regel 30 (<Row k="Profiel" v={decision.profileId ?? "—"} />).

Fase 1 — code: tests
Maak src/lib/pim/**tests**/policy.strict.test.ts:

ts

import { describe, expect, it } from "vitest";
import { decide } from "../policy";
import { DEFAULT_DETECTION_SETTINGS, RULES_ONLY_DETECTION_SETTINGS } from "../detectionSettings";
import type { DraftCheckResult, PrivacySignals } from "../types";

const sig: PrivacySignals = { directPii: [], contextualPii: [], riskScore: 0, riskLevel: "low", reasons: [], ruleIds: [] };
const ok: DraftCheckResult = { status: "pass", issues: [] };

describe("lock-principe", () => {
it("strikt + BERT uit + externe AI → BLOCK met PIM_RULES_ONLY_EXTERNAL_AI_BLOCK", () => {
const d = decide({ mode: "anonymous", action: "send_external_ai", signals: sig, draftCheck: ok,
modelVerified: true, detectionSettings: RULES_ONLY_DETECTION_SETTINGS, payloadType: "draft_anonymous_certified", strictMode: true });
expect(d.verdict).toBe("BLOCK");
expect(d.flag).toBe("PIM_RULES_ONLY_EXTERNAL_AI_BLOCK");
});

it("strikt + BERT uit + export → BLOCK met PIM_RULES_ONLY_EXPORT_BLOCK", () => {
const d = decide({ mode: "anonymous", action: "export_file", signals: sig, draftCheck: ok,
modelVerified: true, detectionSettings: RULES_ONLY_DETECTION_SETTINGS, payloadType: "draft_anonymous_certified", strictMode: true });
expect(d.verdict).toBe("BLOCK");
expect(d.flag).toBe("PIM_RULES_ONLY_EXPORT_BLOCK");
});

it("niet-strikt + BERT uit + externe AI → ALLOW_WITH_WARNING met PIM_BERT_OFF_EGRESS_WARN", () => {
const d = decide({ mode: "anonymous", action: "send_external_ai", signals: sig, draftCheck: ok,
modelVerified: true, detectionSettings: RULES_ONLY_DETECTION_SETTINGS, payloadType: "draft_anonymous_certified", strictMode: false });
expect(d.verdict).toBe("ALLOW_WITH_WARNING");
expect(d.flag).toBe("PIM_BERT_OFF_EGRESS_WARN");
});

it("niet-strikt + BERT uit + copy → ALLOW (kopiëren mag altijd)", () => {
const d = decide({ mode: "anonymous", action: "copy", signals: sig, draftCheck: ok,
modelVerified: true, detectionSettings: RULES_ONLY_DETECTION_SETTINGS, payloadType: "draft_anonymous_certified", strictMode: false });
expect(d.verdict).toBe("ALLOW");
});
});
Maak src/lib/pim/**tests**/enhanceContext.test.ts:

ts

import { describe, it, expect } from "vitest";
import { enhanceContextWithBert } from "../contextualGeneralization";
import type { PiiSpan } from "../types";

describe("enhanceContextWithBert", () => {
it("voegt context_care toe als BERT een naam vindt bij 'dyslexie'", () => {
const text = "Jan heeft dyslexie en krijgt extra tijd.";
const bertSpans: PiiSpan[] = [{
start: 0, end: 3, text: "Jan", category: "name",
ruleId: "slm.ner.per", confidence: 0.95, contextual: false,
}];
const result = enhanceContextWithBert(text, bertSpans);
expect(result).toHaveLength(1);
expect(result[0].category).toBe("context_care");
expect(result[0].ruleId).toBe("ctx.bert_enhanced");
expect(result[0].confidence).toBeLessThan(0.95);
expect(text.slice(result[0].start, result[0].end)).toBe("dyslexie");
});

it("voegt niets toe als er geen contextwoord in de buurt staat", () => {
const text = "Jan gaat naar huis.";
const bertSpans: PiiSpan[] = [{
start: 0, end: 3, text: "Jan", category: "name",
ruleId: "slm.ner.per", confidence: 0.95, contextual: false,
}];
const result = enhanceContextWithBert(text, bertSpans);
expect(result).toHaveLength(0);
});

it("werkt ook voor school-spans", () => {
const text = "De Brug-school heeft zorgleerlingen in groep 7.";
const bertSpans: PiiSpan[] = [{
start: 0, end: 12, text: "De Brug-school", category: "school",
ruleId: "slm.ner.org_school", confidence: 0.85, contextual: false,
}];
const result = enhanceContextWithBert(text, bertSpans);
expect(result.length).toBeGreaterThan(0);
expect(result.some(r => r.category === "context_care")).toBe(true);
});
});
Breid src/lib/pim/**tests**/dedupeSentences.test.ts uit:

ts

it("verwijdert herhaalde placeholder-tokens", () => {
const input = "[persoon] [persoon] heeft dyslexie.";
const out = dedupeSentences(input);
expect(out).toBe("[persoon] heeft dyslexie.");
});
Fase 1 — acceptatiecriteria
decide() retourneert PIM_RULES_ONLY_EXTERNAL_AI_BLOCK in strikte modus met BERT uit bij send_external_ai
decide() retourneert PIM_RULES_ONLY_EXPORT_BLOCK in strikte modus met BERT uit bij export_file
decide() retourneert PIM_BERT_OFF_EGRESS_WARN (ALLOW_WITH_WARNING) in niet-strikt met BERT uit bij externe AI / export
decide() retourneert PIM_OK in niet-strikt met BERT uit bij copy (kopiëren blijft mogelijk)
usePimSettings retourneert geen profileId of setProfileId meer
DetailsDrawer toont geen "Profiel" rij meer
enhanceContextWithBert produceert contextuele spans wanneer BERT namen vindt in de buurt van zorg-woorden
Qwen: sampling, dedupe, fallback werken zoals gespecificeerd
Alle bestaande tests slagen, op profiles.test.ts na die wordt herschreven
Nieuwe tests policy.strict.test.ts en enhanceContext.test.ts slagen
Fase 1 — risico's
Risico
Mitigatie
Call-sites van decide() breken door nieuwe strictMode parameter strictMode is optional met default false; bestaande call-sites hoeven niet te worden aangepast
enhanceContextWithBert veroorzaakt valse positieven Confidence verlagen (×0.7); alleen name/school/address toelaten; woord→categorie mapping beperken
repetition_penalty niet ondersteund door MLC-versie Test; zo niet, verhoog frequency_penalty naar 0.8
profiles.test.ts breekt Herschrijven (de test heet "profiles" maar test profile-free policy — hernoem naar policy.baseline.test.ts)

Fase 2 — Design tokens
Fase 2 — doel
Eén token-systeem, glow/gradients weg, fonts terug naar Inter + IBM Plex Mono. Hardcoded hex-kleuren vervangen door tokens.

Fase 2 — bestanden
src/styles.css — token-definities herschrijven, glow/gradients/fonts verwijderen
Alle componenten in src/components/pim/ — hardcoded kleuren vervangen
Alle routes in src/routes/ — idem
Fase 2 — code: styles.css :root block
Vervang het :root block (regels 98-157) en verwijder glow/gradient/font-definities.

css

:root {
--border: oklch(0.55 0.10 230 / 0.30);
--border-strong: oklch(0.65 0.12 230 / 0.45);
--fg: oklch(0.96 0.015 230);
--fg-muted: oklch(0.72 0.03 230);
--accent: oklch(0.78 0.16 230);
--accent-fg: oklch(0.13 0.04 250);
--ok: oklch(0.82 0.18 145);
--warn: oklch(0.82 0.16 70);
--danger: oklch(0.70 0.22 25);
--code: oklch(0.85 0.04 230);

/_ Tailwind shadcn aliassen — backwards compat _/
--background: var(--bg);
--foreground: var(--fg);
--card: var(--surface);
--card-foreground: var(--fg);
--popover: var(--surface);
--popover-foreground: var(--fg);
--primary: var(--accent);
--primary-foreground: var(--accent-fg);
--secondary: var(--surface-2);
--secondary-foreground: var(--fg);
--muted: var(--surface-2);
--muted-foreground: var(--fg-muted);
--accent-foreground: var(--accent-fg);
--destructive: var(--danger);
--destructive-foreground: var(--fg);
--input: var(--surface-2);
--ring: var(--accent);

--shadow-sm: 0 1px 2px oklch(0 0 0 / 0.10);
--shadow-md: 0 2px 8px oklch(0 0 0 / 0.12);
}

/_ @theme inline — alleen nieuwe tokens _/
@theme inline {
--color-bg: var(--bg);
--color-surface: var(--surface);
--color-surface-2: var(--surface-2);
--color-border: var(--border);
--color-border-strong: var(--border-strong);
--color-fg: var(--fg);
--color-fg-muted: var(--fg-muted);
--color-accent: var(--accent);
--color-accent-fg: var(--accent-fg);
--color-ok: var(--ok);
--color-warn: var(--warn);
--color-danger: var(--danger);
--color-code: var(--code);
/_ shadcn compat (zie boven) _/
}

@layer base {
body {
background: var(--bg);
color: var(--fg);
min-height: 100vh;
font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
}
.font-mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
.card {
background: var(--surface);
border: 1px solid var(--border);
border-radius: var(--radius);
box-shadow: var(--shadow-sm);
}
}
Verwijder uit styles.css:

--shadow-glow, --shadow-glow-cyan, --shadow-glow-orange, --shadow-glow-red, --shadow-glow-green (regels 138-142)
--gradient-bg, --gradient-cyan, --gradient-orange, --gradient-purple (regels 130-137)
.pim-landing block (regels 247-266)
.panel-glow class (regels 213-218)
verdict-allow/warn/block text-shadows (regels 235-237)
Font-imports van Libre Baskerville, Space Grotesk, JetBrains Mono (regels 9-11, 16-17)
Fase 2 — component-migratie
Zoek en vervang in alle componenten:

bash

grep -rn "#[0-9a-f]\{3,6\}" src/components/pim/ src/routes/
Specifieke bekende hardcoded kleuren:

#0f1b3d → var(--bg) of var(--surface)
#1e3a5f → var(--surface-2)
#3b6fa0 → var(--accent)
#e8edf3 → var(--fg)
#3b6fa0/30 → oklch(0.78 0.16 230 / 0.3) of aparte token
Verwijder glow-classes:

shadow-[0_0_24px_oklch(...)] en shadow-[0_0_32px_oklch(...)] → shadow-sm of verwijderen
InputPanel.tsx regel 82 (start-knop glow)
SafetyVerdictCard.tsx regels 11, 17, 23 (verdict-card glow)
RiskGauge.tsx regel 42 (drop-shadow)
ModeTargetBar.tsx regel 55 (toggle glow)
StartHeader.tsx regel 13 (logo blur-md)
Vervang font-classes:

font-display, font-serif-display, font-plex-mono → font-ui of font-mono
Fase 2 — acceptatiecriteria
grep -rn "#[0-9a-f]\{3,6\}" src/components/pim/ src/routes/ retourneert 0 matches
grep -rn "shadow-glow\|shadow-\[0_0_3" src/ retourneert 0 matches
grep -rn "font-serif-display\|font-plex-mono\|font-display" src/ retourneert 0 matches
App ziet er hetzelfde uit op / en /schrijven en /try (qua font en kleurpalet)
Fase 2 — risico's
Risico
Mitigatie
Hardcoded kleuren met opacity lastig te tokeniseren Aanvullende tokens (--accent-soft, --danger-soft) voor 0.1-opacity varianten
.pim-landing verwijderen breekt homepage-styling Eerst tokens toepassen op homepage-componenten, dán .pim-landing verwijderen

Fase 3 — Model-status consolidatie
Fase 3 — doel
Negen plekken → één ModelBar in dashboard + één mini-indicator in schrijfmodus.

Fase 3 — bestanden
Bestand
Wijziging
src/components/pim/start-go/StartGoShell.tsx Verwijder LocalModelStrip (regel 150-157) en render (regel 142)
src/components/pim/start-go/AdvancedPanel.tsx Verwijder LayerSettings BERT-sectie (regel 175-202) en BertOption (regel 207-221)
src/components/pim/writer/WriterShell.tsx Vervang WriterStatusBar (regel 216-227) door mini-indicator zonder knop
src/components/pim/start-go/LiveTechMonitor.tsx Verwijderen (394 regels)
src/components/pim/start-go/TrustBadge.tsx Verwijderen (94 regels)
src/components/pim/start-go/NerVariantPicker.tsx Verplaatsen naar dashboard of verwijderen indien unused
src/components/pim/start-go/LocalStatusPill.tsx Wordt <Link to="/dashboard"> met dot + label
src/components/pim/start-go/MonitorShell.tsx Verwijder LiveTechMonitor en TrustBadge imports/renders
src/components/pim/dashboard/ModelBar.tsx NIEUW
src/components/pim/start-go/ResultActions.tsx Voeg optionele onRewrite prop toe (Qwen-herschrijfknop)

Fase 3 — code: ModelBar.tsx (nieuw)
Maak src/components/pim/dashboard/ModelBar.tsx:

tsx

import { useEffect, useState } from "react";
const dotClass = status === "ready" ? "bg-ok" : status === "loading" ? "bg-warn animate-pulse" : status === "error" ? "bg-danger" : "bg-fg-muted";
return (
<div className="card p-4">
<div className="flex items-start justify-between gap-3">
<div className="flex items-start gap-2 min-w-0">
<Icon className="h-4 w-4 mt-0.5 text-fg-muted shrink-0" />
<div className="min-w-0">
<div className="flex items-center gap-1.5">
<span className={`h-2 w-2 rounded-full ${dotClass}`} />
<span className="font-medium text-sm">{title}</span>
</div>
<p className="text-xs text-fg-muted mt-0.5 leading-snug">{sub}</p>
</div>
</div>
<button onClick={onClick} disabled={disabled}
          className="shrink-0 h-8 px-3 rounded-md border border-border bg-surface-2 text-xs font-medium text-fg hover:bg-accent/10 disabled:opacity-50 disabled:cursor-not-allowed">
{buttonLabel}
</button>
</div>
{error && <p className="mt-2 text-xs text-danger break-words">{error}</p>}
</div>
);
}

function nerStatusKind(s: NerStatus | null): "ready" | "loading" | "error" | "idle" {
if (!s) return "idle";
if (s.error) return "error";
if (s.ready) return "ready";
if (s.loading) return "loading";
return "idle";
}
function nerSub(s: NerStatus | null): string {
if (!s) return "Niet geladen";
if (s.working) return `${s.variant === "large" ? "180 MB" : "100 MB"} · ${s.runtime?.toUpperCase() ?? "onbekend"} · werkt`;
if (s.loading) return s.progress?.file ?? "Laden…";
if (s.error || s.healthError) return "Laden of testen mislukt";
return "Lokaal taalmodel dat namen, organisaties en plaatsen herkent";
}
function nerButton(s: NerStatus | null): string {
if (!s) return "Laden";
if (s.working) return "Werkt";
if (s.loading) return "Bezig";
if (s.error) return "Opnieuw";
return "Laden";
}
function llmStatusKind(s: RewriteStatus | null): "ready" | "loading" | "error" | "idle" {
if (!s) return "idle";
if (s.error) return "error";
if (s.ready) return "ready";
if (s.loading) return "loading";
return "idle";
}
function llmSub(s: RewriteStatus | null): string {
if (!s) return "Niet geladen";
if (s.ready) return "Klaar — herschrijft tekst opnieuw, PiM controleert daarna";
if (s.loading) return s.progress?.text ?? "Modeldownload bezig";
if (s.error) return "Laden mislukt";
return "Lokaal LLM dat je tekst opnieuw formuleert";
}
function llmButton(s: RewriteStatus | null): string {
if (!s) return "Download";
if (s.ready) return "Klaar";
if (s.loading) return "Bezig";
if (s.error) return "Opnieuw";
return "Download";
}
Fase 3 — code: LocalStatusPill.tsx wordt link
Volledige vervanging van src/components/pim/start-go/LocalStatusPill.tsx:

tsx

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { onSelfTest, getSelfTest } from "@/lib/pim/selfTest";
import { onModelIntegrity, type ModelIntegrityRecord } from "@/lib/pim/modelCatalog";

type Status = "ok" | "checking" | "attention";

export function LocalStatusPill() {
const [selfTestStatus, setSelfTestStatus] = useState(getSelfTest()?.status ?? "running");
const [integrity, setIntegrity] = useState<ModelIntegrityRecord[]>([]);

useEffect(() => {
const off1 = onSelfTest((r) => setSelfTestStatus(r.status));
const off2 = onModelIntegrity(setIntegrity);
return () => { off1(); off2(); };
}, []);

const hasModelMismatch = integrity.some((r) => r.status === "mismatch");

let status: Status = "ok";
let label = "Lokaal actief";

if (selfTestStatus === "running" || selfTestStatus === "idle") {
status = "checking"; label = "Starten";
} else if (selfTestStatus === "fail") {
status = "attention"; label = "Controle nodig";
} else if (hasModelMismatch) {
status = "attention"; label = "Modelcheck nodig";
}

const colorClass =
status === "ok" ? "border-ok/40 bg-ok/10 text-ok" :
status === "checking" ? "border-accent/40 bg-accent/10 text-accent" :
"border-warn/40 bg-warn/10 text-warn";
const dotClass =
status === "ok" ? "bg-ok" :
status === "checking" ? "bg-accent animate-pulse" :
"bg-warn";

return (
<Link to="/dashboard" className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${colorClass}`}>
<span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
{label}
</Link>
);
}
Fase 3 — code: ResultActions.tsx Qwen-knop
Voeg optionele onRewrite prop toe:

tsx

interface Props {
// ... bestaande props ...
onRewrite?: () => void;
rewriteAvailable?: boolean;
}

// In JSX, na "Download .txt" knop:
{onRewrite && (
<button type="button" onClick={onRewrite} disabled={!rewriteAvailable || busy}
title={!rewriteAvailable ? "Qwen niet geladen — open dashboard om te laden" : undefined}
className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-surface-2 hover:bg-accent/10 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
<Sparkles className="h-4 w-4" />
Herschrijf met Qwen
</button>
)}
Fase 3 — acceptatiecriteria
grep -rn "LiveTechMonitor" src/ retourneert 0 matches
grep -rn "TrustBadge" src/ retourneert 0 matches
grep -rn "LocalModelStrip" src/ retourneert 0 matches
grep -rn "WriterStatusBar" src/ retourneert 0 matches
Homepage toont geen BERT/Qwen-kaarten meer (alleen StatusPill in header)
Schrijfmodus toont mini-indicator zonder knop
ModelBar wordt alleen in dashboard gerenderd (tijdelijke locatie OK tot fase 6)
Bestanden LiveTechMonitor.tsx, TrustBadge.tsx zijn verwijderd
Fase 3 — risico's
Risico
Mitigatie
LiveTechMonitor verwijderen breekt MonitorShell en WriterShell Eerst imports verwijderen, dán bestand verwijderen
ModelBar is nog niet geplaatst in fase 3 (dashboard komt in fase 6) Tijdelijke inline-render op dashboard-route (die nog niet bestaat) — of fase 3 en 6 deels samenvoegen

Fase 4 — Homepage strippen
Fase 4 — doel
Homepage wordt: header → hero (titel + subtitel + USP-grid) + composer rechts → optioneel resultaat-card. Geen MonitorShell-window, geen mac-stippen, geen "LIVE MONITOR", geen "v1.0", geen status-footer, geen AdvancedPanel.

Fase 4 — bestanden
Bestand
Wijziging
src/components/pim/start-go/MonitorShell.tsx Herschrijven: geen window-header, geen status-footer — gewoon een card-wrapper
src/routes/index.tsx Aanpassen: hero links + composer rechts in grid
src/components/pim/start-go/StartGoShell.tsx Verwijder AdvancedPanel render (regel 143)
src/components/pim/start-go/UspGrid.tsx hairline border vervangen door token
src/components/pim/start-go/AnonPseudoStrip.tsx hairline border vervangen door token

Fase 4 — code: MonitorShell.tsx
Vereenvoudig tot minder dan 20 regels:

tsx

import { StartGoShell } from "./StartGoShell";

export function MonitorShell() {
return (
<div className="card p-6">
<StartGoShell compact />
</div>
);
}
Verwijder: window-header (regel 10-19), status-footer (regel 27-45), mac-stippen, "LIVE MONITOR" label, "v1.0" badge, LiveTechMonitor-knop, TrustBadge.

Fase 4 — code: index.tsx
Layout aanpassen: hero (links) + MonitorShell (rechts) in een grid. UspGrid komt onder de hero (links kolom), niet onder de monitor.

Fase 4 — code: StartGoShell.tsx
Verwijder regel 143 (<AdvancedPanel {...advancedPanelProps} ner={...} />).

Fase 4 — acceptatiecriteria
Homepage toont geen "LIVE MONITOR" label meer
Homepage toont geen mac-stippen meer
Homepage toont geen "v1.0" badge meer
Homepage toont geen "Live techniek" knop meer
Homepage toont geen "trust" badge meer
Homepage toont geen AdvancedPanel meer
MonitorShell.tsx is minder dan 20 regels
Fase 5 — Schrijfmodus strippen
Fase 5 — doel
Schrijfmodus is de referentie-omgeving. Strippen: LiveTechMonitor en AdvancedPanel weg, mini-indicator vervangt WriterStatusBar.

Fase 5 — bestanden
src/components/pim/writer/WriterShell.tsx
Fase 5 — code: WriterShell.tsx
Verwijder:

Import LiveTechMonitor (regel 20)
Import AdvancedPanel (regel 21)
Render LiveTechMonitor in header (regel 181)
Render AdvancedPanel in main (regel 189)
Interne WriterStatusBar functie (regel 216-227)
Vervang door:

Mini-indicator onder de titel (regel 177)
"Instellingen" knop in header die <Link to="/dashboard"> is
Mini-indicator (vervangt WriterStatusBar):

tsx

function ModelMiniIndicator({ nerStatus, detectionSettings }: {
nerStatus: NerStatus | null;
detectionSettings: DetectionLayerSettings;
}) {
if (detectionSettings.bert === "off") {
return (
<div className="mt-1 flex items-center gap-2 text-[11px] text-fg-muted">
<span className="h-2 w-2 rounded-full bg-fg-muted" />
<span>Naamherkenning uit — alleen patroonherkenning</span>
</div>
);
}
const size = detectionSettings.bert === "100mb" ? "100 MB" : "180 MB";
let text = `${size} niet geladen`;
let tone = "bg-fg-muted";
if (nerStatus?.working) { text = `${size} · werkt`; tone = "bg-ok"; }
else if (nerStatus?.loading) { text = `${size} · laden`; tone = "bg-warn animate-pulse"; }
else if (nerStatus?.error || nerStatus?.healthError) { text = `${size} · fout`; tone = "bg-danger"; }
return (
<div className="mt-1 flex items-center gap-2 text-[11px] text-fg-muted">
<span className={`h-2 w-2 rounded-full ${tone}`} />
<span>Naamherkenning: {text}</span>
</div>
);
}
Header-knop (vervangt LiveTechMonitor knop op regel 181):

tsx

<Link to="/dashboard">
  <HeaderAction icon={<Settings className="h-4 w-4" />} label="Instellingen" />
</Link>
Auto-redact-instellingen die in AdvancedPanel zaten (writer.autoRedact, writer.strict) worden via usePimSettings gedeeld — de state leeft in de hook, niet in WriterShell. In fase 6 komt er een Instellingen-tab in dashboard die deze state leest en schrijft.

Fase 5 — acceptatiecriteria
Schrijfmodus importeert geen LiveTechMonitor of AdvancedPanel meer
Schrijfmodus toont mini-indicator onder titel, zonder knop
Schrijfmodus heeft "Instellingen" knop in header die naar /dashboard navigeert
Auto-redact werkt nog via gedeelde state — aan te passen in dashboard, niet in schrijfmodus
Fase 6 — Dashboard bouwen
Fase 6 — doel
Nieuwe route /dashboard met vijf tabs: Testen, Pijplijn, Instellingen, Controle, Log. ModelBar boven tabs. Inhoud vanuit opgeheven routes (/try, /pipeline, /trust) en opgeheven componenten (LiveTechMonitor, AdvancedPanel).

Fase 6 — bestanden
Bestand
Wijziging
src/routes/dashboard.tsx NIEUW
src/components/pim/dashboard/ModelBar.tsx Definitieve locatie (gemaakt in fase 3)
src/components/pim/dashboard/TestTab.tsx NIEUW — inhoud vanuit try.tsx
src/components/pim/dashboard/PipelineTab.tsx NIEUW — RiskGauge + PipelineTimeline + 8-staps visualisatie
src/components/pim/dashboard/SettingsTab.tsx NIEUW — AdvancedPanel-inhoud + strict-mode toggle
src/components/pim/dashboard/ControlTab.tsx NIEUW — inhoud vanuit trust.tsx
src/components/pim/dashboard/LogTab.tsx NIEUW — debug-events + environment-info
src/lib/pim/auditLog.ts NIEUW — audit-log per decide()-call
src/lib/pim/policy.ts Roep logAudit() aan in decide()
src/lib/pim/generalizations.ts VERHUISD van src/components/pim/writer/pimGeneralizations.ts

Fase 6 — code: dashboard.tsx (route)
tsx

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModelBar } from "@/components/pim/dashboard/ModelBar";
import { TestTab } from "@/components/pim/dashboard/TestTab";
import { PipelineTab } from "@/components/pim/dashboard/PipelineTab";
import { SettingsTab } from "@/components/pim/dashboard/SettingsTab";
import { ControlTab } from "@/components/pim/dashboard/ControlTab";
import { LogTab } from "@/components/pim/dashboard/LogTab";

export const Route = createFileRoute("/dashboard")({
head: () => ({
meta: [
{ title: "Dashboard — Project PiM" },
{ name: "description", content: "Technisch dashboard: testen, pijplijn, instellingen, controle en log" },
],
}),
component: DashboardPage,
});

function DashboardPage() {
const [tab, setTab] = useState("testen");
return (
<div className="mx-auto max-w-[1440px] px-6 py-8 space-y-6">
<header className="space-y-1">
<h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
<p className="text-sm text-fg-muted">Technisch beheer van PiM: modellen, detectie, controle en logs.</p>
</header>
<ModelBar />
<Tabs value={tab} onValueChange={setTab}>
<TabsList>
<TabsTrigger value="testen">Testen</TabsTrigger>
<TabsTrigger value="pijplijn">Pijplijn</TabsTrigger>
<TabsTrigger value="instellingen">Instellingen</TabsTrigger>
<TabsTrigger value="controle">Controle</TabsTrigger>
<TabsTrigger value="log">Log</TabsTrigger>
</TabsList>
<TabsContent value="testen" className="mt-6"><TestTab /></TabsContent>
<TabsContent value="pijplijn" className="mt-6"><PipelineTab /></TabsContent>
<TabsContent value="instellingen" className="mt-6"><SettingsTab /></TabsContent>
<TabsContent value="controle" className="mt-6"><ControlTab /></TabsContent>
<TabsContent value="log" className="mt-6"><LogTab /></TabsContent>
</Tabs>
</div>
);
}
Fase 6 — tabs inhoud
TestTab: scenario-launcher + tekstveld + modus/actie + resultaat + sticky verdict bar. Inhoud vanuit try.tsx, maar zonder profileId-state (gebruik usePimSettings), zonder eigen BERT-strip (ModelBar is er al), zonder environment-info (Log-tab heeft het).

PipelineTab: bevat twee visualisaties:

RiskGauge + PipelineTimeline voor live status
De 8-staps interactieve visualisatie uit huidige pipeline.tsx (regel 29-68: STAGES array met Node-structuur)
SettingsTab: bevat:

Lexicon toggle + Context toggle (uit AdvancedPanel.LayerSettings)
BERT segmented control (Uit / 100 MB / 180 MB — uit AdvancedPanel.BertOption)
Auto-redact grid (Wis/Markeer per categorie — uit AdvancedPanel.WriterActions)
Strict mode toggle (lock-principe uit fase 1)
Geavanceerd (collapsible): categorie-toggles, threshold-overrides, model-integriteit
ControlTab: bevat inhoud van trust.tsx:

Self-test (pass/fail, golden cases, ruleset hash, hardening, herstartknop)
Review-wachtrij (items met resolve)
Audit-log (nieuw — uit auditLog.ts)
Egress-controle (re-consult log)
Runtime-bescherming (violations log)
Modelintegriteit
Vervang de profile-card (regel 75-83) door een "Detectielagen"-card die detectionSettings toont
LogTab: bevat:

Debug events (tijd, kind, msg, data) met wissen-knop (uit LiveTechMonitor Log-tab)
Omgevingsinfo (WebGPU, geheugen, browser, etc.) (uit LiveTechMonitor Omgeving-tab)
Fase 6 — code: auditLog.ts (nieuw)
ts

import type { Mode, Action, Verdict, RiskLevel } from "./types";

export interface AuditEntry {
ts: string;
mode: Mode;
action: Action;
verdict: Verdict;
ruleId: string;
reasonCode: string;
riskLevel: RiskLevel;
}

const LOG: AuditEntry[] = [];
const MAX = 200;
const listeners = new Set<(entries: AuditEntry[]) => void>();

function emit() {
const snap = [...LOG].reverse();
for (const l of listeners) l(snap);
}

export function logAudit(entry: AuditEntry): void {
LOG.push(entry);
if (LOG.length > MAX) LOG.shift();
emit();
}

export function onAuditLog(cb: (entries: AuditEntry[]) => void): () => void {
listeners.add(cb);
cb([...LOG].reverse());
return () => listeners.delete(cb);
}

export function getAuditLog(): AuditEntry[] {
return [...LOG].reverse();
}

export function clearAuditLog(): void {
LOG.length = 0;
emit();
}
In policy.ts, aan het eind van decide() (vóór return), log het besluit:

ts

import { logAudit } from "./auditLog";

// ... in decide(), vlak voor de return:
const decision = fromFlag(/_ ... _/);
logAudit({
ts: decision.timestamp,
mode: decision.mode,
action: decision.action,
verdict: decision.verdict,
ruleId: decision.ruleId,
reasonCode: decision.reasonCode,
riskLevel: decision.riskLevel,
});
return decision;
Fase 6 — code: generalizations.ts verhuizen
bash

mv src/components/pim/writer/pimGeneralizations.ts src/lib/pim/generalizations.ts
Voeg in src/lib/pim/index.ts toe:

ts

export \* from './generalizations';
Update imports in WriterShell.tsx en verwijder duplicaat CATEGORY_LABELS in AdvancedPanel.tsx (regel 23-34).

Fase 6 — acceptatiecriteria
/dashboard route bestaat en is toegankelijk via BurgerMenu en StatusPill
TestTab bevat scenario-launcher, tekstveld, modus/actie, resultaat, sticky verdict bar
PipelineTab bevat zowel RiskGauge/PipelineTimeline als 8-staps visualisatie
SettingsTab bevat alle instellingen die AdvancedPanel had, plus strict-mode toggle
ControlTab bevat self-test, review-wachtrij, audit-log, egress-controle, runtime-bescherming, modelintegriteit
LogTab bevat debug-events en environment-info
ModelBar wordt boven tabs gerenderd
Strict-mode toggle in SettingsTab activeert het lock-principe
Audit-log toont beslissingen per decide()-call met metadata
Geen profileId in de UI
Fase 6 — risico's
Risico
Mitigatie
try.tsx is 1500 regels — migreren is veel werk Niet kopiëren; opschonen. Behoud alleen scenario-launcher + tekstveld + modus/actie + resultaat. De rest verhuist naar andere tabs
Sticky verdict bar werkt niet goed met tabs Alleen in Testen-tab tonen; in andere tabs verbergen
Dashboard wordt te groot als één component Elk tab is apart component in src/components/pim/dashboard/

Fase 7 — Navigatie
Fase 7 — doel
Routes /try, /trust, /pipeline verwijderen. BurgerMenu reorganiseren. routeTree.gen.ts regenereren.

Fase 7 — bestanden
Bestand
Wijziging
src/routes/try.tsx Verwijderen
src/routes/trust.tsx Verwijderen
src/routes/pipeline.tsx Verwijderen
src/components/pim/start-go/BurgerMenu.tsx GROUPS array reorganiseren
src/routeTree.gen.ts Regenereren via bun run generate-routes

Fase 7 — code: BurgerMenu.tsx GROUPS
tsx

const GROUPS: Group[] = [
{
label: "Werken met tekst",
items: [
{ kind: "event", event: "pim:reset", label: COPY.menuNewTest, icon: <FilePlus2 className="h-4 w-4" /> },
{ kind: "link", to: "/schrijven", label: COPY.menuWriter, icon: <PenLine className="h-4 w-4" /> },
],
},
{
label: "Technisch",
items: [
{ kind: "link", to: "/dashboard", label: "Dashboard", icon: <Settings className="h-4 w-4" /> },
],
},
{
label: "Info",
items: [
{ kind: "link", to: "/scenarios", label: "Scenario's", icon: <FlaskConical className="h-4 w-4" /> },
{ kind: "link", to: "/modes", label: COPY.menuModes, icon: <Layers className="h-4 w-4" /> },
{ kind: "link", to: "/flags", label: COPY.menuFlags, icon: <Flag className="h-4 w-4" /> },
{ kind: "link", to: "/compliance", label: COPY.menuCompliance, icon: <CheckCircle className="h-4 w-4" /> },
{ kind: "link", to: "/architecture", label: "Architectuur", icon: <Workflow className="h-4 w-4" /> },
{ kind: "link", to: "/over", label: COPY.menuAbout, icon: <Info className="h-4 w-4" /> },
],
},
{
label: "Systeem",
items: [
{ kind: "clear-storage", label: COPY.menuClearStorage, icon: <Trash2 className="h-4 w-4" /> },
],
},
];
Verwijder "Instellingen" event-item (die opende AdvancedPanel-accordion — niet meer nodig nu dashboard er is). Verwijder "Tech-expert" en "Vertrouwen & beleid" groepen.

Fase 7 — acceptatiecriteria
/try, /trust, /pipeline retourneren 404
BurgerMenu heeft 4 groepen: Werken met tekst, Technisch, Info, Systeem
Navigeren naar /dashboard werkt vanuit BurgerMenu en StatusPill
routeTree.gen.ts bevat geen /try, /trust, /pipeline meer
Geen dode links in de app
Fase 8 — Cleanup
Fase 8 — doel
Dode code verwijderen. Tests updaten. Documentatie bijwerken. App klaar voor release.

Fase 8 — bestanden
Bestand
Wijziging
src/lib/pim/pipelineProfile.ts Verwijderen
src/lib/pim/index.ts Verwijder export van pipelineProfile
src/lib/pim/detectionSettings.ts Verwijder profileStringToDetectionSettings shim en vereenvoudig coerceDetectionSettings
src/lib/pim/flags.ts Verwijder PIM_PROFILE_DESIGN_ONLY_BLOCK flag (regel 41)
src/lib/pim/modelGate.ts Vereenvoudig modelGateFor signature (shim verwijderen)
src/lib/pim/**tests**/profiles.test.ts Hernoemen naar policy.baseline.test.ts (test is al profile-free)
src/components/pim/start-go/AdvancedPanel.tsx Verplaatsen naar src/components/pim/dashboard/SettingsPanel.tsx
docs/DESIGN_CHARTER.md Opslaan in repo
README.md Bijwerken met nieuwe routes en architectuur

Fase 8 — code: coerceDetectionSettings vereenvoudigen
In src/lib/pim/detectionSettings.ts:

ts

// Vóór:
function profileStringToDetectionSettings(profileId: string): DetectionLayerSettings {
if (profileId === "education-nl-rules-only") return RULES_ONLY_DETECTION_SETTINGS;
if (profileId === "healthcare-nl" || profileId.includes("design")) return DESIGN_ONLY_DETECTION_SETTINGS;
return DEFAULT_DETECTION_SETTINGS;
}

export function coerceDetectionSettings(input?: DetectionLayerSettings | string | null): DetectionLayerSettings {
if (!input) return DEFAULT_DETECTION_SETTINGS;
if (typeof input === "string") return profileStringToDetectionSettings(input);
return { ...DEFAULT_DETECTION_SETTINGS, ...input, regex: true };
}

// Na:
export function coerceDetectionSettings(input?: DetectionLayerSettings | null): DetectionLayerSettings {
if (!input) return DEFAULT_DETECTION_SETTINGS;
return { ...DEFAULT_DETECTION_SETTINGS, ...input, regex: true };
}
Fase 8 — code: modelGateFor shim verwijderen
ts

// Vóór:
export function modelGateFor(
actionOrLegacyProfile: Action | string,
settingsOrAction: DetectionLayerSettings | string | Action,
integrity: ModelIntegrityRecord[],
): ModelGateResult

// Na:
export function modelGateFor(
action: Action,
settings: DetectionLayerSettings,
integrity: ModelIntegrityRecord[],
): ModelGateResult
Verwijder interne isAction() helper (regel 26-28) en runtime-detectie (regel 35-37). Update alle call-sites — zoek met grep -rn "modelGateFor(" src/.

Fase 8 — acceptatiecriteria
grep -rn "pipelineProfile\|PipelineProfile" src/ retourneert 0 matches
grep -rn "PIM_PROFILE_DESIGN_ONLY_BLOCK" src/ retourneert 0 matches
src/lib/pim/pipelineProfile.ts is verwijderd
Alle tests in src/lib/pim/**tests**/ slagen
Build is schoon (geen warnings over dode code)
docs/DESIGN_CHARTER.md bestaat in de repo
README.md is bijgewerkt
Design-systeem tokens
Eén kleurenpalet, één typografie-stack, één set component-tokens. Donker thema als enige.

Token-tabel
Token
Dark-waarde (default)
Gebruik
--bg oklch(0.16 0.04 250) Pagina-achtergrond
--surface oklch(0.21 0.045 252) Cards, panelen
--surface-2 oklch(0.26 0.05 252) Ingebedde blokken, toolbars
--border oklch(0.55 0.10 230 / 0.30) Subtiele borders
--border-strong oklch(0.65 0.12 230 / 0.45) Focus-border, actieve tab
--fg oklch(0.96 0.015 230) Primaire tekst
--fg-muted oklch(0.72 0.03 230) Secundaire tekst, labels
--accent oklch(0.78 0.16 230) Primaire actie, links, focus-ring
--accent-fg oklch(0.13 0.04 250) Tekst op accent-kleur
--ok oklch(0.82 0.18 145) ALLOW, self-test pass, "veilig"
--warn oklch(0.82 0.16 70) ALLOW_WITH_WARNING, "let op"
--danger oklch(0.70 0.22 25) BLOCK, foutmelding
--code oklch(0.85 0.04 230) Monospace tekst

Typografie
Naam
Stack
Gebruik
UI 'Inter', ui-sans-serif, system-ui, sans-serif Alle UI-tekst, body, knoppen, labels, titels
Mono 'IBM Plex Mono', ui-monospace, monospace IDs, hashes, status-codes, technische details

Vier gewichten: 400 (body), 500 (labels, knoppen), 600 (subtitels), 700 (titels). Geen 300, 800, 900.

Spacing, hoeken, borders
Token
Waarde
--space-1 t/m --space-8 4 / 8 / 12 / 16 / 24 / 32px
--radius-sm 6px
--radius 10px (enige card-radius)
--radius-pill 999px (alleen chips en status-dots)
--border-w 1px

Animaties (slechts drie toegestaan)
Animatie
Wanneer
Duur
fade-in Resultaat verschijnt, panelen worden zichtbaar 150ms ease-out
pulse-dot Status-dot op "laden" of "live" 2s infinite
spin Loader-iconen 1s linear infinite

Verboden: animate-ping, glow-pulse op cards, slide-in animaties voor modals, hover-animaties die meer doen dan background-color veranderen.

Belangrijke ontwerpkeuzes
AdvancedPanel niet verwijderen maar verhuizen naar dashboard/SettingsPanel.tsx. Hergebruik als component.
modelGateFor-shim behouden tot fase 8. Werkt prima; verwijderen is kettingreactie voor weinig winst.
BERT MISC→school mapping niet versimpelen. Huidige logica in nerSlm.ts (MISC wordt school als er school-context is, anders name) is beter dan alleen name. Regels 254-257 onaangeroerd laten.
enhanceContextWithBert: confidence verlagen (×0.7), niet verhogen. Nieuwe span op contextwoord-locatie, niet op naam-locatie. Woord→categorie mapping, niet alles context_care.
pimGeneralizations.ts verhuizen van src/components/pim/writer/ naar src/lib/pim/generalizations.ts — wordt gedeeld tussen WriterShell en dashboard.
Audit-log is nieuw: vijf bestaande logs (violations, egress-reconsult, review-queue, self-test, model-integrity) + één nieuwe audit-log per decide()-call met {ts, mode, action, verdict, ruleId, reasonCode, riskLevel}. Geen inhoud, alleen metadata.
Geen echte footer: de "footer" in MonitorShell (regel 27-45) bevat status-indicatoren (LiveTechMonitor, TrustBadge, "v1.0"), geen navigatie-links. Wordt verwijderd in fase 4. Navigatie zit uitsluitend in BurgerMenu.
Bestanden die verdwijnen / nieuw zijn
Verdwijnen
Bestand
Wanneer
src/routes/try.tsx Fase 7
src/routes/trust.tsx Fase 7
src/routes/pipeline.tsx Fase 7
src/components/pim/start-go/LiveTechMonitor.tsx Fase 3
src/components/pim/start-go/TrustBadge.tsx Fase 3
src/lib/pim/pipelineProfile.ts Fase 8
src/lib/pim/**tests**/profiles.test.ts Fase 1 (hernoemen naar policy.baseline.test.ts)

Nieuw
Bestand
Wanneer
src/routes/dashboard.tsx Fase 6
src/components/pim/dashboard/ModelBar.tsx Fase 3
src/components/pim/dashboard/TestTab.tsx Fase 6
src/components/pim/dashboard/PipelineTab.tsx Fase 6
src/components/pim/dashboard/SettingsTab.tsx Fase 6
src/components/pim/dashboard/ControlTab.tsx Fase 6
src/components/pim/dashboard/LogTab.tsx Fase 6
src/lib/pim/auditLog.ts Fase 6
src/lib/pim/generalizations.ts Fase 6 (verhuisd)
src/lib/pim/**tests**/policy.strict.test.ts Fase 1
src/lib/pim/**tests**/enhanceContext.test.ts Fase 1

Acceptatiecriteria (eind)
grep -rn "#[0-9a-f]\{3,6\}" src/components/pim/ src/routes/ retourneert 0 matches
grep -rn "LiveTechMonitor\|TrustBadge\|LocalModelStrip\|WriterStatusBar" src/ retourneert 0 matches
grep -rn "pipelineProfile\|PipelineProfile" src/ retourneert 0 matches
/try, /trust, /pipeline retourneren 404
/dashboard is toegankelijk met vijf werkende tabs
Homepage toont alleen StatusPill in header (geen model-cards, geen AdvancedPanel)
Schrijfmodus toont mini-indicator (geen knop, geen LiveTechMonitor)
Strict-mode-toggle in dashboard Instellingen-tab werkt (BLOCK met slot-icoon bij BERT uit)
decide() retourneert PIM*RULES_ONLY*\* in strikte modus
decide() retourneert PIM_BERT_OFF_EGRESS_WARN in niet-strikt met BERT uit bij externe AI
Audit-log toont beslissingen per decide()-call
Alle tests slagen, build is schoon
