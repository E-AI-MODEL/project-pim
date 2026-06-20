## Probleem

Op mobiel komt de Live Monitor pas in beeld na de hero + alle vier USP-blokken (~1000px scrollen). Bezoekers zien alleen uitleg en concluderen "er werkt niks". De Anoniem/Pseudoniem-knoppen werken wel — ze togglen state — maar zonder zichtbare demo en zonder tekst is dat onzichtbaar.

## Fix (klein, alleen layout & volgorde)

### 1. Mobiele volgorde omdraaien — demo eerst

In `src/routes/index.tsx`: gebruik flex-order zodat op mobiel de monitor bovenaan staat (direct na de eyebrow + korte kop), en de USP-grid eronder. Op `lg:` herstellen we de huidige naast-elkaar-layout.

Schema mobiel:
```text
EYEBROW
H1 + sub        ← korter zichtbaar boven de vouw
LIVE MONITOR    ← meteen probeerbaar
USP-grid (4)
anon vs pseudo strip
```

Concreet:
- Buitenste grid blijft `lg:grid-cols-2`.
- Linker-kolom (hero+USPs) en rechter-kolom (Monitor) krijgen `order` classes: op mobiel `order-2` voor USPs, hero blijft order-1, Monitor `order-2` tussen hero en USPs. Op `lg:` alles terug naar originele plek.
- Praktisch splitsen: hero (header met eyebrow+H1+sub) als eigen blok `order-1`, MonitorShell `order-2 lg:order-3`, UspGrid `order-3 lg:order-2`. Op desktop met `lg:grid` blijft links/rechts hetzelfde door grid-area logica.

Simpelste vorm: op mobiel gewoon DOM-volgorde aanpassen via wrapping — buiten `lg`-breakpoint stack ik: `<Header /> <MonitorShell /> <UspGrid />`. Op `lg+` toon ik de tweekolomslayout met linker `<Header />+<UspGrid />` en rechter `<MonitorShell />`.

Implementatie: render hero apart, en gebruik twee containers:
- mobiele stack (`lg:hidden`): Header → Monitor → UspGrid → Strip
- desktop split (`hidden lg:grid lg:grid-cols-2`): links Header+UspGrid, rechts Monitor; strip eronder

Dubbele markup voor Header/UspGrid/Monitor is OK — het zijn presentatiecomponenten, geen state. Wacht — Monitor bevat StartGoShell met React-state. Twee instanties = twee aparte states. Daarom NIET dupliceren: gebruik één DOM-boom en stuur volgorde via Tailwind `order-*` op grid-items binnen één grid die op mobiel `grid-cols-1` is.

Definitieve aanpak (één instantie, order via Tailwind):
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
  <header className="order-1 lg:order-1 lg:col-start-1">…hero…</header>
  <div   className="order-2 lg:order-2 lg:col-start-2 lg:row-span-2">
    <MonitorShell />
  </div>
  <div   className="order-3 lg:order-3 lg:col-start-1">
    <UspGrid />
  </div>
</div>
```
Op mobiel: 1 kolom, volgorde Header → Monitor → USPs. Op desktop: links Header boven USPs (col 1, twee rijen), rechts Monitor (col 2, span 2 rijen). Dit is exact het huidige desktop-uiterlijk, maar mobiel staat Monitor nu direct onder de hero.

### 2. Hero compacter op mobiel zodat Monitor sneller in beeld komt

- H1 op mobiel: `text-2xl` i.p.v. `text-[2rem]` (~24px → kop past op één regel).
- Sub op mobiel inkorten met `line-clamp-3` of gewoon korter laten zien — geen wijziging copy nodig.
- Vertical padding terug: `py-6 sm:py-10 lg:py-20`.

### 3. Lege-staat hint in Monitor

Als de textarea leeg is, toon één rustige regel onder de voorbeeldknoppen: "Kies een voorbeeld of typ je eigen tekst om PiM te zien werken." Zo voelt het meteen interactief; de Anoniem/Pseudoniem-knoppen krijgen ook context.

Wijziging in `src/components/pim/start-go/InputPanel.tsx` (compact-variant): toon `emptyHint` onder ExamplePicker wanneer `text.trim().length === 0`. Nieuwe string in `copy.ts`: `monitorEmptyHint`.

## Bestanden

- `src/routes/index.tsx` — grid met order/row-span, compactere hero op mobiel
- `src/components/pim/start-go/InputPanel.tsx` — lege-staat-hintregel (alleen in compact)
- `src/lib/pim/copy.ts` — `monitorEmptyHint` string toevoegen

## Niet aanraken

Logica van Anoniem/Pseudoniem (werkt al). Desktop-uiterlijk (blijft identiek). Andere routes.

## Validatie

Playwright op 393×588 (smal & kort) en 1440×900:
- Mobiel: Monitor zichtbaar binnen één scroll na de hero. Klik op "Mentor-notitie" → verdict-card verschijnt. Toggle Pseudoniem → verdict update.
- Desktop: layout ongewijzigd t.o.v. huidige screenshot.
