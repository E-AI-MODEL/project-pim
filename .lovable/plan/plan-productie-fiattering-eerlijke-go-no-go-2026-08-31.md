# Plan: Productie-fiattering, eerlijke go/no-go

## Doel

De vraag was: doen we nu de belofte dat écht alles op productieniveau werkt?
Eerlijk antwoord: de privacy-kern ja, maar niet alles. Dit plan sluit wat in
deze sessie sluitbaar is en legt expliciet vast wat niet door mij alleen sluitbaar
is, zodat de eindbelofte één is die standhoudt.

## Huidige staat (geverifieerd in deze sessie)

- Build: OK. Geen runtime-errors in de preview.
- P0 blockers: geen. Privacy-kern is geverifieerd: 0 externe requests tijdens
  sessie, klembord-uitvoer gemaskeerd, geen persoonsgegevens in localStorage,
  fail-closed blokkade bij niet-toegestaan profiel/payload.
- P1-1 (modelpinning), P1-2 (egress = alleen modeldownload), P1-5 (geen
  persistente voorkeuren): opgelost.

## Wat nog écht open is

| Punt                                                   | Sluitbaar in sessie?                | Waarom                                                                                                                                               |
| ------------------------------------------------------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-3 WebGPU/WASM performance op doelhardware           | Deels                               | Meting in preview kan ik draaien; doelhardware-meting ligt bij de uitrol.                                                                            |
| P1-4 Externe detectievalidatie op onafhankelijk corpus | Nee                                 | Vereist extern Nederlands onderwijscorpus; alleen contractueel af te dekken.                                                                         |
| context_education model heeft `PLACEHOLDER`-hash       | Ja, mits model niet gepubliceerd is | `releaseStatus: design-only`; gate blokkeert al egress bij placeholder. Vervangen door een echte mirror-hash of expliciet uitschakelen in release-1. |
| rewrite_qwen: `revision: "main"` + `LOCAL_PIN`         | Ja (beslissing)                     | Beslissen: release-1 uitsluiten (design-only) óf immutable revision + statische hash zetten. `main` mag niet in productie-egress.                    |
| CSP op definitieve hosting                             | Deels                               | Headers en `public/_headers` staan er, maar niet elke host leest `_headers`; moet op de echte host gemeten worden.                                   |
| Recall-claims richting scholen                         | Ja                                  | Formuleringen conservatiever maken zolang P1-4 open is.                                                                                              |

## Aanpak

### 1. Sluit wat sluitbaar is

- `src/lib/pim/modelCatalog.ts`: `rewrite_qwen` ofwel `releaseStatus: "design-only"`
  zetten (en zorgen dat het niet in een release-1 pad wordt aangeboden), ofwel
  immutable revision + statische `config.json`-SHA-256 geven. `main`/`LOCAL_PIN`
  mag niet meer in een release-1 entry staan.
- `context_education`: aangezien het model niet gepubliceerd is, `releaseStatus`
  `design-only` houden en zorgen dat de placeholder-route nooit zichtbaar wordt
  als "beschikbaar" in de UI; ROADMAP-item expliciet afvinken met reden.
- Recall-claims in UI-copy en docs (GOLDEN_PATH, README) aanscherpen naar
  "regels + BERT op jouw tekst, niet extern gevalideerd" totdat P1-4 dicht is.
- `modelIntegrity.test.ts` uitbreiden zodat elke `release-1` catalogusentry
  een immutable revision heeft en géén `main`/`LOCAL_PIN`/`PLACEHOLDER`.

### 2. Meet wat meetbaar is

- Playwright-meting in de preview: tekst met naam+plaats+leerlingnummer,
  drie runs voor rules-only, NER-small en NER-large. Vastleggen: laadtijd,
  detectietijd per 1k chars, WebGPU-beschikbaarheid, WASM-fallback.
- Resultaat in een kort performance-blok in `docs/GOLDEN_PATH.md` met de
  nuance dat doelhardware apart gemeten moet worden.

### 3. Documenteer wat niet door mij sluitbaar is

- In `ISSUES.md` en `docs/GOLDEN_PATH.md` expliciet vastleggen dat betaalde
  uitrol pas mag na:
  - P1-3 doelhardware-meting door de uitrol-partij;
  - P1-4 externe detectievalidatie op onafhankelijk corpus;
  - CSP-controle op de definitieve hosting.
- Dit zijn geen dingen die ik "oplos" door ze weg te schrijven; ze krijgen een
  duidelijke vrijgavevoorwaarde in plaats van een stilzwijgend ja.

### 4. Eindverificatie

- `bun run typecheck`, `bun run test`, `bun run build` groen.
- `rg "main\"|LOCAL_PIN|PLACEHOLDER" src/lib/pim/modelCatalog.ts` geeft geen
  release-1 hit meer.
- Eén Playwright-smoke: plak tekst met BSN+naam+leerlingnummer, verifieer
  detectie + geblokkeerde egress bij niet-geverifieerd model.
- Eindrapport: een korte go/no-go met de privacy-kern = GO en de drie
  contractuele voorwaarden voor betaalde uitrol expliciet genoemd.

## Wat niet in dit plan zit

- Het daadwerkelijk publiceren/meten op doelhardware (ligt bij de uitrol).
- Externe detectievalidatie (ligt bij een onafhankelijk corpus).
- Wijzigingen aan privacy-engine-logica of de egress-gate zelf; die blijven
  zoals ze zijn en zijn al geverifieerd.

## Acceptatiecriteria

- Build/tests/typecheck groen.
- Geen `release-1` catalogusentry met `main`, `LOCAL_PIN` of `PLACEHOLDER`.
- `ISSUES.md` en `GOLDEN_PATH.md` bevatten een eerlijke go/no-go met de drie
  open vrijgavevoorwaarden expliciet benoemd.
- De belofte aan de gebruiker luidt: privacy-kern productie-geverifieerd;
  drie voorwaarden voor betaalde uitrol open en benoemd, niet verzwegen.
