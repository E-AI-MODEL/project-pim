## Doel

Landingspagina (`/`) compleet herbouwen volgens richting C ("Console"). Rust, vertrouwen, simpele taal, strakke gridverdeling. Werkende demo blijft live aangesloten op de bestaande PiM-engine — alleen presentatie en taal veranderen.

## Designtokens (LOCKED)

In `src/styles.css` vastleggen, daarna overal via tokens gebruiken (geen hardcoded hex in componenten):

- `--background: #0f1b3d` (deep navy)
- `--surface: #1e3a5f` (demo card)
- `--accent: #3b6fa0` (blauw)
- `--foreground: #e8edf3` (off-white)
- `--font-display: "Libre Baskerville", serif` (koppen)
- `--font-sans: "IBM Plex Sans", sans-serif` (body)
- `--font-mono: "IBM Plex Mono", monospace` (1 detail, status-pill)

Fonts laden via `<link>` in `src/routes/__root.tsx` (Tailwind v4 regel — geen CSS @import).

## Layout (desktop ≥1024px)

```text
┌────────────────────────────┬─────────────────────────────┐
│ EYEBROW (small caps)       │  ┌─ LIVE MONITOR ───────┐  │
│                            │  │ [Schoon][Mentor][Zorg]│ │
│ H1 serif, kort, 2 regels   │  │                       │  │
│                            │  │  textarea             │  │
│ Sub, 1 zin, simpel         │  │                       │  │
│                            │  │  ─ verdict-card ─     │  │
│ ─ 2×2 grid USPs ─          │  │                       │  │
│ Lokaal      │ Dubbele      │  │  [primaire actie]     │  │
│ ────────────┼──────────    │  └───────────────────────┘  │
│ Verdict     │ Egress Guard │   Local Guard Active        │
└────────────────────────────┴─────────────────────────────┘
        ──── anoniem vs pseudoniem mini-strip ────
```

Mobiel: stack, demo eerst, USPs daarna, mini-strip onderaan. Hero past binnen 1 scherm op desktop.

## Tekst (eindversies — taalpas)

**Eyebrow**: `PRIVACY INTEGRITY MONITOR`

**H1** (serif, 2 regels):

> Controleer je tekst op privacy,
> voordat je hem deelt.

**Sub** (1 zin, simpel):

> PiM leest mee in je browser, herkent gevoelige gegevens en zegt of je veilig kunt delen, alles gebeurt lokaal zonder moeilijke technische stappen. 

**USPs** (4 stuks, korte titel + 1 zin):

1. **Niets verlaat je apparaat** :De controle gebeurt in je browser. Geen upload, geen server, geen log van je tekst.
2. **Anoniem of pseudoniem** : Anoniem maakt namen definitief onleesbaar. Pseudoniem vervangt ze door codes, met een sleutel die alleen jij hebt.
3. **Uitleg per rol** : Eén drie lezingen: wat het voor jou betekent, voor je organisatie, en voor je tech-collega.
4. **Egress Guard**: PiM stuurt nooit gegevens door maar zet alles klaar voor de gebruiker die na goedkeuring tekst stuurt naar een LLM. kan 

**Demo-kaart**:

- Header pill: `LIVE MONITOR` (mono, small-caps)
- Voorbeeldknoppen: `( zoek ander sooorr wordt voor schoon)` , `Mentor-notitie`, `Zorgnotitie`
- Textarea placeholder: `Plak hier je tekst, of kies een voorbeeld hierboven.`
- Primaire knop: `Controleer deze tekst`
- Status-footer: `Local Guard actief` met groene dot
- Verdict-card states (groen/oranje/rood) gebruiken bestaande engine-output, met uitlegregels uit `copy.ts`

**Mini-strip onderaan** (1 regel, kalm):

> Anoniem = onomkeerbaar. Pseudoniem = omkeerbaar, maar alleen op dit apparaat. Jij kiest per tekst waar je gebruik van wil maken. 

## Bestanden

**Nieuw / herschreven:**

- `src/routes/index.tsx` — volledige herstructurering naar split-screen Console-layout
- `src/components/pim/start-go/UspGrid.tsx` — nieuwe 2×2 USP-grid (presentatie, geen logic)
- `src/components/pim/start-go/MonitorShell.tsx` — frame om bestaande demo (window header, footer-status). Bevat de bestaande `InputPanel` / `ResultPanel` componenten ongewijzigd.
- `src/components/pim/start-go/AnonPseudoStrip.tsx` — mini-uitleg-strip onderaan

**Aangepast (alleen tekst + tokens):**

- `src/lib/pim/copy.ts` — alle hero/USP/demo-strings vervangen door bovenstaande versies
- `src/components/pim/start-go/StartHeader.tsx` — eyebrow + nieuwe serif H1
- `src/components/pim/start-go/InputPanel.tsx` — placeholder + knop-label, geen logic-wijziging
- `src/components/pim/start-go/SafetyVerdictCard.tsx` — alleen styling naar tokens, 1-regel uitleg per rol
- `src/styles.css` — design tokens hierboven, `@theme inline` mapping, hairline-divider utility

**Niet aanraken:**

- Detectie/policy/engine onder `src/lib/pim/` (logic blijft 1:1)
- Andere routes (`/over`, `/try`, `/compliance`, etc.) — apart traject

## Validatie

1. Build via auto-typecheck van het systeem
2. Playwright screenshot op 1440×900 (desktop) en 393×800 (mobiel) → visueel checken: hero binnen 1 scherm, geen overflow, demo-card uitgelijnd, hairlines zichtbaar, fonts geladen
3. Klikken op `Mentor-notitie` voorbeeld → verdict-card verschijnt oranje met de juiste uitlegregels
4. Console-log check: geen font-load errors, geen unknown utility class

## Wat dit oplost

- "Niemand snapt wat je hier moet doen" → demo staat direct rechts met 3 klikbare voorbeelden en zichtbare verdict
- "Schoon zorg notitie is vaag" → labels worden `Schoon`, `Mentor-notitie`, `Zorgnotitie` (drie aparte knoppen, niet aan elkaar geplakt)
- "Eerst veilig dan delen is raar" → H1 wordt expliciete instructie in plaats van slogan
- "Onderscheidende elementen ontbreken" → 2×2 grid noemt expliciet wat anderen claimen maar niet leveren (lokaal, dubbele bescherming, uitleg per rol, egress guard)
- "Anoniem vs pseudoniem uitleggen" → eigen USP + mini-strip onderaan
- "Rust en vertrouwen, compacter, ander palet" → Navy Trust + Libre Baskerville + hairlines + alles boven de vouw