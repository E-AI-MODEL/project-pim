# Plan — PiM UI/UX refactor (8 fases)

Bron: `docs/pim-refactor/00-overzicht.md`. Backend is gezond, UI/UX is gefragmenteerd. We consolideren naar één design-systeem, één dashboard, vereenvoudigde homepage en schrijfmodus, en een lock-principe i.p.v. silent blocks.

## Fases

| # | Fase | Doel | Status |
|---|------|------|--------|
| 1 | Backend + lock | `PIM_RULES_ONLY_*` checks, `strictMode`, `ALLOW_WITH_WARNING` voor BERT-uit, `profileId` weg, `enhanceContextWithBert`, Qwen-verbeteringen | 🟡 in uitvoering — slice 1/4 (lock-principe in `decide()`) |
| 2 | Design tokens | Eén token-systeem, glow/gradients weg, fonts terug naar Inter + IBM Plex Mono | ⬜ |
| 3 | Model-status consolidatie | 9 plekken → ModelBar + mini-indicator | ⬜ |
| 4 | Homepage strippen | `MonitorShell`-window weg, `AdvancedPanel` weg | ⬜ |
| 5 | Schrijfmodus strippen | `LiveTechMonitor`/`AdvancedPanel` weg, mini-indicator | ⬜ |
| 6 | Dashboard bouwen | `/dashboard` met 5 tabs + ModelBar + SettingsPanel + audit-log | ⬜ |
| 7 | Navigatie | `/try`, `/trust`, `/pipeline` weg; BurgerMenu reorganiseren | ⬜ |
| 8 | Cleanup | `pipelineProfile.ts` weg, `coerceDetectionSettings` shim weg, `modelGateFor` shim weg, tests updaten | ⬜ |

## Fase 1 — sub-slices

1. **Lock-principe in `decide()`** — nieuwe `strictMode` + `bertEnabled` velden op `DecideInput`. Activeert `PIM_RULES_ONLY_EXTERNAL_AI_BLOCK` en `PIM_RULES_ONLY_EXPORT_BLOCK` (al gedefinieerd in `flags.ts` maar nergens aangeroepen). Nieuwe flag `PIM_BERT_OFF_EGRESS_WARN` voor niet-strikt + BERT-uit. **Status: ✅ deze PR.**
2. **`enhanceContextWithBert`** — nieuwe pure functie in `src/lib/pim/contextualGeneralization.ts` (of nieuw bestand) die BERT-name-spans gebruikt om context-detecties te versterken. Confidence ×0.7, span op contextwoord, niet op naam.
3. **`profileId` deprecaten** — uit `usePimSettings`, `types.ts`, `DetailsDrawer`. Optional houden in `PimDecision` t/m fase 8 (modelGateFor-shim).
4. **Qwen-overhaul** — sampling, `dedupeSentences`, fallback-discriminatie, streaming/non-streaming unificeren. Vereist doc 05 §1.

## Acceptatie (per docs/00 §8)
- `decide()` retourneert `PIM_RULES_ONLY_*` in strikte modus met BERT uit
- `decide()` retourneert `ALLOW_WITH_WARNING` in niet-strikt met BERT uit bij externe AI / export
- Alle bestaande tests blijven groen

## Volgende stap
Slice 1 oplevereren, dan wachten op docs 03-05 voor slices 2-4.