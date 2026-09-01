# Vervolgstappen na review van `1b86627`

Tien stappen, in volgorde, elk met eigen verificatie. Stap 1 tot en met 4 zijn correctheid en veiligheid, 5 tot en met 7 maken de belofte meetbaar, 8 tot en met 10 zijn claims en hygiëne.

Bevestigd in de code: `requestActionForText` bestaat wel in de engine maar wordt nergens gebruikt; `WriterWorkspace` schrijft rechtstreeks naar klembord en bouwt zelf een Blob; `MappingViewer.copyAsJson` kopieert de mapping ongecontroleerd; de `bert`-tak in `reconsultPayload` leest een gebruikerswaarde; `lint` is `eslint .` zonder `--max-warnings`.

## Stap 1 — Nakijken-modus herstellen

- `src/hooks/usePimEngine.ts`: `requestActionForText` als stabiele `useCallback` teruggeven; type toevoegen aan `UsePimEngineResult`.
- `ProductShellContext` doorgeven aan de modi.
- `CheckMode.tsx`: `runCheckAction` gebruikt `requestActionForText(payload, act)`.
- Test: bewerkte veilige tekst kopiëren geeft `executed === true`.

## Stap 2 — Schrijven-modus door de guard

`WriterWorkspace.tsx`: `onCopy`, `onDownload` en `onSendAI` lopen alle drie via `requestActionForText(safeText, ...)`. Klembordschrijf en Blob-download gebeuren pas na `executed === true`; anders komt de reden in `egressMsg`. Waarschuwingen bij succes worden ook getoond.

Test: falende NER-laag, kopiëren in Schrijven, klembord blijft ongewijzigd en de blokkadereden is zichtbaar.

## Stap 3 — Mapping-export (optie A)

De mapping is een lokale sleutel, geen egress-payload. De kopieerknop in `MappingViewer.tsx` komt achter een expliciete bevestiging met de tekst dat dit ruwe persoonsgegevens bevat en de eigen machine niet mag verlaten; de actie wordt in de egress-log genoteerd. De keuze en de reden komen in de README.

Test: mapping-JSON passeert nooit de guard als `copy` of `export_file`.

## Stap 4 — Opruimen in `egressGuard.ts`

`const settings = MAX_STRENGTH_DETECTION_SETTINGS;`. `userBertOff` blijft voor de waarschuwing en de strict-check. Bestaande uitkomsten in `reconsultFailClosed.test.ts` blijven gelijk.

## Stap 5 — Browsertest laten falen waar hij nu slaagt

In `e2e/privacy.spec.ts`: kopieerknop verplicht zichtbaar, klembord moet niet leeg zijn én het maskeertoken bevatten, `context.route` in plaats van `page.route`, plus een tweede test voor het fail-closed pad (modelhost geblokkeerd, zichtbare blokkademelding, leeg klembord).

## Stap 6 — E2E in CI

Nieuwe job `e2e` in `.github/workflows/ci.yml`: `bunx playwright install --with-deps chromium`, `actions/cache` op de transformers.js-cachemap met de modelrevisie uit `MODEL_CATALOG` in de sleutel, draaien tegen `bun run build && bun run preview` via `PIM_E2E_BASE_URL`. Assertie blijft "geen verzoeken buiten de allowlist".

## Stap 7 — Headers meten

E2E-test leest de responseheaders en vergelijkt met de waarden geïmporteerd uit `src/lib/security/headers.ts`: CSP identiek, `connect-src` bevat elke host uit `MODEL_HOST_PATTERNS`, plus `Referrer-Policy`, `X-Content-Type-Options` en `Permissions-Policy`.

## Stap 8 — Lint blokkerend

`react-refresh/only-export-components` op `off` voor de genoemde shadcn- en dubbelexporterende bestanden, `"lint": "eslint . --max-warnings=0"`, en de CI-jobnaam en lint-stap zonder het woord advisory.

## Stap 9 — Modelintegriteitsclaim gelijktrekken

README en `docs/pim-handoff/02-modelintegriteit-productie.md` schrijven precies op dat de immutable revision plus de config- en tokenizerhash uitsluiten dat een ander model of een andere tokenizer geladen wordt, maar een gemanipuleerd gewichtenbestand op diezelfde revisie niet uitsluiten. `ISSUES.md` krijgt de openstaande post: streaming hash over het gewichtenbestand bij eerste download, resultaat pinnen.

## Stap 10 — Detectiecorpus scherper

Precisiedrempel per categorie op teksten die er alleen op lijken (negencijferige getallen naast postcodes, straatnamen die op achternamen lijken, historische figuren in lesmateriaal). Corpus splitsen in `regressie` en `challenge`, met aparte rapportage. Foutmeldingen noemen de behaalde score naast de gemiste items. De challenge-set moet bij invoering minstens één echt gat blootleggen.

## Verificatie per blok

| Stap | Draai daarna |
| --- | --- |
| 1–3 | `bun run typecheck && bun run test` |
| 4 | `bun run test` |
| 5–7 | `bun run test:e2e` |
| 8–10 | `bun run check` |

## Buiten scope

Externe validatie door een derde partij en performancebenchmarks op doelhardware blijven open P1's in `ISSUES.md`.
