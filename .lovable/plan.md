# Review verwerken: fail-closed egress, onafhankelijke re-consult en echte browsertest

De review klopt op alle zeven punten; ik heb ze in de code nagelopen en bevestigd:

- `detectPersonsSlm` geeft `[]` terug bij laad- of inferencefout, en `reconsultPayload` leest "geen spans" als schoon.
- `reconsultPayload` erft `payload.detectionSettings`, dus de tweede mening is precies zo blind als de eerste.
- `engine.requestAction` accepteert `payloadText` en `payloadType` van de aanroeper.
- `modelCatalog.ts` pint alleen `config.json`, niet tokenizer of gewichten.
- `MODEL_HOSTS` bevat `raw.githubusercontent.com`, `github.com`, `cdn-lfs.hf.co` en `cas-bridge.xethub.hf.co`; de CSP `connect-src` kent die niet, en `public/_headers` is een Pages-mechanisme terwijl `wrangler.jsonc` een Worker deployt.
- De fetch/XHR-wrappers loggen alleen.
- Risicogewichten staan dubbel: `risk.ts` en hardcoded 0.18/0.1/0.12 in `egressGuard.ts`.
- Drie lockfiles aanwezig, `package.json` heet `tanstack_start_ts` zonder version, CI pint `bun-version: latest` en draait `format` (write) in de pipeline.

## Volgorde

**Blok 1 (de twee die de reviewer als minimum noemt)**

1. Fail-closed re-consult: `runRegistry` krijgt een resultaat met per detector een status (`ran` / `failed` / `skipped`) in plaats van alleen spans. `detectPersonsSlm` rapporteert laad- en inferencefouten als `failed` in plaats van stil `[]`. `reconsultPayload` blokkeert zodra een verwachte laag niet aantoonbaar gedraaid heeft, met een leesbare reden in de egress-log en in de UI-melding.
2. Echte browsertest: één Playwright-test die `/app` doorloopt, met `page.route()` elk verzoek buiten de modelhosts als fout markeert, en de werkelijke klembordinhoud na "Kopieer" leest en assert dat die gemaskeerd is. Draait apart van vitest, met een eigen script.

**Blok 2 (grens dichttimmeren)**

3. Onafhankelijke re-consult: de tweede mening draait altijd op maximale sterkte (alle lagen, alle categorieën), los van gebruikersinstellingen. Gevolg: een uitgezette categorie kan alsnog blokkeren bij kopiëren; daarom tonen we de re-consult-uitkomst al in de preview, zodat de blokkade niet als verrassing komt.
4. Engine vertrouwt de aanroeper niet meer: `payloadType` wordt intern afgeleid en een `payloadText` die niet gelijk is aan de gecertificeerde draft wordt geweigerd.
5. CSP en headers: headers verhuizen naar de serverrespons van TanStack Start zodat ze hostonafhankelijk zijn; `_headers` blijft alleen als niet-normatieve kopie of verdwijnt. `MODEL_HOSTS` en `connect-src` worden één gedeelde lijst, zodat ze niet meer uiteen kunnen lopen. Sluit P1-6.
6. Runtime hardening eerlijk positioneren: de fetch-wrapper gaat throwen voor niet-toegestane hosts (legitiem extern verkeer bestaat hier niet), en README plus docs beschrijven de wrappers als zelftest/telemetrie, niet als blokkade. De CSP is de echte grens.

**Blok 3 (claims en hygiëne)**

7. Modelintegriteit: naast `config.json` ook `tokenizer.json` en het modelbestand hashen. Lukt dat niet betrouwbaar voor alle varianten, dan wordt de grens expliciet in README en `docs/pim-handoff/02-modelintegriteit-productie.md` opgeschreven in plaats van een sterkere claim te laten staan.
8. Risk-scoring ontdubbelen: `egressGuard.ts` gebruikt de scoringfunctie uit `risk.ts`; geen tweede set gewichten meer.
9. Detectie-ondergrens in CI: een klein gelabeld synthetisch NL-onderwijscorpus met een recall-drempel per categorie, als blokkerende test. Maakt P1-4 deels zelf-verifieerbaar.
10. Hygiëne: `bun.lockb` en `package-lock.json` weg (bun.lock blijft), `package.json` krijgt een echte naam en version, CI pint een exacte bun-versie en draait `prettier --check` in plaats van `--write`, lint wordt blokkerend.

## Technische details

- Nieuw resultaattype in `src/lib/pim/detectorRegistry.ts`: `runRegistryDetailed()` geeft `{ spans, layers: { id, kind, status, error? }[] }`. `runRegistry()` blijft bestaan als dunne wrapper zodat bestaande aanroepers niet breken.
- `src/lib/pim/nerSlm.ts`: `detectPersonsSlm` krijgt een variant die `{ status, spans }` teruggeeft; de bestaande signature blijft voor UI-paden die fail-open mogen zijn (live markeren tijdens typen).
- `src/lib/pim/egressGuard.ts`: `reconsultPayload` draait op `MAX_STRENGTH_SETTINGS`, negeert `disabledCategories`, blokkeert bij `status !== "ran"` van een verwachte laag, en gebruikt `computeSignals`/`risk.ts` voor de score.
- `src/lib/pim/engine/engine.ts`: `requestAction` leidt `payloadType` af uit modus en guardstatus; afwijkende `payloadText` levert een `BLOCK`-uitkomst met reden.
- Headers: één `SECURITY_HEADERS`-module, gebruikt door `vite.config.ts` (dev/preview) en door de serverrespons in `src/routes/__root.tsx` of de server-entry.
- Playwright-test onder `e2e/`, script `test:e2e`, met eigen config; niet in de vitest-run.
- Tests: per punt uitbreiding in `egressGuard.test.ts`, `invariants.test.ts`, `engine.test.ts`, plus een nieuw `detectionRecall.test.ts` voor het corpus.

## Buiten scope

Externe validatie door een derde partij en performancebenchmarks blijven open P1's in `ISSUES.md`; die lossen we niet op met code.
