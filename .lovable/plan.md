## Diagnose

In de huidige Try-it pagina werken twee dingen niet zoals beloofd:

### 1. PiM detector pipeline is "in naam" modulair, maar feitelijk losgekoppeld
- `detectorRegistry.ts` bestaat met `builtin.regex`, `builtin.specialLexicon`, `builtin.nerSlm`, `builtin.contextSlm`, en `runRegistry()`.
- Maar `try.tsx` gebruikt alleen `activeDetectorsFor()` als label voor de UI ("welke detectors zouden actief zijn"), en roept `runRegistry()` **nooit** aan.
- De feitelijke detectie loopt nog via `computeSignals(text, slmSpans)` → `detectPii()` (regex direct) + handmatig toegevoegde `slmSpans`. Dat betekent:
  - **`builtin.specialLexicon` (Cito, Parnassys, SWV, Magister) wordt nooit uitgevoerd** — ook niet in "education-nl-full".
  - Profielwissel naar "rules-only" deactiveert de SLM-toggle wel, maar verandert verder niets aan de detectiestroom — er is geen profiel-gestuurde dispatch.
- Resultaat: detector registry is dood gewicht; UI toont "actieve detectors" die in werkelijkheid niet meedraaien.

### 2. SLM-contextdetectie is te smal en te streng
In `nerSlm.ts`:
- Confidence-floor is `0.6`. `bert-base-multilingual-cased-ner-hrl` geeft Nederlandse PER-namen vaak rond 0.45–0.55 (vooral korte voornamen of niet-westerse namen). Die vallen er nu uit → "Sarah Jansen" kan zelfs gemist worden, terwijl regex `rule.name` 'm wel pakt; het effect is dat de SLM niets toevoegt of zelfs *minder* lijkt te detecteren dan regex.
- ORG → school-detectie kijkt alleen naar 30 chars vóór de span en mist patronen als "basisschool De Wilg" omdat de regex `rule.school` daar al zit en hetzelfde gebied claimt → SLM-output wordt gedropt door overlap-merge in `risk.ts` (overlap = drop, niet merge).
- LOC wordt naar `address` gemapt met `* 0.8` confidence → onder de 0.6 floor valt het er meteen uit. "Utrecht" wordt dus nooit als PII-context gedetecteerd door de SLM.
- Geen mapping van `MISC` → context_role / school. Wikineural-stijl modellen taggen schoolnamen vaak als MISC, niet ORG.
- Geen post-filter voor token-fragments (`##jansen`) buiten een naïeve `replace(/^##/, "")` — sub-words worden soms als losse spans geretourneerd zonder samengevoegd te worden door `aggregation_strategy: "simple"` als de tokenizer rare splits maakt; dat veroorzaakt mini-spans die door de 0.6 floor sneuvelen.

### 3. Bijkomstig: "context"-detectie via SLM bestaat niet
- `builtin.contextSlm` is een lege stub (`run: () => []`).
- De UI noemt 'm "actief" in education-nl-full → user verwacht context-classificatie (zorg/incident/role) via een model maar krijgt enkel de regex `ctx.*` patronen uit `detectors.ts`.

## Wat we gaan bouwen

### A. Detector pipeline echt aansluiten (de blocker)
1. **`computeSignals()` profiel-aware maken** in `src/lib/pim/risk.ts`:
   - Nieuwe signature: `computeSignals(text, extraSpans, profileId?)` (backwards compatible — default profiel).
   - Intern niet meer rechtstreeks `detectPii()` aanroepen; in plaats daarvan een synchrone variant van de registry gebruiken.
2. **Synchrone registry-pad** toevoegen in `detectorRegistry.ts`:
   - `runRegistrySync(text, profileId)` voert alleen niet-async detectors uit (regex + specialLexicon + heuristic context).
   - `runRegistry()` blijft async voor de SLM/contextSLM-uitbreiding.
3. **Try-it gebruikt het profiel**:
   - `computeSignals(text, slmEnabled ? slmSpans : [], profileId)`.
   - SpecialLexicon-spans verschijnen nu in chips (Parnassys, Magister, Cito, SWV).
   - Switch naar "rules-only" laat de SLM-spans automatisch buiten beschouwing (toggle staat al uit, maar nu ook gedocumenteerd via registry).

### B. SLM context-detectie versterken
In `src/lib/pim/nerSlm.ts`:
1. **Confidence-floor verlagen + categoriegevoelig** maken:
   - PER ≥ 0.45 (was 0.6).
   - ORG (school-context) ≥ 0.45.
   - LOC ≥ 0.5 (geen extra `*0.8` straf — confidence is al een score).
   - MISC ≥ 0.55 → mappen naar `school` als context-window school-keywords bevat, anders `name`.
2. **Context-window verbreden**: 60 chars vóór én 20 chars ná de span (was 30/5).
3. **Sub-word fragmenten samenvoegen**: defensieve post-pass die opeenvolgende `##`-spans van hetzelfde type aan elkaar plakt.
4. **Span-merge in `risk.ts` aanpassen**: bij overlap niet stilletjes droppen, maar de hoogste-confidence span behouden — anders blijft de regex `rule.name` altijd winnen van een betere SLM-tag voor dezelfde tekens. Dit is hetzelfde patroon als `detectors.ts` zelf al gebruikt; trekken we door naar de SLM-merge.

### C. Lichte heuristische "contextSLM" implementatie
In `detectorRegistry.ts`, de `builtin.contextSlm` stub vervangen door een echte sync detector met:
- Co-occurrence boost: als binnen 80 chars een `name` + (`context_care` | `context_incident` | `context_small_group`) voorkomen → emit een synthetische span `category: "context_care"` met hogere confidence (signaleert herleidbaarheidsrisico).
- Detecteert "vader van X", "moeder van X", "ouder van X" → familie-relatie context-span (nieuwe ruleId `ctx.family_relation`, mapt naar bestaande `context_role`).
- Geen model-download — het heet `contextSlm` voor framework-symmetrie, maar is een heuristic die we eerlijk in de UI labelen als "rule-driven contextual signals".

### D. UI: laat zien wat detectors écht produceren
In `src/routes/try.tsx`:
- Bij elke chip in panel "02 · Detectie & signals" een mini-tag toevoegen die laat zien welke detector hem vond (`regex` / `lex` / `slm` / `ctx`), gebaseerd op de `ruleId` prefix. Geeft directe visuele bevestiging dat álle gates lopen.
- Zet onder "detectors actief" ook een live count per detector ("regex: 6 · lex: 2 · slm: 3"), zodat de gebruiker meteen ziet of de SLM iets toevoegt.

## Niet in deze ronde
- Echte ML-context-classifier (zou een tweede model van ~80MB+ vereisen). Heuristic dekt 80% van de spec-rubrieken.
- Profielwissel die de regex-set zelf inkort (rules-only blijft alle regex draaien; alleen SLM/contextSLM uit). Past bij intentie van het profiel.

## Bestanden die wijzigen
- `src/lib/pim/detectorRegistry.ts` — `runRegistrySync()` toevoegen, `builtin.contextSlm` invullen, family-relation pattern.
- `src/lib/pim/risk.ts` — `computeSignals()` signature uitbreiden met optionele `profileId`, registry aanroepen i.p.v. losse `detectPii()`, overlap-merge naar "highest confidence wins".
- `src/lib/pim/nerSlm.ts` — confidence-floor per categorie, bredere context-window, sub-word merge, MISC-mapping.
- `src/routes/try.tsx` — `computeSignals(..., profileId)` doorgeven, per-chip detector-bron tag, live counts.

Geen breaking changes voor andere routes (`compliance`, `pipeline` etc.) want `computeSignals` blijft backwards-compatible aanroepbaar zonder profielargument.
