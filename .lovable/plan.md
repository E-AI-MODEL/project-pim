# Project PiM — actuele plan-status

## Fase 2 — afgerond

- Centrale Evaluation Engine (`src/lib/pim/engine/*`) is de enige publieke
  API voor UI: `usePimEngine` levert `state`, `evaluate`, `previewDecision`,
  `requestAction`, `reset`.
- `try.tsx`, `StartGoShell` en `WriterShell` (nu `WriterWorkspace`) zijn
  gemigreerd naar de engine; geen eigen `policy`/`risk`/`processing`/
  `egressGuard`-imports meer in normale UI-code.
- React-integratie is gestabiliseerd: `useCallback`-commando's, geen
  `evaluate()` in `useMemo`, geen engine-side-effects tijdens render.
- UI-importgrens wordt door ESLint afgedwongen (`eslint.config.js`,
  regel `no-restricted-imports` op `src/routes/**` en `src/components/**`).
- Testsuite dekt engine, parity per oude shell (try/startGo/writer) en
  React-hookintegratie.
- Afwijkingen van het oorspronkelijke plan: `evaluate()` blijft synchroon
  en returneert `EngineState` in plaats van `Promise<EngineState>`; dit
  matcht de daadwerkelijke pipeline en vermijdt onnodige awaits in UI.

## Fase 3 — huidige stand

Alle onderstaande slices staan op `main`:

- **Slice A — ProductShell-frame** ✅
  - `/app` route met `?mode=quick|start|write` als bron van waarheid.
  - Gedeelde `AppHeader`, `StatusFooter`, `ModeSwitcher` in
    `src/components/pim/product/`.
  - Één `usePimEngine`-instance op shellniveau.
- **Slice A.1 — technische opschoning** ✅
  - `@tanstack/zod-adapter` verwijderd; lokale `validateAppSearch`.
  - `usePimEngine`-resultaat gedestructureerd; reset-effect hangt alleen
    van `reset` af.
  - Context biedt expliciete velden, geen wrapper-object.
- **Slice B — echte editor en redirects** ✅
  - `WriteMode` host de echte `WriterWorkspace` (voorheen `WriterShell`).
  - `/try` en `/schrijven` zijn router-native redirects naar
    `/app?mode=quick` respectievelijk `/app?mode=write`.
  - Editorinhoud wordt in `ProductShellContext.writerContent` gecached
    zodat modewissel de tekst behoudt.
  - Eén gedeelde chrome (header/footer/monitor) bewezen door
    integratietests.
- **Slice C — consolidatie van technische panelen** ✅
  - Nieuw: `src/components/pim/product/ExpertPanel.tsx` — één gedeeld
    Sheet-paneel met de `AdvancedPanel`-inhoud (detectielagen, model,
    drempels, categorieën, integriteit). Writer-instellingen
    (`autoRedact`, `strict`) zijn state op ProductShell-niveau en worden
    alleen getoond in write-mode.
  - `StatusFooter` heeft twee expliciete knoppen: **Expert** (opent het
    gedeelde expertpaneel via `pim:open-expert`) en **Diagnostiek**
    (opent de `LiveTechMonitor`). Beide zijn standaard gesloten.
  - `WriterWorkspace` bevat géén `AdvancedPanel` meer; behoudt editor,
    import/export, leegmaken, live markeringen en writer-interacties.
  - `BurgerMenu`-item "Instellingen" blijft werken via de legacy
    `pim:open-advanced`-listener op `ExpertPanel`.
  - Nieuwe test: `src/components/pim/product/__tests__/sliceC.test.tsx`
    dekt één header/footer per modus, expert opent via knop en event,
    LiveTechMonitor niet permanent zichtbaar, writer-sub-paneel alleen in
    write-mode, geen lokaal `AdvancedPanel` in `WriterWorkspace`.

### Acceptatie Slice C

- `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build`
  allemaal groen; 0 lint-errors, geen nieuwe warnings.
- Normale productflow (Quick/Start/Write) toont geen permanent technisch
  dashboard. Eén expertpaneel, één diagnostiekpaneel, beide achter een
  knop.
- Geen enginegedrag, detectie, policy, egress of routes gewijzigd.

## Vervolg

Fase 3 is hiermee afgerond. Mogelijke vervolgstappen liggen buiten deze
refactor: visuele afwerking van de ProductShell, mobiele optimalisatie
en opruiming van ongebruikte oude route-pagina's die nog buiten `/app`
leven (`/pipeline`, `/modes`, enz.) mocht dat wenselijk zijn.
