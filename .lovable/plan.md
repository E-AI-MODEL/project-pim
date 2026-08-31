# Instellingen overal zichtbaar in de zijbalk

## Probleem (bevestigd in code)

`StartHeader.tsx` (gebruikt op de achtergrondpagina's Over, Pipeline, Modi, Vlaggen, Trust, Compliance en de landing) rendert `<SidePanel />` zonder `settings`-prop. In `SidePanel.tsx` wordt het menu-item "Instellingen" alleen getoond als `settings` aanwezig is (`{settings && (...)}`). Daardoor zie je op die pagina's wel "Diagnostiek" maar niet "Instellingen". Op /app en /schrijven (`ProductShell` + `AppHeader`) staat hij er wel.

## Keuze

Twee opties:

**A. Instellingen overal, maar alleen waar hij werkt (aanbevolen)**
Instellingen beïnvloeden de engine (drempels, categorieën, NER-model) en die leeft alleen op de werkschermen. Op achtergrondpagina's is er geen engine. Optie A: toon "Instellingen" op achtergrondpagina's wel, maar als grijs/uitgeschakeld item met toelichting "Beschikbaar in Tekst nakijken en Zelf schrijven", plus een knop die naar /app gaat en daar direct het instellingenscherm opent (via het bestaande `pim:open-settings` event na navigatie).

**B. Instellingen volledig overal werkend**
Maak de instellingen ook op achtergrondpagina's bewerkbaar. Ze slaan sowieso op in lokale opslag (`usePimSettings`), dus wijzigingen gelden zodra je naar een werkscherm gaat. Nadeel: gebruiker kan daar drempels aanpassen zonder direct effect te zien; NER-modelstatus en startknop werken niet zonder engine-context.

## Uitwerking optie A (standaard tenzij anders gekozen)

- `SidePanel.tsx`: het Instellingen-item wordt altijd gerenderd. Zonder `settings`-prop is het een rij met `aria-disabled`, lichte tekst en subtekst "Alleen in de werkschermen"; klik navigeert naar `/app` en dispatcheert daarna `pim:open-settings`.
- `SidePanel` luistert al naar `pim:open-settings`; na navigatie naar /app opent de daar gemonteerde `SidePanel` direct op Instellingen.
- Diagnostiek blijft overal beschikbaar (werkt zonder engine).
- Tests: `sidePanel.test.tsx` uitbreiden met geval "zonder settings-prop: item zichtbaar maar uitgeschakeld"; bestaande test "menu-item-settings opent instellingen" blijft gelden.
- Verificatie: typecheck, testsuite, Playwright-check op /over (item zichtbaar, klik leidt naar /app met geopend instellingenpaneel) en /app (ongewijzigd gedrag).

## Wat verandert niet

Diagnostiek, achtergrondlinks, "Lokale opslag wissen", compacte stijl en het drill-down gedrag van het paneel blijven exact zoals nu.
