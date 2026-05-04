## Status check eerst

Ik heb je PvA naast de codebase gelegd. Een aantal stappen zijn al (deels) gedaan, andere niet. Het heeft geen zin om die opnieuw te doen — dat zou bestaande werking kapotmaken.

| PvA-stap | Status nu | Actie |
|---|---|---|
| 0a CSP meta-tag | Niet aanwezig (geen `index.html`; TanStack Start beheert head via `__root.tsx`) | **Doen** via `__root.tsx` head meta |
| 0b runtimeHardening eerst laden | Bestaat (`runtimeHardening.ts`), maar wordt pas in `/try` geïnstalleerd, niet app-breed | **Doen** — verplaatsen naar `__root.tsx` |
| 0c externe afhankelijkheden weghalen | OG-image staat op `storage.googleapis.com`; verder geen externe scripts | **Doen** — OG-image lokaal serveren |
| 1A extra detectoren (leerlingnummers, klascodes, schoollijst) | Niet aanwezig | **Doen** |
| 1B UI: highlight anonieme tekst + risk banner | Risk gauge + verdict pill bestaan; per-span highlight in output ontbreekt | **Doen** |
| 1C TrustDashboard `/trust` | Bestaat niet | **Doen** |
| 1D draftCheck na anon: spans in audit log | `draftCheck` draait al op output (regel 71-96 `processing.ts`); residuele PII komt in `issues`, maar niet als gestructureerde spans in audit | **Verbeteren** (klein) |

Niet doen: `runtimeHardening` opnieuw schrijven, egressGuard opnieuw schrijven, secureMapping aanraken, of hele Try-it pagina opnieuw bouwen.

---

## Plan — 3 fases, jij keurt na elke fase af

### Fase 1 — Hardening basis (veiligheid eerst)

1. **CSP meta toevoegen** in `src/routes/__root.tsx` `head().meta`:
   `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://huggingface.co https://*.huggingface.co https://*.hf.co https://cas-bridge.xethub.hf.co https://cdn.jsdelivr.net https://raw.githubusercontent.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'`
   - `wasm-unsafe-eval` is nodig voor `@mlc-ai/web-llm` + transformers.js
   - `connect-src` matcht exact de `MODEL_HOSTS` in `runtimeHardening.ts`
   - `worker-src blob:` nodig voor web-llm worker
2. **`installRuntimeHardening()` app-breed** in `RootComponent` (`__root.tsx`) i.p.v. alleen `/try`. Hardening moet aanstaan vóór elke route, niet pas als gebruiker naar Try-it navigeert.
3. **OG-image lokaal**: huidige verwijst naar `storage.googleapis.com`. Optie: vervangen door pad in `/public` (vraag: heb je een lokale variant of mag deze blijven? google-storage is geen tracker maar staat los van project).

### Fase 2 — Detectie uitbreiden

In `src/lib/pim/detectors.ts` en/of `detectorRegistry.ts`:

- **Leerlingnummer** (6–8 cijfers, niet samenvallend met BSN-9): regex met negative lookahead op 9-digits. Confidence 0.55, contextueel `false`, categorie `name` (of nieuw type — zie keuze hieronder).
- **Klascode NL VO**: `\b[1-6][HVMG][a-zA-Z]?\d?\b` patroon (bv. `4H1`, `V5B`, `3V`, `2M`). Confidence 0.6, contextueel `true`, categorie `context_small_group`.
- **Schoolnamenlijst**: nieuwe constante `NL_SCHOOL_NAMES` in `detectorRegistry.ts` (uitbreiding `EDU_LEXICON`) met ~30 bekende koepels (Carmel, OMO, Ons Middelbaar Onderwijs, Stichting Lucas, etc.). Strikt lokaal, geen externe fetch.

Categorie-keuze: leerlingnummer past niet helemaal in bestaande `PiiCategory` enum. Twee opties tijdens implementatie:
- (a) hergebruik `bsn` (semantisch vreemd) of `name` (te breed)
- (b) nieuw type `student_id` toevoegen aan `types.ts` + `GENERALIZATIONS` map in `processing.ts`. **Voorkeur: (b)**, schoner.

### Fase 3 — UI + transparantie

1. **Anonimisatie-highlight** in Try-it draft panel: render geanonimiseerde tokens (`[email]`, `[persoon]`, etc.) met een chip/badge-stijl (bv. `bg-accent/40 border border-primary/40 px-1 rounded`) zodat in één oogopslag zichtbaar is wat is vervangen. Pure UI-wijziging in `src/routes/try.tsx`, geen logica-aanpassing.
2. **Risico-waarschuwingsbanner** boven draft als `riskLevel ∈ {high, critical}`: rode/oranje balk met icon + verdict-uitleg. Sluit aan op bestaande `RiskGauge` kleurlogica.
3. **`/trust` route** = nieuwe `src/routes/trust.tsx` met `TrustDashboard` component:
   - Pipeline actief (versie + profile)
   - Hardening geladen (haakt op `installRuntimeHardening` flag)
   - Egress-violations live tabel via `onViolations()` listener
   - Modelintegriteit (haak op bestaande `modelCatalog`)
   - Laatste audit events (laatste 10 uit reviewQueue/audit)
   Linkje toevoegen in footer, niet in hoofdnav (om Try-it focus te bewaren).
4. **draftCheck verfijning** (klein): residuele spans uitsplitsen als gestructureerde array in `DraftCheckResult` (i.p.v. alleen string `issues`), zodat `/trust` ze kan tonen zonder de inhoud zelf te lekken — alleen `category` + `ruleId`.

---

## Bestanden

**Edited**
- `src/routes/__root.tsx` — CSP meta + `useEffect(installRuntimeHardening)` in `RootComponent`
- `src/lib/pim/detectors.ts` — leerlingnummer + klascode regex
- `src/lib/pim/detectorRegistry.ts` — uitgebreide `EDU_LEXICON` met schoollijst
- `src/lib/pim/types.ts` — `student_id` toevoegen aan `PiiCategory` (als optie b gekozen)
- `src/lib/pim/processing.ts` — `GENERALIZATIONS["student_id"]`, en `DraftCheckResult.residualSpans?: {category, ruleId}[]`
- `src/routes/try.tsx` — highlight chips in draft, warning banner

**New**
- `src/routes/trust.tsx` — `/trust` route + `TrustDashboard` component

**Niet aangeraakt**
- `runtimeHardening.ts`, `egressGuard.ts`, `secureMapping.ts`, `nerSlm.ts`, `rewriteLlm.ts`, `policy.ts`, `risk.ts` — werken al correct
- Andere routes

---

## Open vraag

OG-image (Fase 1 stap 3): vervangen door lokaal asset, of laten staan? google-storage levert hem maar is geen analytics/tracker. Mijn voorkeur: laten staan, lager prioriteit dan rest. Laat weten als je dit wel mee wilt nemen.

Akkoord met deze 3 fases? Dan start ik met Fase 1 (hardening), pauzeer, en wacht op jouw verificatie voor Fase 2.