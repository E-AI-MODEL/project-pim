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

## Slice C.1 — route-chrome herstel en menu-opruiming (in uitvoering)

Slice C was technisch groen (typecheck/lint/tests/build), maar bij de
visuele controle bleek de ProductShell in de praktijk *dubbele* chrome
te tonen: de globale `__root.tsx` render zowel `StartHeader` als
`SiteFooter` rondom élke route, inclusief `/app`. Daardoor stapelden
publieke informatie-chrome en `AppHeader`/`StatusFooter` op elkaar —
twee menuknoppen, twee statusregels, dubbele merkbadge. Dit is een
integratiefout op layoutniveau, niet iets dat één component kan
oplossen.

Wat Slice C.1 herstelt:

- **Route-chrome scheiding.** Publieke chrome is verplaatst naar een
  pathless layout `src/routes/_site.tsx`. `__root.tsx` rendert alleen
  `<Outlet />` en behoudt runtime-hardening, self-test en het
  `NotFoundComponent`. Alle informatiepagina's (`/`, `/over`, `/trust`,
  `/compliance`, `/flags`, `/pipeline`, `/modes`, `/architecture`,
  `/scenarios`) staan nu als `_site.<naam>.tsx` en erven de publieke
  header/footer. `/app`, `/try` (redirect) en `/schrijven` (redirect)
  vallen buiten de `_site`-layout en tonen dus uitsluitend de
  ProductShell-chrome. Geen `display:none`, geen pathname-check.
- **AppHeader vereenvoudigd.** `TrustBadge` verwijderd uit de vaste
  header; nu één merk-/statuslaag met `LocalStatusPill` (desktop) en
  precies één `BurgerMenu`-knop.
- **Korte moduslabels.** Segmented control gebruikt nu
  "Controleren / Begeleid / Schrijven" met `whitespace-nowrap`, zodat
  labels op smalle schermen niet meer op twee regels breken.
- **BurgerMenu opgeschoond.** Twee groepen: **Werken met tekst**
  (Nieuwe tekst, Schrijven, Instellingen, Over PiM) en een
  ingeklapte **Expert & diagnostiek** (Diagnostiek, Pipeline-uitleg,
  Modi-uitleg, Beslissingscodes, Trust, Compliance, Lokale gegevens
  wissen). Technische routes staan niet meer tussen normale
  teksttaken.
- **"Nieuwe tekst" is een echte actie.** Rename van "Nieuwe controle".
  Klik dispatcht `pim:reset` (ProductShell wist tekst, writer, engine)
  én navigeert naar `/app?mode=quick` én sluit het menu. Wanneer de
  writer inhoud heeft (body-flag `data-pim-writer-has-content=1` uit
  ProductShell) wordt eerst een `confirm` getoond, annuleren behoudt
  alles.
- **Diagnostiek achter dezelfde knop.** `LiveTechMonitor` opent nu ook
  op `pim:open-diagnostics`, zodat het BurgerMenu-item naar hetzelfde
  paneel wijst als de footer-knop; er is geen tweede monitor-instance.
- **Test.** `src/routes/__tests__/routeChrome.test.tsx` verifieert
  statisch dat `__root` geen `StartHeader`/`SiteFooter` importeert,
  `_site` die wél draagt, en `/app` uitsluitend de `ProductShell` en
  niet onder `_site` valt.

Wat expliciet buiten Slice C.1 valt en nog open staat: de volledige
visuele richting (lichte documentwerkruimte à la de bijgevoegde witte
referentie), herwerking van QuickMode-hero/actions, de vier-staps
StartMode zonder architectuurtaal, en de tweekolomseditor in
WriteMode. Die stappen vergen een aparte visuele slice waarin
tokens, tailwind-variabelen en per-modus-copy tegelijk worden
aangepakt; ze zijn plan-technisch belangrijk maar apart van de
layout-integratiefout die C.1 dicht.

Fase 3 blijft daarmee open op de visuele richting; de structurele en
navigationele fouten uit Slice C zijn met C.1 hersteld.