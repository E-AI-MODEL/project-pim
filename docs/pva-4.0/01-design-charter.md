# Design Charter — Project PiM

> Eén vast design-systeem voor de hele applicatie. Geen drie kleurpaletten meer, geen negen plaatsen met model-status, geen nestpoppen-monitors. Dit charter is het referentiepunt voor alle UI-wijzigingen vanaf nu.

**Status**: bindend vanaf eerste refactorsprint
**Geldigheidsgebied**: alle routes (`/`, `/schrijven`, `/try`, `/trust`, `/pipeline`, en het nieuwe `/dashboard`)
**Referentie-implementatie**: `/schrijven` — deze omgeving is het uitgangspunt; de rest wordt hiernaar getrokken

---

## 1. Waarom dit charter bestaat

De huidige repo bevat **drie concurrerende design-systemen** die door elkaar worden gebruikt. De homepage gebruikt een "Navy Trust"-palet met hardcoded hex-kleuren (`#0f1b3d`, `#1e3a5f`, `#3b6fa0`) gedefinieerd in `.pim-landing` in `styles.css` (regel 247-266). De routes `/try`, `/trust`, `/pipeline` gebruiken een oklch-gebaseerd "Dark Tech"-systeem met glow-shadows gedefinieerd in `:root` (regel 98-157). shadcn-componenten vallen terug op een derde neutraal palet gedefinieerd in `.dark` (regel 159-192). Tel daarbij op dat elk van de ~9 componenten die BERT-status tonen een eigen visuele behandeling heeft (LED-dot, stipje, icoon, badge, knop), en het resultaat is dat een gebruiker bij navigatie tussen pagina's het gevoel krijgt op een andere site te belanden.

Dit charter vervangt die drie systemen door één systeem en definieert vast welke patronen we gebruiken voor status, model-status, actie-knoppen en formulieren. Het doel is niet esthetische perfectie — het doel is dat een docent die van de homepage naar de schrijfmodus navigeert niet meer het gevoel heeft dat de app "verandert". Visuele consistentie is geen luxe; het is een voorwaarde voor vertrouwen in een privacy-tool.

Het charter is geenmenu van suggesties. Wie een nieuw component bouwt of een bestaand component aanpast, volgt deze tokens en patronen. Afwijkingen worden alleen geaccepteerd met een expliciete reden in de PR-beschrijving.

---

## 2. Referentie: de schrijfomgeving

`/schrijven` is de stilistische gids. Concreet betekent dit:

- **Sticky header** bovenaan (logo links, status + menu rechts) — 56px hoog, geen glow, dunne bottom-border.
- **Eén hoofdpaneel** per pagina: de editor in een grote card met voldoende padding (24px) en een subtiele border (`border-white/10`).
- **Toolbar** direct boven het hoofdpaneel, compact, alleen iconen, geen labels op desktop.
- **Geen glow-shadows.** Geen neon-cyan. Geen pulse-animaties op statische elementen.
- **IBM Plex Mono** voor technische details (status-labels, IDs, hashes), **Inter** voor UI-tekst, **Space Grotesk** is optioneel voor titels maar niet verplicht.
- **Donker thema als default.** Geen light-theme ondersteuning in deze refactor — dat is apart werk.

Elke andere pagina wordt naar dit referentiepunt getrokken, niet andersom. Dat betekent concreet dat de glow-shadows in `styles.css` (regel 138-143, `--shadow-glow`, `--shadow-glow-cyan`, etc.) worden verwijderd en dat het `.pim-landing` block (regel 247-266) wordt afgeschaft.

---

## 3. Kleurenpalet (énkel, bindend)

Het palette is gebaseerd op het bestaande oklch-systeem maar **vereenvoudigd tot vijf kleurfamilies**. Hardcoded hex-kleuren in componenten (`#0f1b3d`, `#1e3a5f`, `#3b6fa0`, `#e8edf3`, `#3b6fa0/30`, etc.) worden allemaal vervangen door tokens.

### 3.1 Token-tabel

| Token | Light-waarde | Dark-waarde (default) | Gebruik |
|---|---|---|---|
| `--bg` | `oklch(0.98 0.005 250)` | `oklch(0.16 0.04 250)` | Pagina-achtergrond |
| `--surface` | `oklch(0.96 0.008 250)` | `oklch(0.21 0.045 252)` | Cards, panelen |
| `--surface-2` | `oklch(0.92 0.01 250)` | `oklch(0.26 0.05 252)` | Ingebedde blokken, toolbars |
| `--border` | `oklch(0.88 0.01 250 / 0.6)` | `oklch(0.55 0.10 230 / 0.30)` | Subtiele borders |
| `--border-strong` | `oklch(0.78 0.02 250 / 0.7)` | `oklch(0.65 0.12 230 / 0.45)` | Focus-border, actieve tab |
| `--fg` | `oklch(0.20 0.02 250)` | `oklch(0.96 0.015 230)` | Primaire tekst |
| `--fg-muted` | `oklch(0.45 0.02 250)` | `oklch(0.72 0.03 230)` | Secundaire tekst, labels |
| `--accent` | `oklch(0.55 0.16 230)` | `oklch(0.78 0.16 230)` | Primaire actie, links, focus-ring |
| `--accent-fg` | `oklch(0.98 0.005 250)` | `oklch(0.13 0.04 250)` | Tekst op accent-kleur |
| `--ok` | `oklch(0.55 0.18 145)` | `oklch(0.82 0.18 145)` | ALLOW, self-test pass, "veilig" |
| `--warn` | `oklch(0.65 0.16 70)` | `oklch(0.82 0.16 70)` | ALLOW_WITH_WARNING, "let op" |
| `--danger` | `oklch(0.55 0.22 25)` | `oklch(0.70 0.22 25)` | BLOCK, foutmelding |
| `--code` | `oklch(0.30 0.02 250)` | `oklch(0.85 0.04 230)` | Monospace tekst |

### 3.2 Wat verdwijnt

- `--cyan`, `--orange`, `--purple`, `--green`, `--red` als *aparte* accenten — ze worden vervangen door `--accent`, `--ok`, `--warn`, `--danger`. Purple verdwijnt helemaal; het werd alleen gebruikt voor de "Processing"-stap in `pipeline.tsx` en kan daar worden vervangen door `--accent`.
- Alle `--shadow-glow*` variabelen — geen glow meer.
- Alle `--gradient-*` variabelen — geen gradient-achtergronden meer. De body krijgt een effen `--bg`.
- De `.pim-landing` kleur-override in `styles.css`.

### 3.3 Contrast-regel

Alle tekst moet WCAG-AA behalen op de ondergrond waarop het staat. Dat betekent in de praktijk:
- `--fg` op `--bg` of `--surface`: altijd toegestaan.
- `--fg-muted` op `--bg` of `--surface`: toegestaan voor ≥14px tekst en ≥400 weight.
- `--fg-muted` op `--surface-2`: alleen voor labels ≤12px, niet voor body-tekst.
- Tekst op `--accent`: altijd `--accent-fg`, nooit `--fg` direct.

---

## 4. Typografie

Eén font-stack voor UI, één voor monospace. De huidige mix van Libre Baskerville + IBM Plex Sans + IBM Plex Mono + Space Grotesk + Inter + JetBrains Mono (zes families) is te veel.

### 4.1 Stacks

| Naam | Stack | Gebruik |
|---|---|---|
| UI | `'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif` | Alle UI-tekst, body, knoppen, labels |
| Display | `'Inter', ui-sans-serif, system-ui, sans-serif` (gewicht 700, tracking -0.01em) | Titels — geen aparte display-font meer |
| Mono | `'IBM Plex Mono', ui-monospace, monospace` | IDs, hashes, status-codes, technische details |

Libre Baskerville, Space Grotesk en JetBrains Mono worden uit `styles.css` verwijderd. De imports in `styles.css` regel 5-23 worden teruggebracht tot: Inter (400/500/600/700) en IBM Plex Mono (400/500).

### 4.2 Schaal

Vast grid, geen willekeur. Alle groottes zijn `rem`-gebaseerd.

| Token | Waarde | Gebruik |
|---|---|---|
| `--text-xs` | 0.75rem (12px) | Chips, mono-labels, hint-tekst |
| `--text-sm` | 0.875rem (14px) | Body in dichte panelen, secundaire tekst |
| `--text-base` | 1rem (16px) | Default body |
| `--text-lg` | 1.125rem (18px) | Subtitels, belangrijke body |
| `--text-xl` | 1.25rem (20px) | Sectie-titels |
| `--text-2xl` | 1.5rem (24px) | Pagina-titel |
| `--text-3xl` | 2rem (32px) | Hero-titel (alleen homepage) |

### 4.3 Gewicht

Vier gewichten: 400 (body), 500 (labels, knoppen), 600 (subtitels), 700 (titels). Geen 300, geen 800, geen 900. De huidige `font-black` in `RiskGauge.tsx` regel 46 wordt `font-bold`.

---

## 5. Spacing, hoeken, borders

Vier-punts grid. Eén basis-radius. Eén border-stijl.

| Token | Waarde |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--radius-sm` | 6px |
| `--radius` | 10px (enige card-radius) |
| `--radius-pill` | 999px (alleen chips en status-dots) |
| `--border-w` | 1px |

De huidige `--radius: 0.875rem` (14px) is te veel — cards zien eruit als zachte talkshow-bankjes. 10px is strakker en sluit aan bij de schrijfomgeving (`WriterShell` gebruikt `rounded-[1.75rem]` voor de editor-card, wat we ook naar 10px brengen). De cascade met `--radius-sm/md/lg/xl/2xl/3xl/4xl` uit `styles.css` regel 47-54 wordt vervangen door slechts `--radius-sm` en `--radius`.

---

## 6. Status-patroon: één StatusPill

Er zijn momenteel drie componenten die "is PiM OK?" proberen te beantwoorden: `LocalStatusPill`, `TrustBadge`, en de "Live"-tab in `LiveTechMonitor`. Die worden samengevoegd tot één pattern: een **StatusPill** in de header die altijd zichtbaar is, en een detail-paneel dat alleen in het dashboard zit.

### 6.1 StatusPill (header, altijd zichtbaar)

- Klein (24px hoog), pill-vorm, alleen een dot + label.
- Drie toestanden:
  - **OK** (groene dot, "Lokaal actief") — self-test pass, geen model-mismatch.
  - **Let op** (oranje dot, "Controle nodig") — self-test fail of model-mismatch, maar pipeline draait.
  - **Starten** (grijze dot, "Starten…") — self-test loopt nog.
- Pill is een `<Link to="/dashboard">` — klik gaat naar het dashboard voor details.
- Geen popover meer op de pill zelf (de huidige `TrustBadge` popover verdwijnt; de inhoud gaat naar het dashboard).

### 6.2 StatusDetail (alleen in dashboard)

- Eén blok in de Controle-tab van het dashboard dat de volledige self-test, hardening-log en model-integriteit toont.
- Geen popover, geen sheet — gewoon een sectie op de pagina.

---

## 7. Model-status-patroon: één ModelBar

Er zijn momenteel negen plaatsen waar BERT- of Qwen-status wordt getoond of bediend. Die worden allemaal vervangen door één pattern: een **ModelBar** die alleen in het dashboard staat, plus een read-only mini-indicator in de header van `/schrijven` en `/` (geen knop, alleen tekst).

### 7.1 ModelBar (alleen in dashboard, boven de tabs)

Eén horizontale balk met twee cards naast elkaar: Naamherkenning (BERT) en Herschrijver (Qwen). Per card:
- Titellinks + status-dot rechts (uit / laden / werkt / fout).
- Eén regel uitleg.
- Eén actie-knop rechts ("Laden" of "Opnieuw" of "Werkt" — disabled-state).
- Geen variant-picker in de card zelf — die zit in de Instellingen-tab.

### 7.2 Mini-indicator (schrijfmodus, header)

In `/schrijven` komt onder de paginatitel één regel: `"Naamherkenning: 100 MB · werkt"` of `"Naamherkenning: uit — alleen patroonherkenning"`. Geen knop. Wie het model wil aanpassen klikt op "Instellingen" → dashboard.

### 7.3 Wat verdwijnt

- `LocalModelStrip` in `StartGoShell.tsx` (regel 150-157) — verwijderen.
- BERT-sectie in `AdvancedPanel.tsx` (regel 175-202) — verhuizen naar dashboard Instellingen-tab.
- `WriterStatusBar` in `WriterShell.tsx` (regel 216-227) — wordt de mini-indicator, zonder "Zet aan"-knop.
- `LiveTechMonitor`-sheet met "Modellen"-tab — verwijderen; inhoud gaat naar dashboard Log-tab + Instellingen-tab.
- `NerVariantPicker` als standalone component — wordt onderdeel van de Instellingen-tab.
- Eigen BERT-strip in `try.tsx` — verwijderen; `/try` verdwijnt als route.

---

## 8. Actie-knoppen-patroon

Eén set knop-stijlen, drie varianten, geen glow.

### 8.1 Varianten

| Variant | Gebruik | Stijl |
|---|---|---|
| `primary` | Hoofdactie per pagina | `bg-accent text-accent-fg`, radius `--radius`, padding `12px 20px`, gewicht 500 |
| `secondary` | Nevenactie (kopieer, download) | `bg-transparent border-border text-fg`, zelfde afmetingen |
| `ghost` | Toolbar-acties, icon-only | `bg-transparent text-fg-muted hover:bg-surface-2`, geen border, 32px vierkant |

### 8.2 Regels

- Eén `primary` per pagina of per panel. Als er twee even belangrijk lijken, is het ontwerp fout.
- `secondary` knoppen staan rechts van de `primary` met 8px tussenruimte.
- `ghost` knoppen staan in toolbars, altijd icon-only op desktop, met `aria-label`.
- Geen `shadow-[0_0_24px_oklch(...)]` glow op knoppen — dat was in `InputPanel.tsx` regel 82 en verdwijnt.
- Disabled-knoppen krijgen `opacity-50 cursor-not-allowed`, geen andere kleur.

### 8.3 Lock-indicator

Als de gebruiker de "lock"-modus heeft aangezet (zie implementation-guide §5), krijgen alle geblokkeerde knoppen een slot-icoon links van het label, plus `title="Strikte modus staat aan — zet naamherkenning aan om vrij te geven"`. Dit vervangt de huidige situatie waarin BERT-uit silent blokkeert zonder dat de gebruiker begrijpt waarom.

---

## 9. Formulieren-patroon

Eén stijl voor toggles, switches, selects en inputs.

- **Toggle (aan/uit)**: `Switch` uit shadcn, maar met `--accent` als "aan"-kleur. Geen andere kleuren.
- **Segmented control (3 opties)**: drie knoppen naast elkaar in een container met `border-border` en `--radius-sm`. Actieve knop krijgt `bg-accent text-accent-fg`. Dit vervangt de huidige `BertOption`-kaarten in `AdvancedPanel.tsx` (regel 207-221).
- **Select**: shadcn `Select`. Geen native `<select>` meer (de huidige in `ModeTargetBar.tsx` regel 33 en `InputPanel.tsx` regel 322 is inconsistent).
- **Text input / textarea**: `bg-surface-2 border-border radius --radius-sm`. Focus-ring is `--accent` met 2px outline.

---

## 10. Layout-patronen

### 10.1 Pagina-breedte

| Type | Max-breedte |
|---|---|
| Homepage `/` | 1280px (twee kolommen: copy + monitor) |
| Schrijfmodus `/schrijven` | 1152px (editor dominant) |
| Dashboard `/dashboard` | 1440px (tabs met veel content) |
| Info-pagina's (`/over`, `/compliance`) | 768px (leesbaar) |

### 10.2 Pagina-structuur

Elke pagina heeft:
1. Sticky header (56px, zie §2).
2. Optionele paginatitel + subtitel (alleen op dashboard en info-pagina's; niet op homepage en schrijfmodus, die direct in de actie gaan).
3. Hoofdcontent.
4. Geen footer op homepage en schrijfmodus. Dashboard heeft een compacte status-footer.

### 10.3 Cards

Eén card-stijl. `bg-surface border border-border rounded-[--radius] p-[--space-6]`. Geen `panel-glow`, geen `shadow-2xl`, geen gradient-background. De huidige `.panel` en `.panel-glow` classes in `styles.css` regel 206-218 worden één class: `.card`.

---

## 11. Animaties

Drie toegestane animaties, verder niets.

| Animatie | Wanneer | Duur |
|---|---|---|
| `fade-in` | Resultaat verschijnt, panelen worden zichtbaar | 150ms ease-out |
| `pulse-dot` | Status-dot op "laden" of "live" | 2s infinite |
| `spin` | Loader-iconen | 1s linear infinite |

Verboden:
- `animate-ping` op status-dots (te druk).
- Glow-pulse op cards.
- Slide-in animaties voor modals (gewoon direct tonen).
- Hover-animaties die meer doen dan `background-color` veranderen.

De huidige `animate-ping` in `PipelineTimeline.tsx` regel 67 (cyan ping-ring bij "hot" steps) wordt verwijderd. De pulse-dot op de status-footer in `MonitorShell.tsx` regel 29 mag blijven.

---

## 12. Donker thema als enige

Deze refactor levert geen light-theme op. De `.dark` override in `styles.css` blijft als enige actief; de `:root` light-waarden blijven staan voor toekomstig gebruik maar worden niet getest. Componenten hoeven dus geen `dark:` prefixes te gebruiken — alles wat we bouwen is donker.

Dit is een pragmatische keuze: light-theme ondersteunen zou elke component-aanpassing verdubbelen, en de schrijfomgeving (referentie) is ook donker. Light-theme kan in een latere sprint worden toegevoegd mits het volledig is.

---

## 13. Migratie-aanpak

Dit charter wordt niet in één PR doorgevoerd. De aanpak is:

1. **Tokens toevoegen** bovenop bestaande tokens (geen bestaande verwijderen). Nieuwe componenten gebruiken de nieuwe tokens; oude blijven werken.
2. **Per component** dat wordt aangeraakt, vervang je hardcoded kleuren door tokens. Dit gebeurt in de refactorsprints die in `03-refactor-plan.md` staan.
3. **Pas als alle componenten** zijn gemigreerd, verwijderen we de oude tokens (`--cyan`, `--orange`, `--purple`, `--shadow-glow*`, `--gradient-*`) en de `.pim-landing` override.

Dit voorkomt een big-bang PR die alles tegelijk breekt.

---

## 14. Acceptatiecriteria

Een component voldoet aan dit charter als:

- [ ] Het gebruikt uitsluitend tokens uit §3 en §5 — geen hardcoded hex of oklch-waarden in de component.
- [ ] Het gebruikt een van de drie knop-varianten uit §8 — geen eigen knop-stijl.
- [ ] Als het status toont, gebruikt het de StatusPill of ModelBar pattern uit §6 en §7.
- [ ] Als het animatie heeft, is het een van de drie uit §11.
- [ ] Het werkt op max-breedte uit §10 zonder horizontale scroll op 1280px.
- [ ] Het heeft geen glow-shadows, geen gradients, geen `ping`-animatie.

Code-review checkt deze lijst voordat een PR wordt gemerged.

---

## 15. Volgende stappen

- Dit charter wordt in de repo opgeslagen op `docs/DESIGN_CHARTER.md`.
- `02-ui-ux-audit.md` bevat per component welke charter-regels worden geschonden en met welke prioriteit.
- `03-refactor-plan.md` bevat de gefaseerde migratie.
- `04-implementation-guide.md` bevat concrete code-stappen, inclusief het lock-principe.
