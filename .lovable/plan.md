# Statemodel PiM: live-analyse vs. persistentie vastleggen en afdichten

## Achtergrond (geverifieerd in code)

- Alle functiestate (profiel, detectielagen, drempels, categorieën, tekst, analyse-resultaten) leeft in React-geheugen via `usePimSettings` en `ProductShell`. Niets hiervan wordt in localStorage geschreven.
- localStorage bevat uitsluitend: modelintegriteits-pins (`modelIntegrity.ts`, bewust persistent) en de onboarding-vlag. Geen tekst, mapping of analyse-state.
- Live meekijken tijdens typen is alleen nog actief in Snel checken en Stap voor stap. Schrijven gebruikt de expliciete "Analyseer"-knop met gewijzigd-status. Dit is voldoende; continue live-analyse is voor correctheid niet nodig.

Conclusie: er is geen localStorage-state die functies scheef kan trekken. Het plan legt dit vast en bewaakt het.

## Werkzaamheden

1. **Bewaaktest toevoegen** (`src/lib/pim/__tests__/storageBoundary.test.ts`)
   - Test dat een volledige engine-run (detectie, draft, policy) niets naar `localStorage`/`sessionStorage` schrijft.
   - Test dat `usePimSettings`-waardes na een gesimuleerde "refresh" (nieuwe mount) terugvallen op defaults in plaats van oude state.
   - Uitzondering expliciet whitelisten: alleen de modelintegriteits-pin-key mag geschreven worden.
2. **Documentatie** (`docs/GOLDEN_PATH.md`, paragraaf "Lokale opslag")
   - Het statemodel vastleggen: functiestate is vluchtig en in geheugen; alleen modelpins en UI-vlaggen zijn persistent; live-analyse is een UX-laag, geen correctnessvereiste.
3. **Geen functionele wijziging** aan live-analyse: Snel/Start blijven live, Schrijven blijft expliciet via Analyseer-knop.

## Verificatie

- `bun run typecheck` groen.
- `bun run test` groen inclusief nieuwe storageBoundary-test (verwacht 158 tests).
- Browsercheck: localStorage bevat na een volledige Quick- en Write-flow uitsluitend toegestane keys.

## Technische details

- Test gebruikt jsdom localStorage en spies op `Storage.prototype.setItem` om schrijfpogingen tijdens engine-runs te detecteren.
- Geen wijzigingen aan `modelIntegrity.ts`; de pin is by design persistent.
