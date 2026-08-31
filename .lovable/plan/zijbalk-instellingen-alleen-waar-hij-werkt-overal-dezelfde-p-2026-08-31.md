# Zijbalk: Instellingen alleen waar hij werkt, overal dezelfde plek

## Principe

Nul functionaliteitswijziging. Alles wat de engine, opslag of detectie aanraakt blijft 1-op-1 zoals het is. Er worden alleen UI-elementen verplaatst, geen logica gekopieerd of verdubbeld.

## Probleem (bevestigd in code)

- `StartHeader.tsx` (landing + achtergrondpagina's) rendert `<SidePanel />` zonder `settings`-prop; het item "Instellingen" verdwijnt daar en "Diagnostiek" blijft. Dat leest alsof iets weg is of anders werkt.
- `usePimSettings.ts` houdt instellingen alleen in React-state binnen `ProductShell`. Een instellingenscherm op info-pagina's zou een tweede, niet-gekoppelde instantie zijn: wijzigen daar doet niets voor /app en /schrijven. Die route nemen we dus niet.

## Aanpassing (alleen verplaatsing)

1. Op info-pagina's blijft het zijbalk-menu zichtbaar met Diagnostiek, achtergrondlinks en "Lokale opslag wissen" (ongewijzigd).
2. Het item "Instellingen" wordt op info-pagina's geen verborgen item meer, maar een gewone rij met subtekst "In Tekst nakijken". Klik = navigatie naar `/app` en daarna het bestaande event `pim:open-settings` dispatchen, zodat de daar al gemonteerde `SidePanel` direct op het instellingenscherm opent. Dezelfde component, dezelfde state, dezelfde functionaliteit; alleen de ingang verhuist.
3. Op /app en /schrijven verandert er helemaal niets: menu -> Instellingen opent zoals nu de bestaande `SettingsTab` binnen dezelfde `ProductShell`-context, inclusief writer-opties en NER-blok.
4. Geen nieuwe settings-instantie, geen extra opslag, geen wijzigingen aan `usePimSettings`, `SettingsTab`, `AdvancedPanel` of de engine.

## Tests en verificatie

- `sidePanel.test.tsx`: aanpassen/nieuwe test: zonder `settings`-prop toont het menu "Instellingen" als link die naar `/app` navigeert en daarna `pim:open-settings` dispatchet; mét settings blijft de drill-down zoals nu.
- Bestaande suites (`sliceC`, `twoModes`, `ProductShell`, `routeChrome`, `mobileLight`) blijven ongewijzigd groen; geen assertion over functionaliteit wordt afgezwakt.
- Typecheck + volledige testsuite. Playwright op 390px en 1280px: op /over klik op Instellingen -> landt op /app met geopend instellingenpaneel; op /app gedrag ongewijzigd; footer en paneel verder identiek.
