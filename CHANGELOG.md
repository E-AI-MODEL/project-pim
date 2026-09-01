# Changelog

Alle noemenswaardige wijzigingen aan Project PiM.

## [Unreleased]

### Added

- Fail-closed re-consult: detectoren rapporteren `ran`/`failed`/`skipped`; een niet aantoonbaar gedraaide laag blokkeert export en externe AI.
- Onafhankelijke tweede mening: de re-consult draait altijd op maximale sterkte, los van gebruikersinstellingen.
- `e2e/privacy.spec.ts` (Playwright): echte browsertest op 0 verzoeken naar derden en gemaskeerde klembordinhoud. Draaien met `bun run test:e2e`.
- `detectionRecall.test.ts`: blokkerende recall-ondergrens per PII-categorie op een synthetisch NL-onderwijscorpus.
- Modelintegriteit dekt nu ook `tokenizer.json`, naast `config.json`.

### Changed

- Eén bron voor CSP en modelhost-allowlist (`src/lib/security/headers.ts`), uitgeserveerd door de server (`src/start.ts`) in plaats van alleen `public/_headers`.
- Risico-scoring alleen nog uit `risk.ts`; dubbele gewichten in `egressGuard.ts` verwijderd.
- Engine vertrouwt de aanroeper niet meer: afwijkende `payloadText` wordt geweigerd.
- CI pint Bun 1.3.3, draait `prettier --check` en maakt lint blokkerend; overtollige lockfiles (`bun.lockb`, `package-lock.json`) verwijderd; `package.json` heet nu `project-pim` met versie.

### Fixed

- CSP blokkeerde de SSR-hydratatiescripts, waardoor de app in productie niet reageerde.

## [0.2.0] - 2026-09-01

### Added

- "Zet de lokale AI aan"-uitnodiging als gedeelde kaart in Tekst nakijken en Zelf schrijven (één modeldownload, gedeelde state).
- Agressievere naamdetectie: kleine-letter-namen, tussenvoegsels, namen na rol- en werkwoorden, en naam-echo's van eerder gevonden namen.
- Interactieve vervang/negeer-bubbel op gearceerde stukken in Tekst nakijken.
- Reset-knop ("Nieuwe tekst") in het scherm in beide modi; dubbele menupunten verwijderd uit het burgermenu.
- Zijbalk (SidePanel) voor Instellingen, Diagnostiek en Over via een Menu-knop in de header; oud burgermenu en footer-instellingen verwijderd.
- PiM Light mobiele layout: gestapelde weergave, MobileModePicker, MobileActionBar en bottom-sheet voor bevindingen.
- Lokale AI-aanbodkaart met voortgang en foutafhandeling ("Opnieuw proberen").
- Uitgebreide detectieregels voor Nederlandse PII: slordige e-mail, telefoon, BSN (elfproef), IBAN (mod-97), leerlingnummers, groep/klas en adressen.

### Changed

- UX-consolidatie: "Snel checken" en "Stap voor stap" samengevoegd tot "Tekst nakijken"; "Zelf schrijven" als werkruimte.
- Instellingen ontdubbeld onder "Waar PiM op zoekt" en "Wat PiM markeert".
- Gecentraliseerde statusregel (Klaar, Bezig, Verouderd, Fout).
- Centrale NER-runtime in ProductShell; modi delen één tekst- en resultaatbron.
- Lichte, compacte product-shell; technische chrome en permanente monitoren verwijderd.
- Copy natuurlijker en korter; em-dashes verwijderd over de hele site.
- "Privacy in Mind" verwijderd; productnaam consequent "Project PiM" en "Privacy Integrity Monitor".
- Modelintegriteit: immutabele pinning met SHA-256 op publieke `config.json` voor release-1 modellen.
- Gedownloade detectietijd per 1.000 tekens vastgelegd in `docs/GOLDEN_PATH.md`.

### Fixed

- Incrementele detectie bij toevoegen aan bestaande tekst (race-condition opgelost).
- Contrast en leesbaarheid van bevinding-kleuren in de lichte modus.
- Hydratiefout op `/trust` en CSP-meta-waarschuwing opgelost.
- Zelftest wordt niet meer als fout gelogd.

## [0.1.0] - 2026-08-31

### Added

- CI-workflow voor typecheck, lint, tests, build en dependency audit.
- Securitybeleid met privé meldkanaal.
- Contribution guide met privacyregels voor bijdragen.
- Roadmap met releasevolgorde.
- CSP-headers voor dev/preview en hosts met `_headers` ondersteuning.
- E2E-tests voor copy, export, print, share en send_external_ai.
- Browser-local modelconfig pins via `LOCAL_PIN:*`.

### Changed

- `LICENSE` gezet op MIT.
- README verduidelijkt de lokale browsergrens, modelintegriteit en bekende grenzen.
- NER-integriteit hasht nu de publieke `config.json` in plaats van de oude descriptor-string.

### Fixed

- BSN-detectie gebruikt nu de Nederlandse elfproef als post-filter.
- `send_external_ai` expliciet getest als endpointloze simulatie zonder fetch.
