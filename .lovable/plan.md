# Eén zijbalk voor alles wat geen tekstwerk is

Nu staan hulpmiddelen op drie plekken: burgermenu rechtsboven, "Instellingen" en "Diagnostiek" onderin de footer, en losse pagina's. Dat wordt één vaste plek.

## De regel

Alles wat informatie of instellingen is, opent als zijbalk rechts. Altijd vanaf dezelfde knop rechtsboven in de header. Altijd op dezelfde manier te sluiten: kruisje, Escape, of klikken naast de balk. Op mobiel dekt de balk het volle scherm, op desktop is het een panel van vaste breedte. De footer bevat daarna alleen nog status, geen knoppen.

## Indeling van de zijbalk

Eén paneel met drie tabbladen bovenin:

```text
[ Instellingen ] [ Diagnostiek ] [ Over ]
```

- Instellingen: waar PiM op let, hoe streng, wat hij weghaalt (huidige inhoud van het instellingenpaneel).
- Diagnostiek: modelstatus, integriteit, techniek-log (huidige inhoud van de technische monitor).
- Over: korte uitleg over PiM plus links naar de achtergrondpagina's (Over, Pipeline, Modi, Vlaggen, Trust, Compliance) en de knop "Lokale opslag wissen".

Standaard opent de knop op het tabblad Instellingen. Een directe actie (bijvoorbeeld "Diagnostiek" vanuit een statusmelding) opent hetzelfde paneel op het juiste tabblad.

## Wat verdwijnt

- De twee knoppen in de footer.
- Het aparte burgermenu-overlay met eigen stijl en eigen breedte.
- De losse technische-monitor-sheet als eigen venster.

## Wat blijft

Alle bestaande functionaliteit: instellingen, categorieën, modelbeheer, diagnostiek, opslag wissen, links naar achtergrondpagina's. Alleen de verpakking verandert.

## Technisch

- Nieuw: `src/components/pim/product/SidePanel.tsx`. Eén `Sheet` (side right, `w-full sm:max-w-md`) met `Tabs`, in de stijl van het huidige instellingenpaneel. Rendert `AdvancedPanel` (Instellingen), de body van `LiveTechMonitor` (Diagnostiek) en een nieuwe lichte "Over"-sectie.
- `LiveTechMonitor.tsx` wordt gesplitst: de inhoud gaat naar een export zonder eigen `Sheet`/trigger, zodat het paneel hem kan tonen. De trigger-variant verdwijnt uit de footer.
- `SettingsPanel.tsx` gaat op in `SidePanel.tsx` (bestand vervalt); de bestaande events `pim:open-settings`, `pim:open-expert`, `pim:open-advanced` en `pim:open-diagnostics` blijven werken en zetten het juiste tabblad.
- `StatusFooter.tsx` houdt alleen de statusregel (versie, lokale modus). Geen knoppen meer.
- `AppHeader.tsx`: `BurgerMenu` wordt vervangen door één knop die de zijbalk opent (zelfde plek, zelfde formaat, `aria-label="Menu"`).
- `BurgerMenu.tsx` vervalt; de link- en wis-items verhuizen naar het tabblad Over. `clearAllLocalData` en het `pim:reset`-event blijven ongewijzigd.
- Tests: `sliceC.test.tsx`, `routeChrome.test.tsx`, `mobileLight.test.tsx`, `ProductShell.test.tsx`, `WriteMode.test.tsx` verwijzen naar footer-triggers en het burgermenu; die assertions worden bijgewerkt naar de nieuwe knop en het tabblad-paneel. Nieuwe test: knop opent paneel, drie tabbladen aanwezig, `pim:open-diagnostics` opent op Diagnostiek, Escape sluit.
- Verificatie: typecheck, volledige testsuite, en een Playwright-check op 390px en 1280px die het paneel opent, per tabblad screenshot maakt en controleert dat de footer geen knoppen meer bevat.
