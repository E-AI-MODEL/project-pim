# Project PiM — Faseoverzicht

## Fase 2 — Centrale PiM Evaluation Engine ✅ afgesloten

Doel bereikt: alle PiM-logica (detectie, risk, policy, draft-check, egress)
zit achter één publieke API in `src/lib/pim/engine/`. UI-componenten zijn
pure weergave van engine-toestand.

### Uitgevoerde slices

- **Slice 1** — engine-pakket (`types.ts`, `engine.ts`, `selectors.ts`,
  `index.ts`) + React-adapter `usePimEngine` + eerste engine-tests +
  eslint `no-restricted-imports` guardrail.
- **Slice 2** — `src/routes/try.tsx` gemigreerd naar de engine; directe
  imports van `policy` / `risk` / `processing` / `egressGuard` verwijderd;
  `previewDecision`, auto-repair en LLM-override in de engine getild;
  paritytests toegevoegd.
- **Slice 3** — `StartGoShell.tsx` gemigreerd; debounced commit-flow via
  engine; tijdelijke eslint-uitzondering voor die shell verwijderd;
  characterisation tests toegevoegd.
- **Slice 3.5** — hookcommando's stabiel gemaakt met `useCallback`;
  render-side-effects (`engine.evaluate` in `useMemo`) verwijderd uit
  `StartGoShell` en `try.tsx`; React-integratietests voor
  usePimEngine (stabiliteit, Strict Mode, config-update, LLM-override,
  reset).
- **Slice 4** — `WriterShell.tsx` gemigreerd; laatste eslint-uitzondering
  verwijderd; writer parity-tests toegevoegd. Geen enkele UI-module
  importeert nog direct `policy` / `risk` / `processing` / `egressGuard` /
  `modelGate`.

### Feitelijke eindstand (afwijkingen t.o.v. oorspronkelijk plan)

- `EngineState.phase` is in de praktijk `"idle" | "ready"` — de destijds
  bedachte tussenfasen (`evaluating`, `acted`, `error`) waren niet nodig
  omdat evaluatie synchroon is en fouten via `guard` / `displayDecision`
  worden weergegeven.
- `engine.evaluate(input)` is **synchroon** (`EngineState`), niet
  `Promise<EngineState>`. `requestAction` blijft async voor toekomstige
  serveracties.
- Migratie liep in vier slices + 3.5, niet drie.

### Acceptatie — behaald

- `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build` groen.
- Repo-brede grep bevestigt: geen directe imports van de afgeschermde
  interne modules buiten `src/lib/pim/**`.
- Alle bestaande tests groen; engine-, parity- en hooktests slagen.

---

## Fase 3 — Product-Shell (volgende)

Doel: één rustige, samenhangende UI bovenop de engine, in plaats van drie
losse shells (`try`, `start-go`, `writer`) met eigen chrome. De engine is
de ruggengraat; de Product-Shell is het gezicht.

Scope en visuele richting worden vastgelegd voordat er code verandert
(directions + user-keuze). Non-goals blijven: geen wijziging aan
detectieregels, risk-formule, drempels, flags of privacy-gedrag.
