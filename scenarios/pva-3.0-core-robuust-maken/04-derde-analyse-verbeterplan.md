# Project PiM - derde analyse en aangepast verbeterplan

Datum: 20 juni 2026  
Bronnen: eerder verbeterplan, aangeleverde zip `project-pim-main (2).zip`, uitgepakte code, PVA 3.0-map en GitHub-repo `E-AI-MODEL/project-pim`.

---

## 0. UITVOERINGSSTATUS (levend werkbestand)

Bij elke afgeronde taak: `[ ]` → `[x]`, datum, eventuele afwijking.

### Guardrails (§16)
- [x] G1 Geen extra panelen aan `/try` (gevolgd in alle fasen).
- [x] G2 Geen UI bouwen vóór build/tests groen zijn — Fase 0 eerst.
- [x] G3 Geen claim "productie-anonimisatie".
- [x] G4 Rules-only mag niet exporteren.
- [x] G5 Pseudonieme output niet kopiëren/delen.
- [x] G6 Modelstatus niet verstoppen.
- [x] G7 Geen uitleg op `/`.
- [x] G8 Geen OCR vóór egress + tests hard.

### Fase 0 — Repo-hygiëne
- [x] 0.1 `bun install` schoon (2026-06-20).
- [x] 0.2 Script `typecheck` = `tsc --noEmit`.
- [x] 0.3 Script `test` = `vitest run`.
- [x] 0.4 Script `test:watch` = `vitest`.
- [x] 0.5 Script `check` = typecheck + lint + test + build.
- [x] 0.6 Vitest + jsdom + @testing-library/react geïnstalleerd.
- [x] 0.7 Smoketest groen (`src/lib/pim/__tests__/smoke.test.ts`).
- [x] 0.8 `<html lang="nl">`.

**Afwijking §4.2:** project gebruikt Bun (`bunfig.toml`); `npm ci`/`package-lock.json` overgeslagen, vervangen door `bun install`/`bun.lock`.

### Fase 1 — PIM-core hard maken
- [ ] 1.1 `PayloadType` toegevoegd · 1.2 `CertifiedPayload` · 1.3 uitgebreide `DraftCheckResult` · 1.4 `profileId` in `DecideInput` · 1.5 `payloadType` in `DecideInput` · 1.6 `profileId` in `PimDecision` · 1.7 rules-only + send_external_ai = BLOCK · 1.8 rules-only + export_file = BLOCK · 1.9 rules-only copy/share/print gated · 1.10 payload-gate alleen `draft_anonymous_certified` · 1.11 `draftCheckWithRegistry()` · 1.12 oude `draftCheck` herleid · 1.13 aanroepers omgezet · 1.14 `modelGateFor()` · 1.15 hardcoded `modelVerified:true` weg · 1.16 demo-hash geen productiegroen · 1.17–1.22 egress accepteert alleen `CertifiedPayload` · 1.23–1.29 testbestanden · 1.30–1.49 20 privacy-invarianten.

### Fase 2 — Naamgeving + claims
- [ ] 2.1–2.8.

### Fase 3 — App-shell + burger menu
- [ ] 3.1–3.17.

### Fase 4 — `/` wordt Start & Go
- [ ] 4.1–4.30.

### Fase 5 — `/try` wordt expertlab
- [ ] 5.1–5.4.

### Fase 6 — CI gate (optioneel)
- [ ] 6.1 (skipped — Lovable deployt zelf).

### Fase 7 — Runtime hardening positionering
- [ ] 7.1–7.3.

### Acceptatie + backlog
- [ ] T1–T5 user-tasks · M1–M12 must-have · S1–S6 should-have.

---

## 1. Kort oordeel

Project PiM heeft een goede basis. Het is geen losse schets. Er staat een werkende browserdemo met detectie, anonimiseren, pseudonimiseren, policy, egress-afhandeling, lokale mapping, runtime hardening, modelstatus, review queue en trust-dashboard.

Maar het project is nog niet klaar voor een serieuze pilot waarin gebruikers op de uitkomst moeten kunnen vertrouwen. De derde analyse maakt het oordeel iets strenger dan de eerste versie.

Belangrijkste reden: de code bevat goede privacyregels, maar de live UI-route gebruikt ze nog niet hard genoeg. Daarnaast is de build niet reproduceerbaar met `npm ci`, omdat `package.json` en `package-lock.json` niet synchroon zijn.

Mijn aangepaste oordeel:

| Onderdeel | Nieuwe score | Oordeel |
|---|---:|---|
| Idee en onderwijswaarde | 8/10 | Sterk. De casus past goed bij onderwijs en AI-gebruik. |
| PIM-core | 6/10 | Goede modules, maar enkele gates worden in de UI nog te los gebruikt. |
| Privacy-architectuur | 6/10 | De opzet klopt, maar productieclaims moeten voorzichtiger. |
| UI/UX | 4/10 | Te veel uitleg vóór actie. De landingspagina moet de testtool worden. |
| Bouwbaarheid | 3/10 | `npm ci` faalt door lockfile-mismatch. Dit moet eerst recht. |
| Testbaarheid | 2/10 | Geen testscript, geen Vitest, geen CI-privacygate. |
| Productierijpheid | 3/10 | Sterke demo, nog geen productierijpe release. |
| Haalbaarheid verbetering | 8/10 | Hoog. De reparaties zijn duidelijk en afgebakend. |

Advies: niet opnieuw beginnen. Wel eerst de basis rechtzetten, daarna de UI radicaal versimpelen.

## 2. Wat is aangepast ten opzichte van de vorige MD

De richting blijft: **Start & Go**. De gebruiker moet op de landingspagina meteen tekst kunnen testen.

Wel zijn deze punten aangescherpt:

1. **Buildbaarheid is nu een blokkade.**  
   `npm ci` faalt. Dat is niet alleen een detail. Zonder schone install is er geen betrouwbare basis voor tests, build of CI.

2. **De repo nuanceert het modelhash-punt.**  
   De README zegt dat modelhashes placeholders zijn. De code bevat voor NER inmiddels een concrete descriptor-hash. Dat is beter dan een lege placeholder, maar nog geen echte hash op modelbytes of config. Dus: demo bruikbaar, productie nog niet hard.

3. **Egress is beter dan eerst gezegd, maar niet compleet.**  
   `send_external_ai` doet al een tweede controle met async NER. Dat is goed. Copy, export, print en share doen die tweede controle niet op dezelfde manier. Daar moet een generieke payload-aware egress guard voor komen.

4. **Naamgeving is inconsistent.**  
   De UI gebruikt `Privacy Integrity Monitor`. De README noemt `Privacy Intelligence Module`. De PVA zegt dat `PIM` alleen de deterministische beslislaag moet zijn. Dit moet gelijkgetrokken worden.

5. **De PVA zegt: core eerst.**  
   De gebruiker wil UI/UX aanpassen. Dat kan, maar alleen veilig als de core-blokkades eerst worden opgelost of tegelijk in dezelfde verbeterslag worden meegenomen.

6. **De landingspagina is nog uitleg, geen tool.**  
   Dit blijft het grootste UX-probleem. De huidige `/` stuurt naar `/try`. De nieuwe `/` moet zelf het testvenster zijn.

## 3. Zelfgestelde vragen vóór het nieuwe plan

### 3.1 Is de eerdere UI-richting nog goed?

Ja. De gewenste richting is nog steeds juist:

- landingspagina schoon;
- meteen tekst plakken;
- één duidelijke startknop;
- resultaat direct in beeld;
- functies in burger menu;
- technische uitleg pas na het resultaat.

### 3.2 Moet UI nu wachten tot alles technisch klaar is?

Nee, maar de volgorde moet strak zijn.

Eerst:

- lockfile fixen;
- testscript toevoegen;
- PIM-besluit echte `modelVerified` laten gebruiken;
- egress payload-aware maken;
- rules-only beleid afdwingen.

Daarna:

- `/` ombouwen naar Start & Go;
- `/try` behouden als expertlab;
- oude uitleg naar menu en details.

### 3.3 Is Project PiM haalbaar?

Ja. De meeste problemen zitten niet in het idee, maar in afwerking, gating en UX. Dat is goed nieuws. Het project hoeft niet opnieuw ontworpen te worden.

### 3.4 Waar zit het grootste risico?

Niet bij het scherm. Het grootste risico zit bij vertrouwen.

Als de UI groen zegt terwijl de technische route nog demo-gates gebruikt, dan voelt het product veiliger dan het is. Daarom moet de UI altijd eerlijk zijn over status: demo, beperkt, lokaal, geblokkeerd of klaar voor egress.

## 4. Derde technische analyse

## 4.1 Repo en zip lijken dezelfde richting te volgen

De zip bevat dezelfde hoofdstructuur als de repo:

```txt
src/routes
src/lib/pim
src/components/pim
scenarios/pva-3.0-core-robuust-maken
```

Belangrijke onderdelen:

```txt
src/lib/pim/policy.ts
src/lib/pim/processing.ts
src/lib/pim/egressGuard.ts
src/lib/pim/detectorRegistry.ts
src/lib/pim/pipelineProfile.ts
src/lib/pim/modelCatalog.ts
src/lib/pim/runtimeHardening.ts
src/routes/index.tsx
src/routes/try.tsx
src/routes/trust.tsx
src/routes/__root.tsx
```

De PVA-map is nuttig. Die beschrijft goed wat nog moet gebeuren om de core robuust te maken.

## 4.2 Schone install faalt

Ik heb `npm ci` op de uitgepakte zip gedraaid. Die faalt, omdat `package-lock.json` niet bij `package.json` past.

Voorbeelden uit de fout:

```txt
Missing: @fontsource/inter@5.2.8 from lock file
Missing: @huggingface/transformers@4.2.0 from lock file
Invalid: lock file's @lovable.dev/vite-tanstack-config@1.2.0 does not satisfy @lovable.dev/vite-tanstack-config@1.8.0
Invalid: lock file's rollup@4.60.1 does not satisfy rollup@4.62.2
```

Gevolg:

- `npm ci` kan niet draaien;
- build is niet reproduceerbaar;
- CI kan niet betrouwbaar starten;
- testen kan pas na lockfile-herstel.

Actie:

```txt
npm install
npm run build
npm run lint
```

Daarna committen:

```txt
package-lock.json
package.json, als daar bewust versies zijn aangepast
```

## 4.3 Scripts zijn te mager

Huidige scripts:

```json
{
  "dev": "vite dev",
  "build": "vite build",
  "build:dev": "vite build --mode development",
  "preview": "vite preview",
  "lint": "eslint .",
  "format": "prettier --write ."
}
```

Wat mist:

```json
{
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "check": "npm run typecheck && npm run lint && npm run test && npm run build"
}
```

Dit moet vóór de UI-slag, anders is niet vast te stellen of de privacyregels blijven werken.

## 4.4 `modelVerified: true` blijft een echte blocker

In `/try.tsx` wordt de beslissing aangeroepen met:

```ts
modelVerified: true
```

Daarmee wordt de modelintegriteit in de live beslisroute niet echt meegenomen.

Gevolg:

- de policy kan modelintegriteit afdwingen;
- maar de UI geeft haar altijd `true`;
- dus de live demo test dit punt niet eerlijk.

Actie:

Maak een functie:

```ts
function modelGateFor(profileId, action, integrity): boolean
```

Regels:

- rules-only heeft geen NER-model nodig;
- display mag bij beperkte detectie met waarschuwing;
- copy, export, share, print en externe AI mogen alleen als de benodigde gates echt groen zijn;
- mismatch of missing model blokkeert alle niet-lokale acties;
- demo-hash geeft geen productiegroen.

## 4.5 Rules-only beleid staat in profiel, maar niet hard genoeg in `decide()`

`pipelineProfile.ts` zegt dat `education-nl-rules-only` `egressPolicy: "degrade_no_export"` heeft.

Dat is goed.

Maar `policy.ts` krijgt geen `profileId` binnen en kan dat profielbeleid dus niet afdwingen.

Gevolg:

- de UI kan rules-only kiezen;
- de detectoren passen zich aan;
- maar het PIM-besluit zelf kent het profielbeleid niet.

Actie:

Breid `decide()` uit:

```ts
interface DecideInput {
  mode: Mode;
  action: Action;
  profileId: PipelineProfileId;
  signals: PrivacySignals;
  draftCheck: DraftCheckResult;
  modelVerified: boolean;
}
```

Regel:

```txt
education-nl-rules-only + export_file = BLOCK
education-nl-rules-only + send_external_ai = BLOCK
education-nl-rules-only + copy/share/print = alleen bij lage risk en gecertificeerde anonymous draft
```

## 4.6 Draft Check Guard gebruikt nog niet dezelfde detectorlaag

De pipeline gebruikt `detectorRegistry.ts` met profiel, lexicon, heuristische context en optioneel NER.

`draftCheck()` gebruikt nog directe detectie uit `detectors.ts`.

Gevolg:

- inputanalyse en draftcontrole kunnen verschillen;
- residuele namen die alleen via NER gevonden worden, kunnen bij copy/export/print/share gemist worden;
- `send_external_ai` is beter beschermd, omdat daar nog een extra async re-check zit.

Actie:

Voeg toe:

```ts
async function draftCheckWithRegistry(draft, mode, profileId, options)
```

En gebruik die voor:

- resultaatstatus;
- PIM-besluit;
- alle egress-acties;
- tests.

## 4.7 Egress guard is deels goed, maar moet breder

Goed:

- `send_external_ai` doet een tweede controle op de echte payload;
- die check gebruikt `runRegistry` met async aan;
- directe PII of hoge risk blokkeert.

Niet genoeg:

- copy schrijft direct naar clipboard;
- export maakt direct een bestand;
- print opent direct een printvenster;
- share gebruikt Web Share of clipboard fallback;
- er is geen `payloadType`.

Actie:

Maak alle egress-acties afhankelijk van één gecertificeerd payloadobject.

Voorstel:

```ts
interface CertifiedPayload {
  text: string;
  mode: "anonymous" | "pseudonymous";
  payloadType:
    | "draft_anonymous_certified"
    | "draft_pseudonymous_local"
    | "raw_input"
    | "mapping"
    | "restored"
    | "unknown";
  profileId: PipelineProfileId;
  guardStatus: DraftStatus;
}
```

Altijd blokkeren bij uitgaande acties:

```txt
raw_input
mapping
restored
unknown
draft_pseudonymous_local
```

Alleen toegestaan:

```txt
draft_anonymous_certified
```

## 4.8 Modelintegriteit: beter dan README zegt, nog niet productiehard

De README zegt dat modelhashes placeholders zijn. De code in `modelCatalog.ts` bevat voor NER inmiddels een concrete SHA-256 over een descriptor.

Dat is een verbetering.

Maar de code zegt zelf dat dit trust-on-first-pin is en niet supply-chain-proof. Het is geen echte hash over de modelweights of een gecontroleerde modelconfig.

Actie:

- README bijwerken;
- UI-tekst aanpassen naar: “demo verified” of “productie verified”;
- productie-egress alleen toestaan bij echte modelverificatie;
- modeldownloads en externe modelhosts apart uitleggen.

## 4.9 Runtime hardening is nuttig, maar geen volledige beveiliging

`runtimeHardening.ts` patcht fetch, XHR, sendBeacon en WebSocket. Dat is goed als detectie- en waarschuwlaag.

Maar de code zegt zelf dat dit niet alles volledig blokkeert. Dat klopt. Browser user-land kan geen waterdichte sandbox vervangen.

Actie:

- positioneer runtime hardening als extra vangnet;
- laat policy en payload-aware egress de echte route bepalen;
- log geen tekstinhoud;
- toon hardening-meldingen alleen in trust of details, niet als hoofdresultaat.

## 4.10 Startpagina is nog geen testtool

`src/routes/index.tsx` is nu vooral uitleg:

- principes;
- architectuur;
- modi;
- CTA naar `/try`.

Dat botst met de gewenste UX.

Nieuwe regel:

```txt
De landingspagina is het testvenster.
```

Alles wat uitleg is, gaat naar:

- burger menu;
- detailsdrawer;
- `/try` als expertlab;
- aparte documentatieroutes.

## 4.11 Header is te druk

De root header toont op desktop veel links:

```txt
Overview
Pipeline
Architectuur
Modi
Scenarios
Flags
Compliance
Try-it
```

Op mobiel staan die links horizontaal onder elkaar.

Nieuwe regel:

```txt
Project PiM | lokaal actief | ☰
```

Alle routes blijven bereikbaar, maar niet als hoofdtaak.

## 4.12 Kleine maar zichtbare taalfout

`<html lang="en">` staat in de root, terwijl de app Nederlands is.

Actie:

```tsx
<html lang="nl">
```

Dit is klein, maar hoort bij polish en toegankelijkheid.

## 5. Aangepaste haalbaarheid

## 5.1 UI/UX drastisch verbeteren

Haalbaarheid: hoog.

De UI kan sterk eenvoudiger zonder de hele core te herschrijven. De beste route is een nieuwe Start & Go-shell op `/`, met hergebruik van bestaande PIM-functies.

## 5.2 Core naar pilotniveau brengen

Haalbaarheid: middel tot hoog.

De meeste fixes zijn lokaal:

- `policy.ts`;
- `processing.ts`;
- `egressGuard.ts`;
- `try.tsx`;
- `pipelineProfile.ts`;
- tests.

## 5.3 Productierijp maken

Haalbaarheid: middel.

Daarvoor zijn nog nodig:

- echte CI;
- echte privacy-invariant-tests;
- productiemodelverificatie;
- payload-aware egress;
- duidelijke middleware-API;
- strakke claims in README en UI.

## 6. Nieuwe productrichting: Start & Go

De gebruiker hoeft niet eerst te leren hoe PiM werkt. De gebruiker moet eerst kunnen testen.

Nieuwe belofte:

```txt
Plak tekst. Start PiM. Krijg veilige tekst of een duidelijke blokkade.
```

## 6.1 Eerste scherm

```txt
┌────────────────────────────────────────────┐
│ Project PiM                         ☰      │
│ lokaal actief                              │
├────────────────────────────────────────────┤
│ Test tekst voordat je die deelt met AI      │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Plak hier je tekst...                  │ │
│ │                                        │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ Modus:  [Anoniem] [Pseudoniem lokaal]      │
│ Doel:   [Externe AI v]                     │
│                                            │
│ [ Start PiM ]                              │
│                                            │
│ Gebruik voorbeeldtekst                     │
└────────────────────────────────────────────┘
```

## 6.2 Resultaat direct onder input

```txt
┌────────────────────────────────────────────┐
│ Resultaat                                  │
│                                            │
│ Veilig genoeg                              │
│ Geen directe persoonsgegevens gevonden      │
│ in de veilige draft.                       │
│                                            │
│ Veilige tekst                              │
│ ┌────────────────────────────────────────┐ │
│ │ [persoon] zit in [klas] en krijgt...   │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ [Kopieer veilige tekst]                    │
│                                            │
│ Waarom dit oordeel? ▸                      │
└────────────────────────────────────────────┘
```

## 6.3 Bij blokkade

```txt
┌────────────────────────────────────────────┐
│ Niet delen                                 │
│                                            │
│ PiM vond nog directe persoonsgegevens.      │
│                                            │
│ Gevonden:                                  │
│ [BSN] [IBAN] [telefoonnummer]              │
│                                            │
│ Wat nu?                                    │
│ Verwijder deze gegevens of kies            │
│ 'maak anoniem'.                            │
│                                            │
│ [Maak opnieuw veilig]                      │
│ [Bekijk details]                           │
└────────────────────────────────────────────┘
```

## 6.4 Wat bovenaan niet meer zichtbaar is

Niet bovenaan tonen:

- pipeline-timeline;
- modelcatalogus;
- auditfeed;
- review queue;
- compliancechecklist;
- scenario-overzicht;
- lange architectuurtekst.

Wel bereikbaar houden:

- via burger menu;
- via “Waarom dit oordeel?”;
- via `/try` als expertlab;
- via trust-dashboard.

## 7. Nieuwe navigatie

## 7.1 Header

```txt
Project PiM        lokaal actief        ☰
```

De statuspill heeft drie toestanden:

| Status | Tekst | Betekenis |
|---|---|---|
| groen | lokaal actief | basisdetectoren werken |
| oranje | beperkte detectie | model of profiel beperkt |
| rood | niet klaar | self-test, modelgate of lockstatus fout |

## 7.2 Burger menu

```txt
Nieuwe test
Voorbeelden
Expert lab
Trust dashboard
Pipeline uitleg
Modi uitleg
Compliance
Flags
Instellingen
Over Project PiM
```

Regel:

```txt
Geen brede hoofdnav meer.
```

## 8. Nieuwe componentstructuur

Maak `/try` niet nog groter. Bouw een nieuwe compacte laag.

```txt
src/components/pim/start-go/
  StartGoShell.tsx
  StartHeader.tsx
  BurgerMenu.tsx
  LocalStatusPill.tsx
  InputPanel.tsx
  ModeTargetBar.tsx
  ResultPanel.tsx
  SafetyVerdictCard.tsx
  ResultActions.tsx
  FindingChips.tsx
  DetailsDrawer.tsx
  ExamplePicker.tsx
```

## 8.1 `StartGoShell.tsx`

Doet alleen:

- inputstate;
- mode;
- doelactie;
- startactie;
- resultaatstate;
- koppeling met PIM-core.

Geen lange uitleg.

## 8.2 `InputPanel.tsx`

Bevat:

- textarea;
- voorbeeldtekstknop;
- Start PiM-knop;
- korte privacyregel onder de knop.

Voorbeeldregel:

```txt
Je tekst blijft in deze browser totdat jij een toegestane actie kiest.
```

## 8.3 `ModeTargetBar.tsx`

Compact:

```txt
Anoniem | Pseudoniem lokaal
Doel: externe AI | kopiëren | export | print | share | lokaal tonen
```

## 8.4 `ResultPanel.tsx`

Volgorde:

1. status;
2. korte reden;
3. veilige tekst;
4. primaire actie;
5. details dichtgeklapt.

## 8.5 `DetailsDrawer.tsx`

Bevat verdieping:

- risk score;
- gevonden categorieën;
- detectoren;
- modelstatus;
- policyregel;
- auditmetadata;
- pipeline-stappen.

## 9. Gewenste flow

Nu:

```txt
Home -> uitleg -> Try-it -> scenario -> tekst -> instellingen -> veel panels -> actie
```

Nieuw:

```txt
Home -> tekst -> Start PiM -> resultaat -> kopieer veilige tekst
```

Details:

```txt
Resultaat -> Waarom dit oordeel? -> technische uitleg
```

Expert:

```txt
Burger menu -> Expert lab -> volledige pipeline en debugdetails
```

## 10. Kwaliteitslat voor “fantastisch resultaat”

Een goed resultaat is niet alleen een veilige tekst. Het is een duidelijk besluit.

Een resultaatkaart moet altijd tonen:

1. Mag ik dit delen?
2. Welke veilige tekst kan ik gebruiken?
3. Wat is de beste volgende actie?
4. Waarom kreeg ik dit oordeel?
5. Welke details kan ik openen als ik wil controleren?

Teksten:

| Status | Tekst |
|---|---|
| groen | Deze draft lijkt veilig genoeg voor de gekozen actie. |
| oranje | Deze draft is bruikbaar, maar de context kan herkenbaar zijn. Controleer de details. |
| rood | Niet delen. PiM vond nog directe persoonsgegevens of een verboden route. |

Knoppen:

| Verdict | Primaire knop |
|---|---|
| ALLOW | Kopieer veilige tekst |
| ALLOW_WITH_WARNING | Controleer en kopieer |
| BLOCK | Maak opnieuw veilig |

## 11. Testing first

## 11.1 Eerst build fixen

Eerste taak:

```txt
npm install
npm run lint
npm run build
```

Daarna scripts toevoegen:

```txt
npm run typecheck
npm run test
npm run check
```

## 11.2 Minimale testset

Nieuwe bestanden:

```txt
src/lib/pim/__tests__/policy.test.ts
src/lib/pim/__tests__/draftCheck.test.ts
src/lib/pim/__tests__/egressGuard.test.ts
src/lib/pim/__tests__/profiles.test.ts
src/lib/pim/__tests__/modelIntegrity.test.ts
src/lib/pim/__tests__/invariants.test.ts
src/components/pim/start-go/__tests__/startGoShell.test.tsx
```

## 11.3 Privacy-invarianten

Minimaal testen:

1. pseudonymous + send_external_ai blokkeert altijd;
2. pseudonymous + export_file blokkeert altijd;
3. pseudonymous + copy blokkeert altijd;
4. pseudonymous + print blokkeert altijd;
5. pseudonymous + share blokkeert altijd;
6. anonymous + restore blokkeert altijd;
7. anonymous draft met pseudoniem token blokkeert;
8. raw_input naar egress blokkeert;
9. mapping naar egress blokkeert;
10. restored payload naar egress blokkeert;
11. unknown payload naar egress blokkeert;
12. model mismatch blokkeert niet-lokale acties;
13. missing model blokkeert niet-lokale acties die dat model nodig hebben;
14. rules-only blokkeert externe AI;
15. rules-only blokkeert export;
16. audit bevat geen ruwe tekst;
17. audit bevat geen drafttekst;
18. audit bevat geen mapping;
19. draftCheck vindt e-mail, telefoon, BSN en IBAN;
20. copy/export/share/print gebruiken alleen gecertificeerde anonieme payload.

## 11.4 Gebruikertests

Test met vijf taken.

### Taak 1: simpele docentnotitie

Input:

```txt
Tom de Vries uit 4H2 heeft moeite met plannen voor Nederlands.
```

Verwachting:

- gebruiker plakt tekst;
- klikt Start PiM;
- ziet veilige tekst;
- begrijpt wat vervangen is.

### Taak 2: harde PII

Input bevat:

```txt
BSN
IBAN
telefoonnummer
adres
```

Verwachting:

- duidelijke block of stevige anonimisatie;
- geen copyknop als de draft niet gecertificeerd is;
- hersteladvies in gewone taal.

### Taak 3: pseudoniem naar externe AI

Verwachting:

- direct block;
- uitleg: pseudoniem is alleen lokaal.

### Taak 4: rules-only en export

Verwachting:

- export blokkeert;
- uitleg: beperkte detectie, dus geen uitgaande export.

### Taak 5: details openen

Verwachting:

- details zijn te vinden;
- details staan niet in de weg;
- gebruiker kan daarna terug naar resultaat.

## 12. Implementatieplan

## Fase 0 - Reproduceerbare repo

Doel: zorgen dat elke ontwikkelaar dezelfde basis heeft.

Acties:

1. `npm install` draaien om lockfile bij te werken.
2. `package-lock.json` committen.
3. Scripts toevoegen:
   - `typecheck`;
   - `test`;
   - `check`.
4. Vitest installeren.
5. Eerste lege test laten slagen.

Klaar wanneer:

```txt
npm ci
npm run check
```

lokaal groen kan worden.

## Fase 1 - PIM-core hard maken

Doel: de UI mag niet mooier zijn dan de waarheid.

Aanpassen:

```txt
src/lib/pim/types.ts
src/lib/pim/policy.ts
src/lib/pim/processing.ts
src/lib/pim/egressGuard.ts
src/routes/try.tsx
```

Werk:

1. `profileId` toevoegen aan `PimDecision` en `DecideInput`.
2. `payloadType` toevoegen.
3. `DraftCheckResult` uitbreiden met status en residuele metadata zonder tekst.
4. `draftCheckWithRegistry()` toevoegen.
5. `modelVerified: true` vervangen door echte gate.
6. Rules-only in `decide()` afdwingen.
7. Egress alleen laten werken met gecertificeerde payloads.
8. Tests toevoegen voor alle privacy-invarianten.

Klaar wanneer:

- alle privacytests groen zijn;
- copy/export/print/share geen ongetypeerde tekst meer accepteren;
- external AI, export en share aantoonbaar blokkeren bij twijfel.

## Fase 2 - Naamgeving en documentatie rechtzetten

Doel: geen verwarring tussen productnaam en beslislaag.

Nieuwe taal:

| Term | Betekenis |
|---|---|
| Project PiM | productnaam |
| Privacy Integrity Monitor | volledige naam |
| PIM | deterministische beslislaag |
| PiM engine | vermijden of expliciet uitleggen |
| Privacy Intelligence Module | oude term, verwijderen of markeren als oud |

Aanpassen:

```txt
README.md
src/routes/index.tsx
src/routes/__root.tsx
src/routes/trust.tsx
src/routes/compliance.tsx
```

Ook aanpassen:

```tsx
<html lang="nl">
```

Klaar wanneer:

- README, UI en PVA dezelfde woorden gebruiken;
- geen productieclaim staat bij demo-gates;
- modeldownload en lokale verwerking helder zijn uitgelegd.

## Fase 3 - Nieuwe app-shell en burger menu

Doel: functies uit de hoofdroute halen.

Aanpassen:

```txt
src/routes/__root.tsx
src/components/pim/start-go/StartHeader.tsx
src/components/pim/start-go/BurgerMenu.tsx
src/components/pim/start-go/LocalStatusPill.tsx
```

Nieuw gedrag:

- header toont alleen logo, status en menu;
- alle routes zitten in burger menu;
- mobiel en desktop hebben dezelfde simpele logica;
- footer mag blijven, maar soberder.

Klaar wanneer:

- geen brede nav meer zichtbaar is;
- alle oude routes bereikbaar blijven;
- de testtaak visueel dominant is.

## Fase 4 - `/` wordt Start & Go

Doel: landingspagina is de tool.

Aanpassen:

```txt
src/routes/index.tsx
```

Nieuwe componenten:

```txt
StartGoShell.tsx
InputPanel.tsx
ModeTargetBar.tsx
ResultPanel.tsx
SafetyVerdictCard.tsx
ResultActions.tsx
FindingChips.tsx
DetailsDrawer.tsx
ExamplePicker.tsx
```

Gedrag:

- tekst plakken;
- modus kiezen;
- doel kiezen;
- Start PiM;
- resultaat direct onder input;
- details dicht.

Klaar wanneer:

- gebruiker hoeft `/try` niet meer te openen;
- resultaat verschijnt zonder technische muur;
- acties volgen het PIM-besluit.

## Fase 5 - `/try` wordt expertlab

Doel: bestaande waarde behouden zonder nieuwe gebruikers te belasten.

Aanpassen:

```txt
src/routes/try.tsx
```

Nieuw:

- titel: Expert lab;
- link bovenaan: terug naar snelle test;
- pipeline, modelstatus, audit en review queue blijven zichtbaar;
- geen primaire route meer voor gewone gebruikers.

Klaar wanneer:

- gewone gebruiker werkt via `/`;
- tester en ontwikkelaar kunnen nog alles zien in `/try`.

## Fase 6 - CI privacy gate

Toevoegen:

```txt
.github/workflows/ci.yml
```

Workflow:

```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run check
```

Klaar wanneer:

- PR rood wordt bij falende privacytest;
- build niet kan slagen bij lockfile-mismatch;
- release niet kan slagen bij kapotte invariant.

## 13. Aanbevolen volgorde

Niet eerst alles mooier maken. Eerst zorgen dat de waarheid klopt.

Volgorde:

1. Lockfile repareren.
2. Test- en checkscript toevoegen.
3. PIM-core harde gates fixen.
4. Payload-aware egress maken.
5. Naamgeving en claims rechtzetten.
6. Header vervangen door burger menu.
7. `/` ombouwen tot Start & Go.
8. `/try` hernoemen naar expertlab.
9. CI privacy gate toevoegen.
10. Daarna pas nieuwe integraties zoals OCR, EAI Classroom, EAI Studio of UMDT.

## 14. Concrete backlog

## Must have

- [ ] `npm ci` werkt.
- [ ] `npm run check` bestaat.
- [ ] Vitest draait.
- [ ] `modelVerified: true` is weg uit de beslisroute.
- [ ] `profileId` zit in `decide()`.
- [ ] Rules-only blokkeert export en externe AI.
- [ ] Draft check gebruikt dezelfde detectorlaag of een expliciete async variant.
- [ ] Egress gebruikt payloadtypes.
- [ ] Copy/export/print/share accepteren alleen gecertificeerde anonieme draft.
- [ ] README gebruikt dezelfde naamgeving als de UI en PVA.
- [ ] `/` is het testvenster.
- [ ] Burger menu vervangt brede nav.

## Should have

- [ ] Detailsdrawer met risk, spans, policy en audit.
- [ ] Statuspill met lokaal actief, beperkte detectie of niet klaar.
- [ ] Voorbeeldtekstknop.
- [ ] Heldere block-uitleg.
- [ ] `html lang="nl"`.
- [ ] Productieclaims gescheiden van demo-status.

## Later

- [ ] OCR-route.
- [ ] Middleware-API voor onderwijsapps.
- [ ] Browserextensie.
- [ ] Docs of Office add-on.
- [ ] Zorgprofiel.
- [ ] Generieke profielen.

## 15. Nieuwe tekst voor de landingspagina

Titel:

```txt
Test tekst voordat je die deelt met AI
```

Subtekst:

```txt
PiM maakt eerst een veilige versie. Alles draait lokaal in je browser. Delen kan pas als de gekozen actie is toegestaan.
```

Textarea placeholder:

```txt
Plak hier een docentnotitie, leerlingtekst of verslag...
```

Startknop:

```txt
Start PiM
```

Resultaatkop groen:

```txt
Veilige draft klaar
```

Resultaatkop oranje:

```txt
Controle nodig
```

Resultaatkop rood:

```txt
Niet delen
```

Detailslink:

```txt
Waarom dit oordeel?
```

## 16. Wat ik niet zou doen

1. Niet nog meer panelen toevoegen aan `/try`.
2. Niet de nieuwe UI bouwen zonder lockfile te fixen.
3. Niet claimen dat het productie-anonimisatie is.
4. Niet rules-only laten exporteren.
5. Niet pseudonieme output kopiëren of delen.
6. Niet modelstatus verstoppen als die de beslissing beïnvloedt.
7. Niet alle uitleg op de startpagina laten staan.
8. Niet starten met OCR voordat egress en tests hard zijn.

## 17. Eindadvies

Project PiM is de moeite waard. De basis is goed genoeg om door te pakken. Maar de volgende slag moet scherp zijn.

De beste route:

```txt
build fixen -> privacyregels hard maken -> Start & Go UI -> CI gate
```

De drastische UI-wijziging is haalbaar en verstandig. Maar ze moet niet alleen mooier zijn. Ze moet eerlijker zijn.

De nieuwe landingspagina moet voelen als:

```txt
Plakken. Starten. Veilig resultaat.
```

Alle uitleg komt daarna pas.
