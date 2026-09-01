# Project PiM — Verzameldocument

> Eén overzicht van wat er mis is, wat we eraan gaan doen, en hoe. Dit document is de ingang; details staan in docs 01-05.

**Doel van de refactor**: de backend is goed, de UI/UX is een rommel. We consolideren naar één design-systeem, één dashboard voor alles technisch, vereenvoudigde homepage en schrijfmodus, en een lock-principe in plaats van silent blocks.

**Scope**: alleen herstructurering van bestaande code. Geen nieuwe backend-architectuur, geen light theme, geen mobiel redesign, geen i18n.

**Schatting**: ~10-12 weken, 8 fases, één PR per fase.

---

## 1. Wat er mis is

Drie structurele problemen, geen losse cosmetica:

### 1.1 Drie design-systemen door elkaar

- `.pim-landing` hex-palet op de homepage (`#0f1b3d`, `#1e3a5f`, `#3b6fa0`)
- oklch `:root` tokens met cyan/orange/purple/green/red + glow-shadows op `/try`, `/trust`, `/pipeline`
- shadcn `.dark` override met neutrale grijzen

Gevolg: bij navigatie verandert de hele look — fonts, kleuren, glow-effecten. Zie screenshots 1 (homepage) en 5 (`/trust`).

### 1.2 Negen plekken met model-status

1. `LocalModelStrip` in `StartGoShell`
2. BERT-sectie in `AdvancedPanel`
3. `BertOption`-kaarten in `AdvancedPanel`
4. `WriterStatusBar` in `WriterShell`
5. `LiveTechMonitor` "Modellen"-tab
6. `LiveTechMonitor` "Live"-tab (modellen-mini)
7. Eigen BERT-strip in `try.tsx`
8. `LocalStatusPill` (indirect)
9. `TrustBadge` popover

Gevolg: gebruiker weet niet waar BERT aan staat of waarom acties geblokkeerd worden.

### 1.3 Technisch jargon op eindgebruikerspagina's

`AdvancedPanel` toont op de homepage: Regex, Lexicon, Context, BERT 100 MB / 180 MB, NER, SLM, DistilBERT, integrity-list. Een docent begrijpt hier niets van.

Daarnaast: nestpoppen-structuur op de homepage (`MonitorShell` verpakt `StartGoShell` verpakt `ResultPanel`), vijf routes die deels hetzelfde doen (`/`, `/schrijven`, `/try`, `/trust`, `/pipeline`), en een beleidsbug in de backend.

---

## 2. Wat we eraan gaan doen

### 2.1 Backend (klein, fundamenteel)

- **Twee ontbrekende checks toevoegen** in `decide()`: `PIM_RULES_ONLY_EXTERNAL_AI_BLOCK` en `PIM_RULES_ONLY_EXPORT_BLOCK` staan in `flags.ts` maar worden nergens aangeroepen. Nu kan iemand met BERT uit stilletjes naar externe AI sturen of exporteren.
- **Lock-principe** in plaats van silent blocks:
  - _Niet-strikt (default)_: alles mag. Externe AI en export met BERT uit geven `ALLOW_WITH_WARNING` ("mogelijk niet alles gedetecteerd"). Kopiëren, printen, sharen mogen altijd.
  - _Strikt (gebruiker zet zelf aan)_: externe AI en export worden geblokkeerd totdat BERT aan staat. Knoppen krijgen slot-icoon.
- **`profileId` verwijderen** uit `usePimSettings`, `types.ts`, `DetailsDrawer`. Is al optional maar lekt nog door naar de UI.
- **`enhanceContextWithBert`** toevoegen: BERT-spans versterken context-detectie (naam + "dyslexie" → `context_care` span). Geen extra model, hergebruikt bestaande BERT.
- **Qwen volledig verbeteren** (niet alleen de prompt): sampling aanscherpen, `dedupeSentences` versterken, fallback discrimineren, streaming/non-streaming samenvoegen.

### 2.2 Design-systeem (één vast)

- Eén token-systeem: `--bg`, `--surface`, `--accent`, `--ok`, `--warn`, `--danger`, `--fg`, `--fg-muted`. Geen `--cyan`/`--orange`/`--purple` meer als aparte accenten.
- Eén typografie-stack: Inter (UI) + IBM Plex Mono (technisch). Geen Libre Baskerville, Space Grotesk, JetBrains Mono meer.
- Geen glow-shadows, geen gradients, geen `animate-ping`. Eén zachte `shadow-sm` op cards.
- Donker thema als enige (light theme uitgesloten in deze refactor).
- Schrijfomgeving (`/schrijven`) is de stilistische referentie; de rest wordt hiernaar getrokken.

### 2.3 Eén model-status-patroon

- **ModelBar** (alleen in dashboard, boven de tabs): twee cards (Naamherkenning + Herschrijver) met status-dot + uitleg + laadknop.
- **Mini-indicator** (alleen in schrijfmodus, onder titel): `"Naamherkenning: 100 MB · werkt"`. Geen knop.
- Homepage: geen model-status meer. Alleen StatusPill in header.
- Verwijderen: `LocalModelStrip`, BERT-sectie in `AdvancedPanel`, `WriterStatusBar`, `LiveTechMonitor` (hele sheet), `TrustBadge`, eigen BERT-strip in `try.tsx`, `NerVariantPicker` als standalone.

### 2.4 Eén status-patroon

- **StatusPill** in header (altijd zichtbaar): dot + label, is een `<Link to="/dashboard">`. Drie toestanden: OK / Let op / Starten.
- Geen `TrustBadge` popover, geen `LiveTechMonitor`-knop meer. Het dashboard is de tooltip.

### 2.5 Vereenvoudigde eindgebruikerspagina's

- **Homepage `/`**: header → hero (titel + subtitel + USP-grid) + composer rechts → optioneel resultaat-card. Geen `MonitorShell`-window, geen mac-stippen, geen "LIVE MONITOR", geen "v1.0", geen status-footer, geen `AdvancedPanel`.
- **Schrijfmodus `/schrijven`**: globale AppHeader → sub-toolbar (Import/Export/Leeg) → mini-indicator → editor. Geen `LiveTechMonitor`, geen `AdvancedPanel`. Auto-redact-instellingen verhuizen naar dashboard.
- Geen technisch jargon op deze pagina's. "Regex", "Lexicon", "Context", "BERT", "NER", "SLM" mogen alleen in het dashboard.

### 2.6 Eén dashboard voor alles technisch

Nieuwe route `/dashboard` met vijf tabs:

- **Testen** — scenario-launcher, tekstveld, modus/actie, resultaat, sticky verdict bar (inhoud vanuit `/try`)
- **Pijplijn** — `RiskGauge` + `PipelineTimeline` + 8-staps interactieve visualisatie (inhoud vanuit `/pipeline`)
- **Instellingen** — Lexicon/Context toggles, BERT segmented control, auto-redact grid, strict-mode toggle, geavanceerd (collapsible), model-integriteit (inhoud vanuit `AdvancedPanel`)
- **Controle** — self-test, review-wachtrij, audit-log (nieuw), egress-controle, runtime-bescherming, modelintegriteit (inhoud vanuit `/trust`)
- **Log** — debug-events + omgevingsinfo (inhoud vanuit `LiveTechMonitor`)

ModelBar boven de tabs.

### 2.7 Navigatie opschonen

- Routes `/try`, `/trust`, `/pipeline` verwijderen (inhoud zit in dashboard).
- `BurgerMenu` reorganiseren naar vier groepen: Werken met tekst (`/`, `/schrijven`), Technisch (`/dashboard`), Info (scenarios/modes/flags/compliance/architecture/over), Systeem (opslag wissen).
- StatusPill linkt naar `/dashboard`.

---

## 3. Hoe we het doen — 8 fases

| #   | Fase                      | Doel                                                                                                        | Duur | Risico    |
| --- | ------------------------- | ----------------------------------------------------------------------------------------------------------- | ---- | --------- |
| 1   | Backend + lock            | `PIM_RULES_ONLY_*` checks, `profileId` weg, `strictMode` erin, `enhanceContextWithBert`, Qwen-verbeteringen | 2 wk | Laag      |
| 2   | Design tokens             | Eén token-systeem, glow/gradients weg, fonts teruggebracht                                                  | 3 wk | Gemiddeld |
| 3   | Model-status consolidatie | Negen plekken → ModelBar + mini-indicator                                                                   | 2 wk | Gemiddeld |
| 4   | Homepage strippen         | `MonitorShell` als window weg, `AdvancedPanel` weg                                                          | 2 wk | Laag      |
| 5   | Schrijfmodus strippen     | `LiveTechMonitor`/`AdvancedPanel` weg, mini-indicator                                                       | 1 wk | Laag      |
| 6   | Dashboard bouwen          | Nieuw `/dashboard` met 5 tabs + ModelBar + SettingsPanel                                                    | 4 wk | Hoog      |
| 7   | Navigatie                 | `/try`/`/trust`/`/pipeline` weg, `BurgerMenu` reorganiseren                                                 | 1 wk | Gemiddeld |
| 8   | Cleanup                   | `pipelineProfile.ts` weg, `coerceDetectionSettings` shim weg, `modelGateFor` shim weg, tests updaten        | 2 wk | Laag      |

**Totaal**: ~17 weken bruto, realistisch 10-12 weken met parallelisatie (fase 4 en 5 parallel; fase 6 in deel-PR's).

**Volgorde-afhankelijkheid**: lineair, met beperkte parallelisatie. Fase 1 eerst (backend moet kloppen vóór UI). Fase 2 daarna (tokens zijn fundering). Fase 6 pas na fase 4 en 5 (dashboard vereist opgeruimde pagina's). Fase 7 pas na fase 6 (pas routes verwijderen als dashboard er is).

---

## 4. Lock-principe — kort samengevat

| Actie                    | Niet-strikt, BERT uit | Strikt, BERT uit       | Beide, BERT aan               |
| ------------------------ | --------------------- | ---------------------- | ----------------------------- |
| `display`, `save_local`  | ALLOW                 | ALLOW                  | ALLOW                         |
| `copy`, `print`, `share` | ALLOW                 | ALLOW                  | ALLOW (tenzij risk > drempel) |
| `export_file`            | ALLOW_WITH_WARNING    | **BLOCK** + slot-icoon | ALLOW (tenzij risk > drempel) |
| `send_external_ai`       | ALLOW_WITH_WARNING    | **BLOCK** + slot-icoon | ALLOW (tenzij risk > drempel) |
| `restore` (anon)         | BLOCK (geen mapping)  | BLOCK                  | BLOCK                         |

**Waarom**: kopiëren moet altijd kunnen, anders denken gebruikers dat PiM stuk is. Maar externe AI en export zijn échte egress — die mogen in strikte modus niet zonder volledige detectie. De gebruiker kiest zelf om het "slot dicht te doen" via de strict-mode-toggle in dashboard Instellingen-tab.

---

## 5. Belangrijke ontwerpkeuzes (uitspraken)

- **`AdvancedPanel` niet verwijderen maar verhuizen** naar `dashboard/SettingsPanel.tsx`. Hergebruik als component.
- **`modelGateFor`-shim behouden tot fase 8**. Werkt prima; verwijderen is kettingreactie voor weinig winst.
- **BERT MISC→school mapping niet versimpelen**. Huidige logica in `nerSlm.ts` (MISC wordt `school` als er school-context is, anders `name`) is beter dan alleen `name`.
- **`enhanceContextWithBert`**: confidence verlagen (×0.7), niet verhogen. Nieuwe span op contextwoord-locatie, niet op naam-locatie. Woord→categorie mapping, niet alles `context_care`.
- **`pimGeneralizations.ts` verhuizen** van `src/components/pim/writer/` naar `src/lib/pim/generalizations.ts` — wordt gedeeld tussen WriterShell en dashboard.
- **Audit-log is nieuw**: vijf bestaande logs (violations, egress-reconsult, review-queue, self-test, model-integrity) + één nieuwe audit-log per `decide()`-call met `{ts, mode, action, verdict, ruleId, reasonCode, riskLevel}`. Geen inhoud, alleen metadata.
- **Geen echte footer**: doc 2 §3.6 doelde op de status-footer in `MonitorShell` (die wordt verwijderd) + `BurgerMenu`-navigatie (die wordt gereorganiseerd).

---

## 6. Bestanden die verdwijnen

| Bestand                                           | Wanneer                              |
| ------------------------------------------------- | ------------------------------------ |
| `src/routes/try.tsx`                              | Fase 7                               |
| `src/routes/trust.tsx`                            | Fase 7                               |
| `src/routes/pipeline.tsx`                         | Fase 7                               |
| `src/components/pim/start-go/LiveTechMonitor.tsx` | Fase 3                               |
| `src/components/pim/start-go/TrustBadge.tsx`      | Fase 3                               |
| `src/lib/pim/pipelineProfile.ts`                  | Fase 8                               |
| `src/lib/pim/__tests__/profiles.test.ts`          | Fase 1 (herschrijven of verwijderen) |

## 7. Bestanden die nieuw zijn

| Bestand                                        | Wanneer                      |
| ---------------------------------------------- | ---------------------------- |
| `src/routes/dashboard.tsx`                     | Fase 6                       |
| `src/components/pim/dashboard/ModelBar.tsx`    | Fase 3 (geplaatst in fase 6) |
| `src/components/pim/dashboard/TestTab.tsx`     | Fase 6                       |
| `src/components/pim/dashboard/PipelineTab.tsx` | Fase 6                       |
| `src/components/pim/dashboard/SettingsTab.tsx` | Fase 6                       |
| `src/components/pim/dashboard/ControlTab.tsx`  | Fase 6                       |
| `src/components/pim/dashboard/LogTab.tsx`      | Fase 6                       |
| `src/lib/pim/auditLog.ts`                      | Fase 6                       |
| `src/lib/pim/__tests__/policy.strict.test.ts`  | Fase 1                       |
| `src/lib/pim/__tests__/enhanceContext.test.ts` | Fase 1                       |

---

## 8. Acceptatiecriteria — wanneer zijn we klaar

- [ ] `grep -rn "#[0-9a-f]\{3,6\}" src/components/pim/ src/routes/` retourneert 0 matches
- [ ] `grep -rn "LiveTechMonitor\|TrustBadge\|LocalModelStrip\|WriterStatusBar" src/` retourneert 0 matches
- [ ] `grep -rn "pipelineProfile\|PipelineProfile" src/` retourneert 0 matches
- [ ] `/try`, `/trust`, `/pipeline` retourneren 404
- [ ] `/dashboard` is toegankelijk met vijf werkende tabs
- [ ] Homepage toont alleen StatusPill in header (geen model-cards, geen AdvancedPanel)
- [ ] Schrijfmodus toont mini-indicator (geen knop, geen LiveTechMonitor)
- [ ] Strict-mode-toggle in dashboard Instellingen-tab werkt (BLOCK met slot-icoon bij BERT uit)
- [ ] `decide()` retourneert `PIM_RULES_ONLY_*` in strikte modus
- [ ] `decide()` retourneert `ALLOW_WITH_WARNING` in niet-strikt met BERT uit bij externe AI
- [ ] Alle tests slagen, build is schoon

---

## 9. Detail-documenten

Dit verzameldocument is de ingang. Voor implementatie, raadpleeg:

| Doc                          | Inhoud                                                                                               | Wanneer lezen         |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------- |
| `01-design-charter.md`       | Bindend design-systeem: tokens, typografie, patronen                                                 | Vóór fase 2           |
| `02-ui-ux-audit.md`          | Per component: problemen, prioriteit (P0/P1/P2), oplossing                                           | Vóór elke fase        |
| `03-refactor-plan.md`        | 8 fases gedetailleerd: bestanden, acties, risico's, schatting                                        | Vóór elke fase        |
| `04-implementation-guide.md` | Concrete code-snippets: lock-principe, enhanceContextWithBert, ModelBar, StatusPill, dashboard-route | Tijdens implementatie |
| `05-supplement.md`           | Aanvullingen: Qwen volledig, modelGateFor-shim, valkuilen, audit-log, terminologie                   | Tijdens fase 1 en 6   |

Na fase 8 worden docs 01-05 opgeslagen in de repo onder `docs/`.

---

## 10. Volgende stap

Begin met **fase 1**. Lees voor fase 1:

- Doc 3 §2 (refactor-plan fase 1)
- Doc 4 §1-§7 (implementation-guide: backend, lock, enhanceContextWithBert, Qwen-prompt, tests)
- Doc 5 §1 (Qwen volledig — sampling, dedup, fallback, streaming)
- Doc 5 §3 (enhanceContextWithBert zes valkuilen)

Fase 1 is 1 sprint werk, laag risico, en lost tegelijk de beleidsbug én de Qwen-kwaliteit op. Daarna is de fundering klaar voor de UI-fases.
