## Probleem

1. `PipelineStepsBar` boven het monitorvenster klapt **in de pagina open** en duwt hero-tekst weg → storend.
2. Alles wat in het popup-paneel (`LiveTechMonitor`) staat, hoort niet óók op de startpagina te staan.
3. Het popup-paneel toont vooral statussen — gebruiker ziet *het gevolg* van PiM, niet *wat PiM op dat moment doet*.

## Doel

- Op de startpagina staat **geen** modellen-/techniek-strip meer. Geen inline-uitklap, geen 1/3-actief regel, geen StepPills.
- Eén toegang tot techniek: de bestaande "Live techniek"-knop in de footer van het monitorvenster opent het zij-paneel.
- In dat paneel zie je PiM écht aan het werk, niet alleen het eindresultaat.

## Wijzigingen

### 1. `MonitorShell.tsx` — strip uit de hero
- `<PipelineStepsBar />` verwijderen.
- De wrapper `<div className="space-y-3">` mag weg; alleen het monitor-window blijft.
- Footer-knop "Live techniek" blijft staan (enige ingang).

### 2. `PipelineStepsBar.tsx` — wordt niet meer gebruikt op `/`
- Bestand laten staan (kan elders in docs-routes gebruikt worden); geen edit nodig. Geen import meer vanuit `MonitorShell`.

### 3. `LiveTechMonitor.tsx` — Modellen-tab krijgt de 3 stap-kaarten
- De drie kaarten (Regex/regels, NER-SLM, Generalisatie-LLM, met progress + "Inschakelen"-knoppen + mobiel-badge) verhuizen integraal naar de **Modellen**-tab. Dat is precies de inhoud die nu uit de hero verdwijnt.
- Bestaande integrity-blok blijft eronder.

### 4. Nieuwe **Live**-tab (default) — toont wat PiM nu doet
Vervangt de huidige magere "Pipeline"-tab. Tabvolgorde: **Live · Modellen · Omgeving · Log**.

Inhoud (alles uit `debugBus` + bestaande hooks, geen nieuwe data over de privacy-grens):
- **Nu actief**: laatste step uit `usePipelineHeartbeat` met pulsing dot + "x ms geleden". Idle → "Wacht op invoer".
- **Stap-heartbeat**: alle steps (regex → ner → llm → policy → draftcheck → egress) met per stap *laatste duur in ms* en *aantal keer uitgevoerd*.
- **Detector-tellingen (laatste run)**: per categorie (BSN, email, telefoon, NER-persoon, etc.) het aantal hits — alléén tellingen, geen waarden. Uit het laatste `pipeline.run`-event.
- **Beslissing**: laatste verdict (`ALLOW`/`WARN`/`BLOCK`) + reden-codes.
- **Egress-poort**: laatste `pipeline.execute` — toegestaan/geblokt + reden.
- **Modellen-mini**: NER runtime (`webgpu`/`wasm`) en LLM-status als one-liner met dot.

De huidige "Laatste run"-JSON-dump blijft als inklapbare "Ruwe data" onderaan voor wie het wil.

### 5. Geen wijzigingen aan
- `BurgerMenu`, copy, kleuren, fonts, pipeline-logica, detectors, server-functies.
- Privacy-belofte: events bevatten nog steeds alleen tellingen/IDs/statussen, geen ruwe tekst.

## Bestanden
- `src/components/pim/start-go/MonitorShell.tsx` — import + render van `PipelineStepsBar` weg.
- `src/components/pim/start-go/LiveTechMonitor.tsx` — Live-tab toevoegen; Modellen-tab uitbreiden met de 3 kaarten (StepPill-component intern overnemen).

## Validatie
- Typecheck.
- Visueel: hero-tekst blijft staan, niets duwt 'm meer weg.
- Klik op "Live techniek" → paneel rechts opent met Live-tab actief; tijdens een testrun lichten step-heartbeat en tellingen op.
