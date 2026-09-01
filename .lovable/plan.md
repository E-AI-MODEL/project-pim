# Plan: Compacte, externe changelog zichtbaar op GitHub

## Doel

Er is een `CHANGELOG.md` in de repo, maar hij is niet extern zichtbaar (geen GitHub-repo), niet gelinkt, niet gesurfaced op de site, en de inhoud loopt niet mee met het recente werk. Doel: een compacte, genummerde changelog die volledig is bijgewerkt én extern zichtbaar via een publieke GitHub-repo. De changelog blijft alleen in de repo (geen `/changelog`-route op de site).

## Huidige staat (geverifieerd)

- `CHANGELOG.md` bestaat (26 regels, Keep-a-Changelog-stijl) maar heeft alleen een `## Unreleased` sectie; geen genummerde/gedateerde releases.
- De repo staat niet op GitHub. `origin` wijst naar Lovable's interne opslag (`git.private.lovable-gcp.code.storage/...`). Er is een `.github/workflows/ci.yml`, maar die draait pas echt zodra het project aan een GitHub-repo gekoppeld is.
- `CHANGELOG.md` wordt nergens genoemd (README, docs, site).
- Secret-scan: geen echte secrets in getrackte bestanden (hits zijn valse positieven op het woord "key"/"api_key" in docs en policy-tekst); geen `.env`-bestanden getrackt. Repo is veilig voor publicatie.
- Recent werk (UX-consolidatie, PiM Light mobiel, reset-knop, centrale NER, uitgebreide detectie-regels, modelpinning, egress-tests) staat niet in de changelog.

## Wijzigingen

### 1. GitHub-koppeling (gebruikersactie + voorbereiding)

De daadwerkelijke koppeling gebeurt in de Lovable UI: Plus (+) menu → GitHub → Connect project → autoriseer de Lovable GitHub App → kies account/org → Create Repository. Dit is een autorisatiestap die ik niet zelf kan uitvoeren; ik begeleid en bereid voor.

Voorbereiding die ik wel doe:
- Controleren dat `.gitignore` voldoende is (node_modules, dist, .dev.vars, .wrangler staan erin — OK).
- Bevestigen dat geen secrets meegaan (al geverifieerd).
- `README.md` een verwijzing naar de changelog laten bevatten (zie stap 3), zodat externe bezoekers op GitHub de changelog vinden.

Na de koppeling: de CI-workflow (`.github/workflows/ci.yml`) draait automatisch op pushes/PR's naar `main` en geeft externe zichtbaarheid op de buildstatus.

### 2. `CHANGELOG.md` volledig bijwerken

Herstructureren naar genummerde, gedateerde releases met compacte Keep-a-Changelog-stijl. Inhoud gebaseerd op geverifieerde commit-geschiedenis en sessie-werk:

```
# Changelog

Alle noemenswaardige wijzigingen aan Project PiM.

## [Unreleased]

(nieuwe werkzaamheden na laatste release)

## [0.2.0] - 2026-09-01

### Added
- "Zet de lokale AI aan"-uitnodiging als gedeelde kaart in Tekst nakijken en Zelf schrijven (één modeldownload, gedeelde state).
- Agressievere naamdetectie: kleine-letter-namen, tussenvoegsels, namen na rol-/werkwoorden, naam-echo's.
- Interactieve vervang/negeer-bubbel op gearceerde stukken in Tekst nakijken.
- Reset-knop ("Nieuwe tekst") in het scherm in beide modi; dubbele menupunten verwijderd uit burgermenu.
- Zijbalk (SidePanel) voor Instellingen/Diagnostiek/Over via Menu-knop in header; oude burgermenu en footer-instellingen verwijderd.
- PiM Light mobiele layout: stacked view, MobileModePicker, MobileActionBar, bottom-sheet bevindingen.
- Lokale AI-aanbodkaart met voortgang en foutafhandeling.

### Changed
- UX-consolidatie: "Snel checken" en "Stap voor stap" samengevoegd tot "Tekst nakijken"; "Zelf schrijven" als werkruimte.
- Instellingen ontdubbeld onder "Waar PiM op zoekt" en "Wat PiM markeert".
- Gecentraliseerde statusregel (Klaar/Bezig/Verouderd/Fout).
- Centrale NER-runtime in ProductShell; modi delen één tekst- en resultaatbron.
- Lichte, compacte product-shell; technische chrome en permanente monitoren verwijderd.
- Copy natuurlijker en korter; em-dashes verwijderd over de hele site.
- "Privacy in Mind" verwijderd; productnaam consequent "Project PiM" / "Privacy Integrity Monitor".

### Fixed
- Incrementele detectie bij toevoegen aan bestaande tekst (race-condition opgelost).
- Contrast en leesbaarheid van bevindingen-kleuren in lichte modus.
- Hydratiefout op /trust en CSP-meta-waarschuwing opgelost.

## [0.1.0] - 2026-08-31

### Added
- CI-workflow voor typecheck, lint, tests, build en dependency audit.
- Securitybeleid met privé meldkanaal.
- Contribution guide met privacyregels.
- Roadmap met releasevolgorde.
- CSP-headers voor dev/preview en hosts met `_headers`.
- E2E-tests voor copy, export, print, share en send_external_ai.
- Browser-local modelconfig pins via `LOCAL_PIN:*`.

### Changed
- `LICENSE` gezet op MIT.
- README verduidelijkt lokale browsergrens, modelintegriteit en bekende grenzen.
- NER-integriteit hasht nu de publieke `config.json`.

### Fixed
- BSN-detectie gebruikt Nederlandse elfproef als post-filter.
- `send_external_ai` expliciet getest als endpointloze simulatie zonder fetch.
```

Exacte tekst wordt in de implementatie vastgesteld op basis van de laatste commit-status; bovenstaande is de richting.

### 3. README verwijzing

In `README.md` een één-regel verwijzing naar de changelog toevoegen bij de projectbeschrijving, zodat externe bezoekers op GitHub hem vinden:

```
Zie [CHANGELOG.md](./CHANGELOG.md) voor de wijzigingsgeschiedenis.
```

### 4. Geen site-route

Geen `/changelog`-route of site-sectie. De changelog blijft alleen in de repo en is extern zichtbaar via GitHub.

## Verificatie

- `CHANGELOG.md` is compact, genummerd en dekt het recente werk.
- `README.md` verwijst naar de changelog.
- Secret-scan op de te publiceren inhoud: geen echte secrets (al bevestigd).
- `bun run typecheck`, `bun run test`, `bun run build` groen (changelog/README-raak geen code, maar ter bevestiging).
- Na GitHub-koppeling: changelog zichtbaar op de publieke GitHub-repo; CI draait groen op de eerste push.

## Niet in dit plan

- Het daadwerkelijk uitvoeren van de GitHub-koppeling (gebruikersautorisatie via Lovable UI).
- Een changelog-route op de gepubliceerde site (geen, per keuze).
- Wijzigingen aan engine- of privacylogica.
