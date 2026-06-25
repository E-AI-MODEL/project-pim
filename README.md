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

## Lokale privacygrens

Project PiM heeft geen backend. Ruwe invoer, drafts, mappings, auditinhoud en detectoruitkomsten blijven in de browser. Alleen publieke modelbestanden en publieke `config.json`-metadata worden gedownload wanneer de gebruiker de NER-SLM bewust activeert.

De browser mag lokaal opslaan:

- versleutelde pseudoniem-mapping in de in-memory mapping container;
- browser-cache van modelbestanden;
- een SHA-256 hash van publieke modelconfiguratie in `localStorage` voor modelintegriteit.

De browser mag niet opslaan of versturen:

- ruwe leerlingtekst buiten de actieve browsercontext;
- originele waarden uit de mapping;
- review- of auditdata met originele tekstinhoud;
- anonymous drafts naar externe AI zonder gecertificeerde payload en egress re-consult.

## Modelintegriteit

`modelCatalog.ts` pint modellen op `modelId`, `revision` en een verwachte integriteitsstrategie.
Voor de NER-releasevarianten gebruikt PiM nu browser-local config pins:

1. De browser haalt alleen publieke `config.json` op voor het gekozen model.
2. PiM berekent lokaal `SHA-256(config.json)`.
3. Bij de eerste succesvolle load wordt die hash lokaal in `localStorage` gepind.
4. Latere loads moeten exact dezelfde hash opleveren.
5. Een afwijkende hash geeft `mismatch` en blokkeert egress.

Dit vervangt de oude descriptor-hash. Het is bewust browser-lokaal en stuurt geen invoer naar Hugging Face. Voor distributies die volledig reproduceerbaar moeten zijn, kan `LOCAL_PIN:*` later worden vervangen door een statische SHA-256 over een immutable modelrevision.

Catalog-entries met `PLACEHOLDER:*` blijven productie-egress blokkeren. Modeldownload via Hugging Face en Qwen-download via `@mlc-ai/web-llm` zijn aparte trust-bronnen. Beide draaien lokaal na download; alleen de download raakt het netwerk.

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

1. **No raw egress**: ruwe input verlaat de browser nooit. Egress acties krijgen alleen de gecertificeerde anonymous draft.
2. **Fail-closed**: als de Draft Check Guard niet `pass` is, of de modelintegriteit niet voldoet aan de gate, blokkeert de policy.
3. **Mapping is local-only**: pseudoniem-mappings staan in een AES-GCM-versleuteld register dat de UI niet direct kan uitlezen.
4. **Audit zonder origineel**: audit-records bevatten alleen metadata (mode, action, verdict, reasonCode, ruleId), nooit ruwe invoer.
5. **Productiegate verplicht verificatie**: egress vereist `verified`; `placeholder`, `missing` en `mismatch` blokkeren.

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

## Hardening

- BSN-detectie gebruikt de Nederlandse elfproef als post-filter.
- Egress paden doen re-consult op de werkelijke payload vlak voor copy, export, print, share of externe AI.
- `send_external_ai` heeft in deze build geen endpoint en voert geen fetch uit.
- CSP-headers staan in `vite.config.ts` voor dev/preview en in `public/_headers` voor hosts die dat bestand ondersteunen.
- CI draait typecheck, lint, tests, build en dependency audit.
- E2E-tests dekken copy, export, print, share en send_external_ai.

## Stack

TanStack Start v1 + React 19 + Vite 7 + Tailwind v4. Inferentie via
`@huggingface/transformers` (ONNX, WebGPU/WASM). Geen backend nodig.

## Licentie

Project PiM gebruikt de MIT-licentie.

## Bekende grenzen

- `LOCAL_PIN:*` is browser-lokaal. Voor strikt reproduceerbare builds kan later een statische hash op een immutable modelrevision worden gebruikt.
- `context_education` en `rewrite_qwen` hebben nog `PLACEHOLDER:*` in de catalogus en zijn design-only.
- De Qwen rewrite-LLM staat in de catalog maar wordt niet auto-geladen.
- `contextSlm` is nu heuristisch. Een echte context-SLM staat nog op de roadmap.
