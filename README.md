# Project PiM

**Project PiM** is een browser-native demonstratie van de **Privacy Integrity
Monitor**. Het is een lokale, fail-closed pipeline die onderwijsteksten anonimiseert
of pseudonimiseert voordat er iets richting clipboard, share, download of externe AI
gaat. Alle verwerking is client-side; er is geen server.

## Termen (consistent door UI, code en PVA)

| Term | Betekenis |
|---|---|
| **Project PiM** | Productnaam (UI / branding). |
| **Privacy Integrity Monitor** | Volledige naam van het product. |
| **PIM** | De deterministische beslislaag (`policy.ts` + `egressGuard.ts`). |
| **Privacy Intelligence Module** | Oud, niet meer gebruiken. Vervangen door bovenstaande. |

Live: https://project-pim.lovable.app

## Modelintegriteit

`modelCatalog.ts` pint modellen op `modelId`, `revision` en een verwachte hash.
Voor de NER-releasevarianten is die hash nu een SHA-256 over de canonieke descriptor
`<modelId>@<revision>`. Dat is een deterministische configuratiepin, maar geen
hash over de werkelijke modelweights.

Daarom geldt voor productie:

- Descriptor-hashes zijn demo-verificatie, geen supply-chain garantie.
- `revision: "main"` moet vóór productie worden vervangen door een immutable commit SHA.
- Productieverificatie moet uiteindelijk een content-hash controleren van `config.json`
  en, waar de runtime dat toelaat, de gedownloade modelbestanden.
- Catalog-entries met `PLACEHOLDER:*` blijven productie-egress blokkeren.
- Modeldownload via Hugging Face en Qwen-download via `@mlc-ai/web-llm` zijn aparte
  trust-bronnen. Beide draaien lokaal na download; alleen de download raakt het netwerk.

## Mapping spec v3-2 naar code

| Spec hoofdstuk | Module | Bestand |
|---|---|---|
| 3, Modi (anoniem / pseudoniem) | `Mode` types + `anonymize` / `pseudonymize` | `src/lib/pim/types.ts`, `src/lib/pim/processing.ts` |
| 8, Detectie | Regex-detectoren + special lexicon | `src/lib/pim/detectors.ts`, `src/lib/pim/detectorRegistry.ts` |
| 9 / 14, Modelintegriteit | Catalog + SHA-256 gate (`verifyModel`) | `src/lib/pim/modelCatalog.ts` |
| 11, Risk scoring | `computeSignals` | `src/lib/pim/risk.ts` |
| 12, Egress beleid | `decide` + `executeAction` + `egressGuard` | `src/lib/pim/policy.ts`, `src/lib/pim/egressGuard.ts` |
| 13, Secure mapping | AES-GCM container | `src/lib/pim/secureMapping.ts` |
| 15, Pipeline profielen | `PipelineProfile` (education-nl-full / rules-only) | `src/lib/pim/pipelineProfile.ts` |
| 17, Runtime hardening | Patcht `fetch`, `XHR`, `sendBeacon` etc. | `src/lib/pim/runtimeHardening.ts` |
| 18 / 31, Review queue & repair | `repairAnonymousDraft`, `reviewQueue` | `src/lib/pim/contextualGeneralization.ts`, `src/lib/pim/reviewQueue.ts` |
| 22, NER SLM (browser) | Multilingual NER via `@huggingface/transformers` | `src/lib/pim/nerSlm.ts` |
| 29, Contextuele generalisatie | Generaliseert kleine-groep / locatie / tijd | `src/lib/pim/contextualGeneralization.ts` |
| 32, Beslissen op de draft | `computeSignals` op `finalDraft` in Try-it | `src/routes/try.tsx` |
| 35, Productiegate | Live checklist | `src/routes/compliance.tsx` |

## Invarianten

1. **No raw egress**: ruwe input verlaat de browser nooit. Egress acties krijgen alleen de geanonimiseerde of gepseudonimiseerde draft.
2. **Fail-closed**: als de Draft Check Guard niet `pass` is, of de modelintegriteit niet voldoet aan de gate, blokkeert de policy.
3. **Mapping is local-only**: pseudoniem-mappings staan in een AES-GCM-versleuteld register dat de UI niet direct kan uitlezen.
4. **Audit zonder origineel**: audit-records bevatten alleen metadata (mode, action, verdict, reasonCode, ruleId), nooit ruwe invoer.
5. **Productiegate verplicht concrete hashes**: catalog-entries met `PLACEHOLDER:*` tellen als `placeholder` en blokkeren productie-egress.

## Pipeline profielen (release 1)

- **education-nl-full**: regels + special lexicon + NER SLM + heuristische contextdetector. Volledige egress alleen als alle gates groen zijn.
- **education-nl-rules-only**: alleen regels + lexicon. Geen modelafhankelijkheid; egress is gedegradeerd (`degrade_no_export`).

Andere domeinen (`healthcare-nl`, `generic-nl`, `generic-en`) zijn ontwerpvoorbereiding en niet selecteerbaar.

## Detector Registry

Detectors zijn plug-ins (`src/lib/pim/detectorRegistry.ts`). Een nieuw detectortype toevoegen vereist alleen `registerDetector({...})`; de `pipelineProfile` bepaalt of hij actief is. Ingebouwde detectors:

- `builtin.regex`: directe + contextuele regex-patronen
- `builtin.specialLexicon`: onderwijs-lexicon (LVS-namen, toetsen, SWV)
- `builtin.nerSlm`: multilingual NER via Transformers.js (WebGPU/WASM)
- `builtin.contextSlm`: heuristische contextdetector, nog geen modelgebaseerde SLM

## Stack

TanStack Start v1 + React 19 + Vite 7 + Tailwind v4. Inferentie via
`@huggingface/transformers` (ONNX, WebGPU/WASM). Geen backend nodig.

## Belangrijke beperkingen demo

- NER-integriteit gebruikt nu descriptor-hashes. Dat is demo-verificatie, geen echte weight-verificatie.
- `context_education` en `rewrite_qwen` hebben nog `PLACEHOLDER:*` in de catalogus.
- De NER-revisies gebruiken nog `main`; productie moet pinnen op immutable commit SHA's.
- De Qwen rewrite-LLM staat in de catalog maar wordt niet auto-geladen.
- `contextSlm` is nu heuristisch. Een echte context-SLM staat nog op de roadmap.
- De huidige `LICENSE` is tijdelijk all-rights-reserved. Kies een definitieve licentie vóór open-source publicatie.
