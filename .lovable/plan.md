# Fase 3, slice A — Product-Shell frame op `/app`

Doel: één nieuw productframe waarin de nuttige delen van `try`, `start-go` en `schrijven` samenkomen. Geen tabstrip om drie oude shells; wél één gedeelde chrome + engine-state, met drie modi als **inhoudsvlak**.

Deze slice bouwt het frame, de mode-router en de eerste twee modi. Slice B vervangt oude routes door redirects en verwijdert doublures. Slice C sloopt overtollige technische panelen.

## Scope slice A

### Route

- Nieuw: `src/routes/app.tsx` — `createFileRoute("/app")`, `validateSearch` met `mode: "quick" | "start" | "write"` (default `"quick"`, via `fallback`).
- Één component `ProductShell` als hoofdscherm.
- `head()` met eigen title/description per mode via `useSearch` in een klein `<ModeHead />` sub-component.

### Frame (één keer, gedeeld voor alle modi)

Uit huidige onderdelen, ontdubbeld:

```text
┌─ AppHeader ────────────────────────────────────────────────┐
│  PiM-logo · ModeSwitcher (Snel / Start & Go / Schrijven)   │
│                          BurgerMenu · TrustBadge · Pill    │
├─ ModeContext bar ──────────────────────────────────────────┤
│  ModeTargetBar (anon/pseudo · doel) — voor quick + write    │
├─ Content ──────────────────────────────────────────────────┤
│                        <ModePane />                        │
├─ StatusFooter ─────────────────────────────────────────────┤
│  LocalStatusPill · LiveTechMonitor · versie                │
└────────────────────────────────────────────────────────────┘
```

- Header, footer, TrustBadge, LiveTechMonitor, BurgerMenu, PipelineStepsBar
  komen **één keer** hier terecht en worden niet meer door de modi
  opnieuw gerenderd.
- Één `usePimEngine(config)` op `ProductShell`-niveau; de modi krijgen
  `engine` + `state` via props (of via een lichte `ProductShellContext`).
  Geen aparte engine-instances per modus.

### Modes (slice A)

- `QuickMode` — plakken → engine.evaluate → RiskBanner + ResultPanel +
  ResultActions. Bouwt op de bruikbare `InputPanel` / `ResultPanel` /
  `FindingChips` / `SafetyVerdictCard` uit `start-go`, zonder StartHeader,
  UspGrid en promo-blokken van `/try`.
- `StartMode` — de begeleide zes-stappen weergave: `PipelineStepsBar` +
  `PipelineTimeline` + huidige stap-detail. Hergebruikt `StartGoShell`'s
  pipeline-visualisatie maar niet zijn eigen header/footer/monitor.
- `WriteMode` — placeholder-paneel met kopregel "In voorbereiding —
  opent nog `/schrijven`" en een `<Link to="/schrijven">`. Vermijdt
  duplicatie van de WriterShell-editor in deze slice (grote refactor,
  volgt in slice B).

Modeschakelaar zet `search.mode` via `<Link to="/app" search={{ mode }}>`;
geen lokale useState, zodat URL de bron van waarheid is.

### Non-goals slice A

- Oude routes (`/try`, `/start-go` bestaat nu als deel van index/monitor,
  `/schrijven`) blijven **bestaan en werken**. Geen redirects in deze
  slice — dat komt in slice B nadat WriteMode echt de editor host.
- Geen nieuwe visuele taal. Bestaande tokens en componenten hergebruiken.
- Geen wijziging aan engine, detectie, policy of tests.
- `index.tsx` (landing) blijft; krijgt alleen een primaire CTA naar
  `/app?mode=quick`.

### Bestanden

Nieuw:
- `src/routes/app.tsx`
- `src/components/pim/product/ProductShell.tsx`
- `src/components/pim/product/AppHeader.tsx`
- `src/components/pim/product/ModeSwitcher.tsx`
- `src/components/pim/product/StatusFooter.tsx`
- `src/components/pim/product/modes/QuickMode.tsx`
- `src/components/pim/product/modes/StartMode.tsx`
- `src/components/pim/product/modes/WriteMode.tsx`

Gewijzigd:
- `src/routes/index.tsx` — primaire CTA verwijst naar `/app?mode=quick`.

Ongewijzigd in deze slice: `try.tsx`, `schrijven.tsx`, `StartGoShell`,
`WriterShell`, engine, hooks, tests.

## Acceptatie

- `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build` groen.
- `/app`, `/app?mode=quick`, `/app?mode=start`, `/app?mode=write` renderen
  zonder console-errors; ModeSwitcher wisselt via URL.
- Header, footer, TrustBadge, monitor en burger staan **precies één keer**
  in de DOM per mode (geen doublure van header of monitor).
- Geen nieuwe directe imports van `policy` / `risk` / `processing` /
  `egressGuard` / `modelGate` (eslint-regel blijft groen).
- Oude routes werken nog zoals nu.

## Vervolg (niet in deze PR)

- Slice B: WriteMode host de echte editor; `/try`, `/start-go`,
  `/schrijven` worden redirects; oude shell-bestanden verwijderd.
- Slice C: overtollige tech-panelen ontdubbelen (LiveTechMonitor,
  AdvancedPanel) en visuele afwerking Product-Shell.
