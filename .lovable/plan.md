## Wat er nu dubbel staat

**Homepage (`/` → `StartGoShell`)**
- `AdvancedPanel` (uitklap): Profiel, Gevoeligheid, Detectoren per categorie, Modellen (Expert).
- `LocalModelStrip` met daarboven een **NerVariantPicker** → variantkeuze leeft ook al in AdvancedPanel → Modellen.
- Burgermenu → "Geavanceerde instellingen" opent dezelfde `AdvancedPanel`.

**Schrijfpagina (`/schrijven` → `WriterShell`)**
- `AdvancedPanel` (recent toegevoegd): Profiel, Gevoeligheid, Detectoren, Modellen.
- `WriterToolbar` heeft een **Settings2-popover** met:
  - NER aan/uit + NER-variant kiezen (zit ook in AdvancedPanel → Modellen)
  - Per-categorie Uit / Markeer / Wis (Uit zit al in AdvancedPanel → Detectoren)
  - Strenge cijfercontrole (writer-only)

Resultaat: profielen, detectoren en NER-keuzes kun je nu op 2 plekken anders zetten, met kans op tegenstrijdige state.

## Doel

Per pagina precies **één** instellingenmenu: `AdvancedPanel`. Alle pagina-specifieke opties leven binnen dezelfde uitklap (extra props), zodat de gebruiker niet hoeft te zoeken.

## Aanpak

### 1. Homepage (`/`)
- Verwijder `NerVariantPicker` uit `LocalModelStrip`. `LocalModelStrip` blijft puur "operationeel" (model downloaden, Qwen herschrijven, status zien) — geen configuratie.
- Variantkeuze blijft enkel in `AdvancedPanel` → tab **Modellen** (al aanwezig in Expert). Promoveer dit blok ook naar de Basis-modus zodat hij vindbaar is zonder Expert-toggle.

### 2. Schrijfpagina (`/schrijven`)
- Verwijder de Settings2-popover uit `WriterToolbar` volledig. Toolbar houdt alleen formatteer-, import/export- en wis-knoppen.
- Breid `AdvancedPanel` uit met optionele writer-secties via nieuwe props (alleen renderen als props gezet zijn):
  - **Per-categorie modus** (`Uit / Markeer / Wis`) — vervangt zowel de "Detectoren-Uit"-rij als het writer-popover-blok. Op `/` bestaat alleen `Uit / Aan`; op `/schrijven` voegen we de derde stand `Wis` toe. Eén enkele lijst, één bron van waarheid.
  - **Strenge cijfercontrole** (BSN-elfproef, IBAN mod-97, kenteken, student-ID context) — alleen op `/schrijven`.
- NER aanzetten / variant kiezen verloopt op beide pagina's via de Modellen-tab van `AdvancedPanel`. `WriterShell` koppelt z'n `startNer` aan dezelfde knop.

### 3. Gedeelde gedragingen
- `pim:open-advanced` event uit het burgermenu blijft hetzelfde — opent en scrollt naar `AdvancedPanel` op de huidige pagina.
- Labeltekst van de uitklap toont per pagina hoeveel overrides actief zijn (al aanwezig); breid uit met aantal "Wis"-categorieën op `/schrijven`.

## Bestanden die wijzigen

- `src/components/pim/start-go/AdvancedPanel.tsx` — extra optionele props (`categoryMode`, `onCategoryModeChange`, `strict`, `onStrictChange`), Modellen-blok ook in Basis tonen.
- `src/components/pim/start-go/StartGoShell.tsx` — `NerVariantPicker` weghalen uit `LocalModelStrip`, panel-props ongewijzigd.
- `src/components/pim/writer/WriterShell.tsx` — Settings2-popover en bijbehorende helpers (`CategoryModeToggle`, `NerToggleRow`, NER-imports in toolbar) verwijderen, `AdvancedPanel` aanroepen met de writer-specifieke props.

## Niet in scope

- Geen wijziging aan beslislogica in `src/lib/pim/*` of aan `usePimSettings`.
- Geen UI-restyle van `AdvancedPanel` zelf — alleen inhoud uitbreiden.
- Pagina's `/try`, `/pipeline`, etc. blijven ongemoeid.
