# Project PiM

**Project PiM** is een browser-native demonstratie van de **PIM-engine** (Privacy
Intelligence Module): een lokale, fail-closed pipeline die onderwijsteksten
anonimiseert of pseudonimiseert vóór er ook maar iets richting clipboard, share,
download of externe AI gaat. Alle verwerking is client-side; er is geen server.

- Productnaam (UI / branding): **Project PiM**
- Engine / code-laag: **PIM** (Privacy Intelligence Module)
- Live: https://project-pim.lovable.app

## Mapping spec v3-2 → code

| Spec hoofdstuk | Module | Bestand |
|---|---|---|
| 3 — Modi (anoniem / pseudoniem) | `Mode` types + `anonymize` / `pseudonymize` | `src/lib/pim/types.ts`, `src/lib/pim/processing.ts` |
| 8 — Detectie | Regex-detectoren + special lexicon | `src/lib/pim/detectors.ts`, `src/lib/pim/detectorRegistry.ts` |
| 9 / 14 — Modelintegriteit | Catalog + SHA-256 gate (`verifyModel`) | `src/lib/pim/modelCatalog.ts` |
| 11 — Risk scoring | `computeSignals` | `src/lib/pim/risk.ts` |
| 12 — Egress beleid | `decide` + `executeAction` + `egressGuard` | `src/lib/pim/policy.ts`, `src/lib/pim/egressGuard.ts` |
| 13 — Secure mapping | AES-GCM container | `src/lib/pim/secureMapping.ts` |
| 15 — Pipeline profielen | `PipelineProfile` (education-nl-full / rules-only) | `src/lib/pim/pipelineProfile.ts` |
| 17 — Runtime hardening | Patcht `fetch`, `XHR`, `sendBeacon` etc. | `src/lib/pim/runtimeHardening.ts` |
| 18 / 31 — Review queue & repair | `repairAnonymousDraft`, `reviewQueue` | `src/lib/pim/contextualGeneralization.ts`, `src/lib/pim/reviewQueue.ts` |
| 22 — NER SLM (browser) | Wikineural-stijl NER via @huggingface/transformers | `src/lib/pim/nerSlm.ts` |
| 29 — Contextuele generalisatie | Generaliseert kleine-groep / locatie / tijd | `src/lib/pim/contextualGeneralization.ts` |
| 32 — Beslissen op de draft | `computeSignals` op `finalDraft` in Try-it | `src/routes/try.tsx` |
| 35 — Productiegate | Live checklist | `src/routes/compliance.tsx` |

## Invarianten

1. **No raw egress**: ruwe input verlaat de browser nooit. Egress acties
   krijgen alleen de geanonimiseerde of gepseudonimiseerde *draft*.
2. **Fail-closed**: als de Draft Check Guard niet `pass` is, of de
   modelintegriteit niet `verified`/`placeholder`, blokkeert de policy.
3. **Mapping is local-only**: pseudoniem-mappings staan in een
   AES-GCM-versleuteld register dat de UI niet direct kan uitlezen.
4. **Audit zonder inhoud**: audit-records bevatten alleen metadata
   (mode, action, verdict, reasonCode, ruleId) — nooit tekst.
5. **Productiegate verplicht concrete hashes**: catalog-entries met
   `PLACEHOLDER:*` tellen als `placeholder` en blokkeren productie-egress.

## Pipeline profielen (release 1)

- **education-nl-full** — regels + special lexicon + NER SLM + (stub) contextSlm. Volledige egress mits alle gates groen.
- **education-nl-rules-only** — alleen regels + lexicon. Geen modelafhankelijkheid; egress is gedegradeerd (`degrade_no_export`).

Andere domeinen (`healthcare-nl`, `generic-nl`, `generic-en`) zijn ontwerp­voorbereiding en niet selecteerbaar.

## Detector Registry

Detectors zijn plug-ins (`src/lib/pim/detectorRegistry.ts`). Een nieuw
detectortype toevoegen vereist alleen `registerDetector({...})` — de
`pipelineProfile` bepaalt of hij actief is. Ingebouwde detectors:

- `builtin.regex` — directe + contextuele regex-patronen
- `builtin.specialLexicon` — onderwijs-lexicon (LVS-namen, toetsen, SWV)
- `builtin.nerSlm` — multilingual NER via Transformers.js (WebGPU/WASM)
- `builtin.contextSlm` — design-only stub voor contextclassificatie

## Stack

TanStack Start v1 + React 19 + Vite 7 + Tailwind v4. Inferentie via
`@huggingface/transformers` (ONNX, WebGPU/WASM). Geen backend nodig.

## Belangrijke beperkingen demo

- Modelhashes voor de NER zijn nog `PLACEHOLDER:*` — productiegate is
  daardoor `placeholder` (demo OK, productie blokkeert).
- De Qwen rewrite-LLM (>1GB) staat in de catalog maar wordt niet auto-geladen.
- De `contextSlm` is een lege stub — release-1 leunt op rules + NER.