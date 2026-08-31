# Instellingen overal bewerkbaar in de zijbalk

## Probleem (bevestigd in code)

`StartHeader.tsx` (gebruikt op de landing en de achtergrondpagina's Over, Pipeline, Modi, Vlaggen, Trust, Compliance) rendert `<SidePanel />` zonder `settings`-prop. In `SidePanel.tsx` wordt het menu-item "Instellingen" alleen getoond als `settings` aanwezig is. Daardoor zie je op die pagina's wel "Diagnostiek" maar niet "Instellingen". Op /app en /schrijven (`ProductShell` + `AppHeader`) staat hij er wel.

## Oplossing: één instellingenscherm dat zonder engine werkt

De gekozen richting: Instellingen is op elke pagina volledig bewerkbaar. De instellingen slaan sowieso op in lokale opslag (`usePimSettings`); de engine leest ze zodra een werkscherm opent.

Technisch knelpunt: `SettingsTab.tsx` haalt alles uit `ProductShellContext` (engine, NER-status, writer-state). Die context bestaat niet op achtergrondpagina's. Daarom:

- `SettingsTab.tsx` wordt herschreven tot een component dat stand-alone werkt: het leest de instellingen direct uit `usePimSettings()` (dezelfde hook die `ProductShell` gebruikt, dus dezelfde bron en opslag) en `readDeviceCapability()`. De props voor `AdvancedPanel` (`settings.advancedPanelProps`) zijn engine-onafhankelijk; die komen rechtstreeks uit de settings-hook.
- De onderdelen die wél engine-context nodig hebben, worden conditioneel:
  - Writer-opties (auto-redactie, streng) alleen als de writer-state beschikbaar is (alleen op /schrijven, zoals nu).
  - NER/SLM-blok (status, startknop) alleen als NER draait in een werkscherm. Zonder context: toon het model-blok als informatief met melding "Starten kan in Tekst nakijken" of start via de gedeelde NER-runtime als die beschikbaar is. Beperking wordt in één korte regel vermeld.
- Implementatie: `SettingsTab` accepteert optionele context-waarden; `ProductShell` levert ze via de bestaande context (met een veilige `useProductShell`-variant of een expliciete prop-passthrough). Op achtergrondpagina's rendert `StartHeader` `<SidePanel settings={<SettingsTab mode="check" />} />` zodat hetzelfde scherm verschijnt.
- `SidePanel.tsx`: de `{settings && ...}` conditie blijft als vangrail, maar krijgt voortaan overal inhoud; de drill-down (menu -> Instellingen -> terug) werkt identiek.

## Wat verandert niet

Diagnostiek, achtergrondlinks, "Lokale opslag wissen", de compacte lichte stijl en het sluit-gedrag van het paneel blijven exact zoals nu. Gedrag op /app en /schrijven blijft ongewijzigd.

## Tests en verificatie

- `sidePanel.test.tsx`: nieuwe test: `SidePanel` met settings op een scherm zonder ProductShell-context toont Instellingen, drempels/categorieën aanpassen schrijft naar dezelfde opslag.
- Bestaande tests (`sliceC`, `twoModes`, `sidePanel`) blijven groen.
- Typecheck + volledige testsuite; Playwright-check op /over (Instellingen openen, drempel aanpassen, daarna /app openen en zien dat de waarde meegenomen is) en /app (ongewijzigd).
