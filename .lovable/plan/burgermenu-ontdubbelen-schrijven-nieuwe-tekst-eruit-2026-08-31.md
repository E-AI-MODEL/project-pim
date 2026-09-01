# Burgermenu ontdubbelen: schrijven/nieuwe tekst eruit

## Doel

Het burgermenu bevat twee items die 1-op-1 hetzelfde doen als de modetoggle bovenin het scherm. Die dubbeling verdwijnt; het menu blijft over voor alles wat de toggle níet doet.

## Controle van 1-op-1 gelijkheid (uitgevoerd)

- Menu "Zelf schrijven" → link naar `/schrijven` → `src/routes/schrijven.tsx` redirect naar `/app?mode=write`.
- Toggle "Zelf schrijven" (`ModeSwitcher.tsx` en `MobileModePicker.tsx`) → link naar `/app` met `search: { mode: "write" }`.
- **Conclusie: identiek pad en resultaat.** Menupunt is een pure dubbeling.
- Menu "Begin met een lege tekst" → `pim:reset` event + navigatie naar `/app?mode=check`. De navigatie is identiek aan toggle "Tekst nakijken"; het resetten (lege tekst + bevestiging) is de enige extra functie.

## Wijzigingen

### 1. In-screen resetknop (nieuw, vervangt het menupunt)

- `CheckMode.tsx`: knop "Nieuwe tekst" rechtsboven het tekstvlak (naast de status "Nog niet nagekeken"). Actie = bestaande `pim:reset` event, met dezelfde bevestigingsdialoog als er schrijfinhoud aanwezig is (hergebruik van de bestaande `data-pim-writer-has-content` flag).
- `WriteMode.tsx`: dezelfde knop in de schrijfruimte, zodat resetten vanuit beide schermen kan.
- Gedrag identiek aan het oude menupunt: reset engine + invoer, focushint op het tekstveld.

### 2. Burgermenu ontdubbelen

`src/components/pim/start-go/BurgerMenu.tsx`:

- Verwijder item "Begin met een lege tekst" (kind `new-text`) uit PRIMARY.
- Verwijder item "Zelf schrijven" uit PRIMARY.
- PRIMARY blijft: **Instellingen** en **Over Project PiM**.
- Groep "Expert & diagnostiek" (ingeklapt) blijft volledig ongewijzigd.
- Opruimen wat daardoor ongebruikt wordt: `handleNewText`, het `new-text` itemtype, `_LEGACY_GROUPS` (al ongebruikt), en ongebruikte icon-imports (`FilePlus2`, `PenLine`).

## Gevolg

- Resetten blijft volledig behouden, nu als zichtbare knop in het scherm in plaats van verstopt in het menu.
- `handleClearStorage`, Escape-handler en portal blijven onaangeraakt.

## Verificatie

- `twoModes.test.tsx` en `sliceC.test.tsx` draaien; test die `menu-new-text` gebruikt (indien aanwezig) wordt aangepast of verwijderd.
- Typecheck + volledige testrun + build groen.
- Visuele check van het menu in de preview (desktop en mobiel).
