# Fase 2 — Centrale PiM Evaluation Engine

Doel: alle PiM-logica (detectie, risk, policy, draft-check, egress) achter één API zetten, zodat UI-componenten (StartGoShell, WriterShell, `try.tsx`, toekomstige Product-Shell) puur een **weergave** van engine-toestand worden en geen eigen beslissingen meer nemen.

Fase 1 (governance + branch groen) is klaar. Fase 3 (Product-Shell), 4 (echt werkend) en 5 (polish) volgen pas nadat de engine staat.

## Huidige situatie (kort)

- Losse modules in `src/lib/pim/`: `detectors`, `risk`, `processing` (draftCheck), `policy` (decide), `egressGuard`, `modelIntegrity`, `nerSlm`, `detectionSettings`, `pipelineProfile`, `flags`.
- UI roept deze los aan en houdt zelf tussentoestanden bij:
  - `src/routes/try.tsx` (1918 regels) — grootste verzamelaar
  - `src/components/pim/start-go/StartGoShell.tsx` (599)
  - `src/components/pim/writer/WriterShell.tsx` (497)
  - `useNerSpans`, `usePimSettings`, `usePipelineHeartbeat`
- Gevolg: dezelfde volgorde (input → detect → risk → draftCheck → decide → egress) wordt op meerdere plekken half-herbouwd; beleidsregels lekken naar componenten.

## Doel-architectuur

```text
                 ┌────────────────────────────┐
   input  ─────▶ │   PiM Evaluation Engine    │ ─────▶  EngineState
                 │                            │         (readonly)
                 │  1. Detect (regex+NER)     │
                 │  2. Risk score             │
                 │  3. Draft / anonymize      │
                 │  4. Policy decide          │
                 │  5. Review (indien nodig)  │
                 │  6. Egress guard           │
                 └────────────────────────────┘
                              │
                              ▼
                        UI (pure view)
```

- Eén publieke API in `src/lib/pim/engine/`.
- UI krijgt **alleen** `EngineState` + acties (`evaluate`, `requestAction`, `reset`).
- Geen policy-, risk- of guard-import meer in `src/routes/**` of `src/components/**`.

## Scope van deze PR (Fase 2, slice 1)

1. **Nieuw pakket** `src/lib/pim/engine/`
   - `types.ts` — `EngineInput`, `EngineState`, `EngineStep`, `RequestedAction`, `ActionOutcome`.
   - `engine.ts` — `createEngine({ settings, profileId?, bertEnabled, strictMode })` met:
     - `evaluate(input): Promise<EngineState>` — detect → risk → draftCheck → decide (voor `display`).
     - `requestAction(action): Promise<ActionOutcome>` — hergebruikt vorige evaluate + `decide` + `executeAction`.
     - `reset()`.
   - `selectors.ts` — kleine pure helpers voor UI (findings per categorie, banner-severity, gated actions).
   - `index.ts` — barrel; enige toegestane import-oppervlak voor UI.
   - **Geen** nieuwe detectie- of policy-logica; alles wrapt bestaande modules.

2. **React-adapter** `src/hooks/usePimEngine.ts`
   - Bouwt engine (memo) uit `usePimSettings`.
   - Publiceert `{ state, evaluate, requestAction, reset }`.
   - Vervangt hoeft **niet** direct alle bestaande hooks; leeft ernaast tot migratie.

3. **Één UI-consument migreren als bewijs**: `src/routes/try.tsx`
   - Alle directe imports van `policy`, `risk`, `processing`, `egressGuard` verwijderen.
   - Vervangen door `usePimEngine()`.
   - Geen UX-wijziging, geen nieuwe knoppen.

4. **Tests**
   - `src/lib/pim/engine/__tests__/engine.test.ts`: happy path, BERT-off warn, strict block, payload-type block, model-integrity block — komen overeen met bestaande policy-tests maar via engine-API.
   - Bestaande policy/egress/draftCheck tests blijven ongewijzigd (regressiedekking).

5. **Guardrail**: eslint `no-restricted-imports` regel toevoegen die imports van `@/lib/pim/policy`, `.../risk`, `.../egressGuard`, `.../processing` buiten `src/lib/pim/**` verbiedt (alleen `@/lib/pim/engine` toegestaan). Bestaande overtreders in `StartGoShell` / `WriterShell` krijgen tijdelijk een gerichte eslint-disable met TODO-verwijzing naar slice 2/3.

## Out of scope (volgende slices)

- Slice 2: `StartGoShell` migreren.
- Slice 3: `WriterShell` migreren + eslint-disables verwijderen.
- Slice 4: Product-Shell (Fase 3) — pas ná volledige migratie.

## Non-goals

- Geen wijziging aan detectieregels, risk-formule, drempels, flags of privacy-gedrag.
- Geen route- of URL-wijzigingen.
- Geen dependency-toevoegingen.
- Geen UI-refactor of styling.

## Acceptatie

- `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build` groen.
- `rg "from \"@/lib/pim/(policy|risk|egressGuard|processing)\"" src/routes src/components` → alleen regels met expliciete TODO-disable in de twee shells.
- `try.tsx` importeert PiM alléén via `@/lib/pim/engine`.
- Alle bestaande tests blijven groen; nieuwe engine-tests slagen.

## Technische details

- `EngineState` is een discriminated union op `phase`: `"idle" | "evaluating" | "ready" | "acted" | "error"`; bevat `signals`, `draft`, `decision`, `lastOutcome`.
- Engine houdt géén React-state; is pure klasse/closure — hook doet `useSyncExternalStore` of eenvoudige `useState`+subscribe.
- BERT-spans blijven via `useNerSpans` binnenkomen en worden als `extraSpans` aan `engine.evaluate` meegegeven — engine roept BERT niet zelf aan (voorkomt worker-coupling in deze slice).
- `payloadType` blijft door engine gezet op basis van `mode` + `draftCheck.status` (zoals huidige processing).
