# Productie-fiattering PiM: volledige rapportage

Doel: een onafhankelijk, verifieerbaar release-rapport dat vaststelt of PiM verkoopklaar is, met een expliciet GO / GO-onder-voorwaarden / NO-GO oordeel. Geen claim in het rapport zonder bewijs uit een uitgevoerde check.

## Wat er wordt opgeleverd

Een rapport (`/mnt/documents/PiM-productie-fiattering.md` plus PDF) met:

1. Managementsamenvatting en eindoordeel (GO / voorwaardelijk / NO-GO)
2. Scope en versie (commit-SHA, datum, omgeving)
3. Functionele verificatie per gebruikersflow, met bewijs
4. Privacy- en egress-verificatie (de kern van het product)
5. Detectiekwaliteit met cijfers
6. Technische kwaliteit (typecheck, lint, tests, build, bundle)
7. Runtime- en browserhardening (CSP, headers, WASM/WebGPU)
8. Openstaande risico's met classificatie blocker / voorwaarde / acceptabel
9. Vrijgavevoorwaarden en aanbevolen restwerk

## Verificatie die eerst wordt uitgevoerd

**Geautomatiseerd**
- `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`
- Testtelling per domein (detectie, policy, egress, storagegrens, routes, modes)
- Bundle-inspectie: aanwezigheid ONNX WASM-assets

**Browser (Playwright, desktop + mobiel viewport)**
- Alle publieke routes: consolefouten, pageerrors, hydration
- Snel checken, Stap voor stap, Schrijven: invoer, analyse, gewijzigd-status, hernieuwde analyse
- Menu, instellingen, reset, redirects (`/try`, `/schrijven`), onbekende mode, 404
- Egressacties (kopieer, export, print, delen) inclusief pogingen met niet-gecertificeerde payload
- Netwerklog: bewijs dat gebruikerstekst nooit uitgaat; alleen modelbestanden bij expliciete BERT-start
- Storage-inspectie: `localStorage` / `sessionStorage` na een volledige sessie
- Screenshots per scherm, elk visueel gecontroleerd

**Detectiekwaliteit**
- Vaste schoolcorpus: recall per categorie, false positives op schone tekst
- Zonder BERT en met BERT, resultaten los gerapporteerd

## Bekende punten die het rapport expliciet moet adresseren

- Modelintegriteit: `NER_VARIANTS` gebruikt nu `revision: "main"` met `LOCAL_PIN:` hashes, geen immutable commit + statische SHA-256. Volgens de handoff (blok 2) is dat geen productie-verificatie. Het rapport benoemt dit als vrijgavevoorwaarde en beschrijft de impact: lokale analyse blijft werken, maar egress met modelafhankelijk profiel steunt op trust-on-first-use.
- Contextmodel `PLACEHOLDER:context-nl-education-v2-not-yet-published`: niet-gepubliceerd model in de catalogus.
- 10 bestaande Fast Refresh lint-waarschuwingen: classificatie en of ze vrijgave blokkeren.
- Restpunten uit handoff-blokken 3 tot 5 (egresspaden, CSP-pinning, statusconsistentie) krijgen elk een aparte pass/fail met bewijs.

## Technische aanpak

- Auditscripts onder `/tmp/browser/pim-fiat/`, niet in de repo.
- Rapport en screenshotbijlagen naar `/mnt/documents/`.
- Geen productiecode wijzigen tijdens de audit. Gevonden defecten worden gerapporteerd en, alleen na jouw akkoord, in een aparte ronde gefixt.
- Elke uitspraak in het rapport krijgt een bronverwijzing: commando + uitvoer, of screenshot + route.
