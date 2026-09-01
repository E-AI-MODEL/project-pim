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

| ID   | Onderwerp                                  | Status                                       | Afhandeling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---- | ------------------------------------------ | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-1 | Modelpinning niet immutabel                | **Opgelost**                                 | `modelCatalog.ts` gebruikt nu immutable HF-commits (`c2a4dbf…`, `263e82c…`) met vaste SHA-256 van `config.json`. Helper `hasStaticProductionHash()` in `modelIntegrity.ts`; test bewaakt dat geen release-1 entry nog `main` of `LOCAL_PIN`/`PLACEHOLDER` gebruikt.                                                                                                                                                                                                                                                                                                           |
| P1-2 | Modeldownload is de enige egress           | **Opgelost**                                 | Expliciet benoemd in het expertpaneel bij BERT en vastgelegd in `docs/GOLDEN_PATH.md` (sectie "Modeldownload en egress"). Download start alleen na gebruikersactie.                                                                                                                                                                                                                                                                                                                                                                                                           |
| P1-3 | WebGPU niet beschikbaar in auditomgeving   | **Opgelost als zelfmeting**                  | De auditomgeving kan geen WebGPU meten, daarom is de meting nu in het product zelf zelf-verifieerbaar: Diagnostiek > Omgeving > "Snelheid op dit apparaat" (`src/lib/pim/benchmark.ts`, `PerfBenchmark.tsx`) meet rekentijd van regels en taalmodel op de doelhardware en geeft een leesbaar oordeel (snel / bruikbaar / traag). Alles blijft lokaal. Wat open blijft, is een getal invullen op één schoollaptop; dat is een handeling, geen ontbrekende functie.                                                                                                             |
| P1-4 | Detectiekwaliteit niet extern gevalideerd  | **Technisch afgerond, externe toets blijft** | `detectionRecall.test.ts` bewaakt nu drie blokkerende ondergrenzen op een uitgebreid gelabeld synthetisch NL-onderwijscorpus (14 teksten, 34 labels): recall per categorie, totale recall >= 0,9 en een bovengrens aan valse positieven op schone onderwijsteksten. Deze ronde vond de test twee echte fouten (ongeldige IBAN-check en woorden als "mediawijsheid" als naam), beide opgelost. Wat overblijft is per definitie niet met code te sluiten: een toets door een derde partij op eigen materiaal. Claims richting scholen blijven daarom "niet extern gevalideerd". |
| P1-5 | Geen persistentie van gebruikersvoorkeuren | **Opgelost als productgedrag**               | Vastgelegd in `docs/GOLDEN_PATH.md`: instellingen zijn bewust vluchtig, refresh valt terug op defaults. Bewaakt door `storageBoundary.test.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| P1-6 | CSP-controle op definitieve hosting        | **Opgelost**                                 | Eén bron (`src/lib/security/headers.ts`) voor modelhost-allowlist en CSP, uitgeserveerd door `src/start.ts` (productie) en `vite.config.ts` (dev/preview), dus hostonafhankelijk. `public/_headers` is nog slechts een niet-normatieve kopie. Geverifieerd in de browser: header aanwezig op `/app`, app hydrateert.                                                                                                                                                                                                                                                          |

| P1-7 | Privacybelofte alleen in jsdom getest | **Opgelost** | `e2e/privacy.spec.ts` (Playwright, `bun run test:e2e`) blokkeert elk verzoek buiten app- en modelhosts en leest de werkelijke klembordinhoud. Gemeten resultaat: 0 verzoeken naar derden, geen ruwe persoonsgegevens op het klembord, wel maskeertokens; een tweede test dwingt het fail-closed pad af (persoonsgegevens terug in de veilige versie: kopiëren geblokkeerd, klembord onaangeroerd). |

| P1-8 | Gewichtenbestand niet gehasht | **Open** | De gate hasht `config.json` en `tokenizer.json` op een immutable revision. Dat sluit een ander model of een andere tokenizer uit, maar niet een gemanipuleerd gewichtenbestand op diezelfde revision. Op te lossen met een streaming SHA-256 over het gewichtenbestand bij de eerste download, met het resultaat gepind in `modelCatalog.ts`. Tot die tijd blijft de claim in README en handoff expliciet beperkt. |

## P2 kwaliteit

| ID   | Onderwerp                                                 | Status                                                                                                                                                                            |
| ---- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2-1 | Lege ruimte onder resultaat in Stap voor stap op desktop  | **Vervallen**: de modus "Stap voor stap" bestaat niet meer, nakijken en schrijven zijn samengevoegd                                                                               |
| P2-2 | 10 "Fast refresh" lintwaarschuwingen                      | Geaccepteerd: alle tien komen uit vendored shadcn-componenten en `router.tsx`; 0 lint-errors                                                                                      |
| P2-3 | BLOCK-verdict schakelt tab "Veilig" uit zonder uitleg     | **Opgelost**: inline hint "kies modus Anoniem of verwijder de gegevens"                                                                                                           |
| P2-4 | Zelftest logde als `external fetch detected` waarschuwing | **Opgelost**: probe wordt herkend, gelogd als `[PIM zelftest]` op info-niveau en gefilterd uit de schendingenlijst op `/trust`                                                    |
| P2-5 | Geen voortgang tijdens modeldownload                      | **Opgelost**: voortgangsbalk met percentage en bestandsnaam in het expertpaneel                                                                                                   |
| P2-6 | rewrite_qwen als release-1 met `main`/`LOCAL_PIN`         | **Opgelost**: catalogusentry is nu `design-only`; test bewaakt dat geen release-1 entry `main`/`LOCAL_PIN`/`PLACEHOLDER` gebruikt. UI toont het als experimenteel in Diagnostiek. |
| P2-7 | context_education placeholder-hash                        | **Design-only (geaccepteerd)**: model niet gepubliceerd; gate blokkeert al egress bij placeholder. Vervang door echte mirror-hash zodra het model bestaat.                        |
