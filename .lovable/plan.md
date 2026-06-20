## Doel

De hero ("Eerst veilig. Dan pas delen." + jouw subtitel) lijkt ook taalkundig zwak, De rest van de teksten op de site is taalkundig super zwak: stijlbreuken, jargon door elkaar met spreektaal, inconsistent gebruik van "PiM" vs "we" vs passief, rare koppelingen ("mee­kijkend" met soft hyphen), en knoppen die niet doen wat ze beloven. Deze ronde is een **pure taalpass** — geen logica, geen layout, geen nieuwe features.

## Scope (alleen tekst)

### 1. `src/lib/pim/copy.ts` — herschrijven van alle strings behalve `title` + `subtitle`

- **Placeholder, knoppen, hints** consistent maken: actief, kort, één stem.
  - `placeholder`: nu een opsomming → één uitnodigende zin.
  - `startButton` "Controleer met PiM" → strakker, bv. "Controleer deze tekst".
  - `privacyHint`: nu vier losse fragmenten met `·` → één leesbare zin.
  - `liveBadge`: weghalen soft hyphen, normale spelling.
- **Verdict-zinnen** (`statusGreen/Orange/Red`) — taal gladtrekken, "deur uit" eruit, één register.
- **Drie-lagen uitleg** (`layerTeacher*`, `layerLeader*`) — docent-laag echt in docent-taal (kort, concreet, geen "AVG-minimalisatie"); bestuurder-laag bondig juridisch zonder klontering ("Fail-closed:" prefix eruit, in volzin).
- **Knoppen** (`buttonAllow/Warning/Block`) — werkwoord vooraan, beloofde actie = werkelijke actie.
- **Mode/doel-labels en hints** — "Anoniem / Pseudoniem (lokaal)" consistent uitleggen; "Waar gaat het naartoe?" → neutralere kop.
- **Status-pill** — "Lokaal actief / Beperkte detectie / Niet klaar" + tagline taalkundig op één lijn.
- **Menu-items** — uniforme stijl (zelfstandige naamwoorden, geen mix met werkwoorden); "Nieuwe test" → "Nieuwe controle", etc.

### 2. Header-microcopy `StartHeader.tsx`

Alleen het regeltje onder het logo (`Privacy Integrity Monitor`) check — ofwel laten staan ofwel vervangen door een NL-tagline. Geen JSX-structuur wijzigen.

### 3. Overige routes — taalpass op koppen, intro's en CTA's

Alleen tekstuele inhoud, geen componenten verbouwen:

- `src/routes/over.tsx`
- `src/routes/try.tsx` (Expert lab — intro + "terug"-link)
- `src/routes/trust.tsx`
- `src/routes/pipeline.tsx`
- `src/routes/modes.tsx`
- `src/routes/compliance.tsx`
- `src/routes/flags.tsx`
- `src/routes/architecture.tsx`
- `src/routes/scenarios.tsx`
- `__root.tsx` — `<title>`, meta description, OG-tags consistent in NL.

Per route: kop, ondertitel, sectiekoppen, eerste alinea, CTA-knoppen. Lange uitleg-blokken alleen aanraken als er duidelijke taalfouten of registerbreuken staan.

### 4. Stijlregels die ik consequent toepas

- **Eén stem**: PiM = "het" (product), niet "we"/"ik". Gebruiker = "je".
- **Actief boven passief**, werkwoord vroeg in de zin.
- **Geen Engels door NL** ("audit-spoor", "rules-only", "fail-closed") tenzij vakterm — dan tussen aanhalingstekens of vertaald.
- **Geen typografische trucs** (soft hyphens, `·` als zinscheider in body-tekst).
- **Knoplabel = belofte van de actie**. Geen "Controleer met PiM" als de knop "Controleer" doet.
- **Hero (title + subtitle) ongewijzigd.**

## Wat ik niet doe

- Geen componenten verplaatsen, hernoemen of nieuwe maken.
- Geen styling, geen iconen, geen layout.
- Geen wijzigingen aan policy/processing/egress/tests.

## Validatie

- `bun run typecheck` (strings only — moet schoon blijven).
- Visuele controle van `/` op mobile-viewport (393×588) via Playwright-screenshot, plus snelle blik op de overige routes om te checken dat niets visueel breekt door langere/kortere strings.