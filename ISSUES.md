# PiM issuelijst (prioriteit)

Bron van waarheid voor vrijgave-impact. Bijgewerkt na de afwerkronde op de
fiatteringsaudit (commit `edf7d64`) en de eerlijke go/no-go (commit in deze ronde).

Classificatie:

- **P0 blocker**: mag niet naar productie/verkoop.
- **P1 vrijgavevoorwaarde**: mag mee in release 1, moet opgelost of contractueel afgedekt zijn voor betaalde uitrol.
- **P2 kwaliteit**: verbetering, geen vrijgave-impact.

## Eerlijke go/no-go

- **Privacy-kern: GO.** Geverifieerd in audit en in deze sessie: 0 externe
  requests tijdens sessie, klembord-uitvoer volledig gemaskeerd, geen
  persoonsgegevens in localStorage, fail-closed blokkade bij niet-toegestaan
  profiel/payload/model.
- **Betaalde uitrol: pas na drie open voorwaarden (zie P1-3, P1-4 en P1-6).**
  Deze zijn niet oplosbaar door ze weg te schrijven; ze moeten echt gemeten of
  contractueel afgedekt zijn.

## P0 blocker

Geen. Alle privacy-kritieke gedragingen zijn in de audit bevestigd: 0 externe requests, klembord-uitvoer volledig gemaskeerd, geen persoonsgegevens in localStorage, fail-closed blokkade bij niet-toegestaan profiel.

## P1 vrijgavevoorwaarden

| ID   | Onderwerp                                  | Status                                | Afhandeling                                                                                                                                                                                                                                                                                                                                                                                         |
| ---- | ------------------------------------------ | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-1 | Modelpinning niet immutabel                | **Opgelost**                          | `modelCatalog.ts` gebruikt nu immutable HF-commits (`c2a4dbf…`, `263e82c…`) met vaste SHA-256 van `config.json`. Helper `hasStaticProductionHash()` in `modelIntegrity.ts`; test bewaakt dat geen release-1 entry nog `main` of `LOCAL_PIN`/`PLACEHOLDER` gebruikt.                                                                                                                                 |
| P1-2 | Modeldownload is de enige egress           | **Opgelost**                          | Expliciet benoemd in het expertpaneel bij BERT en vastgelegd in `docs/GOLDEN_PATH.md` (sectie "Modeldownload en egress"). Download start alleen na gebruikersactie.                                                                                                                                                                                                                                 |
| P1-3 | WebGPU niet beschikbaar in auditomgeving   | **Open, geaccepteerd risico**         | WASM-fallback werkt aantoonbaar. Performance in de preview is gemeten (zie `docs/GOLDEN_PATH.md`); doelhardware moet vóór betaalde uitrol één keer gemeten worden. Ligt bij de uitrol-partij.                                                                                                                                                                                                       |
| P1-4 | Detectiekwaliteit niet extern gevalideerd  | **Deels opgelost, rest contractueel** | `detectionRecall.test.ts` legt een blokkerende recall-ondergrens per categorie vast op een gelabeld synthetisch NL-onderwijscorpus (regex/lexicon-only, dus zonder modeldownload in CI). Eigen tests dekken de regels. Externe validatie op een onafhankelijk Nederlands onderwijscorpus blijft nodig; recall-claims richting scholen blijven voorzichtig geformuleerd ("niet extern gevalideerd"). |
| P1-5 | Geen persistentie van gebruikersvoorkeuren | **Opgelost als productgedrag**        | Vastgelegd in `docs/GOLDEN_PATH.md`: instellingen zijn bewust vluchtig, refresh valt terug op defaults. Bewaakt door `storageBoundary.test.ts`.                                                                                                                                                                                                                                                     |
| P1-6 | CSP-controle op definitieve hosting        | **Opgelost**                          | Eén bron (`src/lib/security/headers.ts`) voor modelhost-allowlist en CSP, uitgeserveerd door `src/start.ts` (productie) en `vite.config.ts` (dev/preview), dus hostonafhankelijk. `public/_headers` is nog slechts een niet-normatieve kopie. Geverifieerd in de browser: header aanwezig op `/app`, app hydrateert.                                                                                |

| P1-7 | Privacybelofte alleen in jsdom getest | **Opgelost** | `e2e/privacy.spec.ts` (Playwright, `bun run test:e2e`) blokkeert elk verzoek buiten app- en modelhosts en leest de werkelijke klembordinhoud. Gemeten resultaat: 0 verzoeken naar derden, geen ruwe persoonsgegevens op het klembord. |

## P2 kwaliteit

| ID   | Onderwerp                                                 | Status                                                                                                                                                                            |
| ---- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2-1 | Lege ruimte onder resultaat in Stap voor stap op desktop  | Open, cosmetisch                                                                                                                                                                  |
| P2-2 | 10 "Fast refresh" lintwaarschuwingen                      | Geaccepteerd: alle tien komen uit vendored shadcn-componenten en `router.tsx`; 0 lint-errors                                                                                      |
| P2-3 | BLOCK-verdict schakelt tab "Veilig" uit zonder uitleg     | **Opgelost**: inline hint "kies modus Anoniem of verwijder de gegevens"                                                                                                           |
| P2-4 | Zelftest logde als `external fetch detected` waarschuwing | **Opgelost**: probe wordt herkend, gelogd als `[PIM zelftest]` op info-niveau en gefilterd uit de schendingenlijst op `/trust`                                                    |
| P2-5 | Geen voortgang tijdens modeldownload                      | **Opgelost**: voortgangsbalk met percentage en bestandsnaam in het expertpaneel                                                                                                   |
| P2-6 | rewrite_qwen als release-1 met `main`/`LOCAL_PIN`         | **Opgelost**: catalogusentry is nu `design-only`; test bewaakt dat geen release-1 entry `main`/`LOCAL_PIN`/`PLACEHOLDER` gebruikt. UI toont het als experimenteel in Diagnostiek. |
| P2-7 | context_education placeholder-hash                        | **Design-only (geaccepteerd)**: model niet gepubliceerd; gate blokkeert al egress bij placeholder. Vervang door echte mirror-hash zodra het model bestaat.                        |
