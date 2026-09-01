# Controle op de tien vervolgstappen

Gecontroleerd in de code. Zes stappen zijn af, vier zijn gedeeltelijk of niet uitgevoerd.

## Wat klopt

| Stap | Status | Bewijs in de code |
| ---- | ------ | ----------------- |
| 1 Nakijken-modus | af | `CheckMode.tsx:142` roept `requestActionForText(payload, act)`; commando staat in `ProductShellContext.tsx:18` |
| 2 Schrijven door de guard | af | `WriterWorkspace.tsx:375` voert kopie, download en AI via `requestActionForText(safeText, action)` |
| 3 Mapping-export | af | `MappingViewer.tsx` heeft bevestigstap plus `logLocalKeyAccess(...)` |
| 4 Opruimen egressGuard | af | `egressGuard.ts:72` `const settings = MAX_STRENGTH_DETECTION_SETTINGS`, `userBertOff` alleen nog voor waarschuwing |
| 7 Headers meten | af | `e2e/privacy.spec.ts` vergelijkt elke header 1-op-1 met `SECURITY_HEADERS` |
| 8 Lint blokkerend | af | `package.json`: `eslint . --max-warnings=0` |

## Wat nog open staat

### Stap 5, browsertest mag nog te makkelijk slagen
- De test accepteert nog "of kopieerknop, of blokkade". Daarmee slaagt hij ook als de kopieerknop ontbreekt.
- Er wordt niet gecontroleerd dat het klembord na een geslaagde kopie het maskeertoken bevat; alleen dat de geheimen ontbreken. Een leeg klembord slaagt dus.
- Nog `page.route`, niet `context.route`.
- De tweede test voor het fail-closed pad (modelhost geblokkeerd, zichtbare blokkademelding, klembord onaangeroerd) ontbreekt.

### Stap 6, E2E in CI wijkt af van het plan
- De Playwright-stappen hangen in de bestaande `check`-job, er is geen aparte `e2e`-job.
- Geen `actions/cache` op de transformers.js-modelcache met de modelrevisie in de sleutel.
- Draait via `bun run dev` in plaats van `bun run build && bun run preview` met `PIM_E2E_BASE_URL`.

### Stap 9, modelintegriteitsclaim nog niet gelijkgetrokken
- README hoofdstuk Modelintegriteit noemt de config- en tokenizerhash, maar zegt nergens dat een gemanipuleerd gewichtenbestand op diezelfde revision niet wordt uitgesloten. Hetzelfde geldt voor `docs/pim-handoff/02-modelintegriteit-productie.md`.
- `ISSUES.md` heeft geen openstaande post over een streaming hash over het gewichtenbestand.

### Stap 10, detectiecorpus niet gesplitst
- `detectionRecall.test.ts` bestaat, maar zonder splitsing in `regressie` en `challenge`, zonder precisiedrempel per categorie op bijna-treffers, en zonder behaalde score in de foutmelding.

## Voorstel om af te maken

1. `e2e/privacy.spec.ts`: kopieerknop verplicht stellen, klembord moet het maskeertoken bevatten, `context.route`, plus een tweede test die de modelhost blokkeert en de blokkademelding en het onaangeroerde klembord afdwingt.
2. `.github/workflows/ci.yml`: aparte `e2e`-job, modelcache met de revisie uit `MODEL_CATALOG` in de sleutel, draaien tegen de productiebuild via `PIM_E2E_BASE_URL`.
3. README en `docs/pim-handoff/02-modelintegriteit-productie.md`: exacte formulering van wat de hashes wel en niet uitsluiten; `ISSUES.md` krijgt de streaming-hash post.
4. `detectionRecall.test.ts` splitsen in regressie en challenge, precisiedrempels per categorie, score in de foutmeldingen, en de challenge-set moet bij invoering minstens een echt gat blootleggen.

Verificatie: stap 1 en 4 met `bun run test:e2e`, stap 3 en 4 met `bun run check`.
