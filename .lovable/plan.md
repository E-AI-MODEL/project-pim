# Plan — Zichtbare meertraps-pipeline + bewuste downloads + live-monitor popup

## 1. Stappen zichtbaar in de UI (op landing)

Boven `MonitorShell` (en als compact mini-strip op mobiel) een nieuwe `PipelineStepsBar` met 3 stappen:

```text
[ 1. Regex/Rules ]  →  [ 2. Download 1 · NER-SLM ]  →  [ 3. Download 2 · Generalisatie-LLM ]
   actief direct       knop: "Inschakelen"            knop: "Inschakelen"
   ✓ altijd lokaal     ~100 MB · q8 · WebGPU/WASM    ~400 MB · alleen desktop
```

Elke stap toont status (idle / loading % / ready / error) en is een **bewuste knop**, niet auto-load. De huidige `auto-load` op `/try` halen we eruit en vervangen door dezelfde knoppen.

Op mobiel:
- Stap 2 (NER-SLM) toont badge "kan op mobiel — eerste laad duurt langer".
- Stap 3 (Rewrite-LLM) toont badge "alleen desktop met voldoende RAM" en de knop is **disabled** met tooltip (detectie via `navigator.deviceMemory < 4` of `coarse pointer` + smal viewport).

## 2. Live-monitor popup ("Live techniek")

Floating knop rechtsonder + extra knop in `MonitorShell`-footer "Live techniek". Opent een `Sheet` (rechts op desktop, bottom-drawer op mobiel) met tabs:

- **Pipeline** — laatste run, per stap een rij met status, duur, telcijfers (geen ruwe tekst):
  - Stap 1 Regex: aantal directe + contextuele hits per categorie.
  - Stap 2 NER-SLM: aangeroepen ja/nee, runtime (WebGPU/WASM), spans gevonden.
  - Stap 3 Rewrite-LLM: aangeroepen ja/nee, draft-check verdict, behouden/origineel.
  - Draft-Check Guard + Model-Gate + Decision (verdict, payloadType, drempel).
  - Egress-Guard resultaat.
- **Modellen** — voor SLM en LLM: `modelId`, status, progress-bar tijdens download, verified-hash, knop "Nu laden / Pauzeren".
- **Omgeving** — WebGPU adapter ja/nee, `deviceMemory`, `hardwareConcurrency`, `crossOriginIsolated`, online/offline, viewport, dpr. Met expliciete melding bovenaan:

  > **Let op — op mobiel is niet alles mogelijk.** De rewrite-LLM (~400 MB) blijft uit. NER-SLM werkt wel, maar de eerste laad kan 20–40 s duren en is daarna gecached.

- **Logboek** — ring-buffer (laatste 50 events) uit `window.dispatchEvent('pim:debug', …)`, monospace, kopieerbaar. Alleen lengtes/IDs/statussen — nooit ruwe input of mapping-waardes.

## 3. Bewuste downloads — geen auto-prefetch

- Geen `idle prefetch` in `MonitorShell`.
- `loadNerSlm()` en `loadRewriteLlm()` worden alléén aangeroepen door de twee knoppen in `PipelineStepsBar` of vanuit het Modellen-tab in de popup.
- Stap 2 en 3 in `decide()` blijven correct: zonder geladen model gaat de pipeline gewoon door op stap 1 (regex) en het Model-Gate-resultaat reflecteert dat eerlijk in de popup.

## 4. Beter / kleiner NER-SLM op HuggingFace?

Huidig model: `Xenova/bert-base-multilingual-cased-ner-hrl` (Davlan, mBERT-base). q8 ONNX ≈ **178 MB**.

Beste pragmatische upgrade in december 2026:
**`Xenova/distilbert-base-multilingual-cased-ner-hrl`** — zelfde Davlan-training en zelfde 10 talen (incl. NL), op DistilBERT i.p.v. mBERT. Quantized ONNX is ~**90–100 MB**, ongeveer **2× kleiner en sneller**, met minimale accuratesseverlies op PER/ORG/LOC. Volledig Transformers.js v3-compatibel, zelfde `token-classification` pipeline, geen code-aanpassing buiten `modelCatalog`.

Andere overwogen kandidaten:
- `onnx-community/bert-base-multilingual-cased-ner-hrl-ONNX` — zelfde gewichten als huidig, geen winst.
- `tjruesch/xlm-roberta-base-ner-hrl-onnx` — XLM-R basis, vaak iets beter maar gróter (~400 MB), géén winst voor jou.
- GLiNER multi — flexibel, maar minder beproefd in browser en eerder zwaarder.

**Advies:** vervangen door `Xenova/distilbert-base-multilingual-cased-ner-hrl` als **Download 1**. We pinnen het in `modelCatalog.ts` met nieuwe revision + hash en laten de huidige bert-mBERT als optionele "zwaardere variant" in advanced staan.

## 5. Bestanden

Nieuw:
- `src/components/pim/start-go/PipelineStepsBar.tsx` — 3 stappen, knoppen, badges.
- `src/components/pim/start-go/LiveTechMonitor.tsx` — Sheet/Drawer met tabs.
- `src/lib/pim/debugBus.ts` — kleine emitter (`emit`, `subscribe`, ring-buffer).

Wijzigen:
- `src/lib/pim/modelCatalog.ts` — switch primair SLM naar `Xenova/distilbert-base-multilingual-cased-ner-hrl`, met juiste revision + placeholder-hash tot first-pin.
- `src/lib/pim/nerSlm.ts` — geen gedragswijziging; alleen log via `debugBus`.
- `src/lib/pim/rewriteLlm.ts` — idem `debugBus`-events.
- `src/components/pim/start-go/MonitorShell.tsx` — `PipelineStepsBar` boven shell + "Live techniek" knop + render `<LiveTechMonitor/>`. **Geen** auto-load.
- `src/components/pim/start-go/StartGoShell.tsx` — `debugBus.emit(...)` na `run()` en `onPrimary()` (lengtes, telcijfers, statussen — geen tekst).
- `src/routes/try.tsx` — auto-load `loadNerSlm()` op mount verwijderen; gebruikt zelfde knoppen.

## 6. Privacy

Debug-bus logt alleen: `len`, `signalsCount`, `verdict`, `runtime`, `modelId`, `pct`, tijden. **Geen** invoertekst, **geen** mapping-waardes. De popup zelf is een UI-laag — geen netwerk.

## Open keuze
1. SLM-vervanging direct doorvoeren (distilbert) of als opt-in toggle naast het huidige model?
2. Floating "Live techniek"-knop standaard zichtbaar of alleen wanneer `?debug=1` of na klik op de status-pill in de footer?
