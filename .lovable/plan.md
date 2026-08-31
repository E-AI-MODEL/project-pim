# Gebruiksgemak: dubbele functies weg, één duidelijk model

## Eerst je vraag: wat is het verschil tussen Checken en Schrijven?

- **Checken** (nu "Snel checken" + "Stap voor stap"): je plakt bestaande tekst of laadt een document, PiM geeft een oordeel (veilig / blokkeren), een veilige versie, en een bestemming (kopiëren, exporteren, naar externe AI). Het is een *doorlaatpoort*.
- **Schrijven**: je stelt tekst zelf op in een editor, met markeringen in de tekst zelf, per categorie automatisch vervangen, en docx in/uit. Het is een *werkruimte*.

Ze delen dezelfde engine en dezelfde NER/BERT-runtime, maar de interactie verschilt echt (poort versus werkruimte). Daarom: **Schrijven blijft apart**, en **Snel checken + Stap voor stap worden één modus "Checken"**, want die twee delen invoerveld, engine en resultaat; alleen de stappenbalk verschilt.

Resultaat: twee modi in plaats van drie, één analysemodel, één instellingenplek.

## 1. Modi terug naar twee, met bewoordingen die de verwachting zetten

De losse woorden "Checken" en "Schrijven" zijn te dun: ze zeggen niets over invoer, resultaat of wat je erna kunt doen. Daarom krijgt elke modus een label plus een resultaatzin:

- **Tekst controleren** - "Plak of upload tekst. PiM geeft een oordeel en een veilige versie die je kunt kopiëren, exporteren of naar een AI sturen."
- **Zelf schrijven** - "Schrijf in de editor. PiM markeert persoonsgegevens in je tekst en kan ze meteen vervangen. Opslaan als docx."

Uitvoering:

- `ModeSwitcher`: twee tabs met deze labels; de resultaatzin verschijnt als tooltip en, bij een lege werkruimte, als één regel onder de tab.
- Bij eerste gebruik (lege staat) staan beide modi als twee kaarten naast elkaar met dezelfde zinnen, zodat de keuze bewust is in plaats van geraden.
- Woordenlijst vastzetten en overal consequent gebruiken: "controleren" (analyse), "veilige versie" (resultaat), "vervangen" (redactie), "bestemming" (wat je met de tekst doet). Synoniemen zoals "scan", "check", "anonimiseren", "scrubben" en "verwerken" verdwijnen uit de UI-teksten.
- `StartMode` verdwijnt als eigen modus. De zes-stappenbalk wordt een uitklapbare regel ("Hoe PiM tot dit oordeel komt") binnen Tekst controleren, standaard dicht.
- `/app?mode=quick` en `?mode=start` blijven werken en sturen door naar `mode=check`; oude links breken niet.


## 2. Eén analysemodel met een toggle

Eén gedeelde instelling in de ProductShell, geldig in beide modi:

- **Live meelezen** (standaard in Checken): debounced analyse tijdens typen.
- **Analyseren als ik klaar ben** (standaard in Schrijven): niets gebeurt tot je op **Controleer** klikt.

De toggle staat op één plek zichtbaar (kop van het werkvlak), de knop **Controleer** is er altijd, ook in live-modus, als handmatige herhaling. De aparte "Analyseer"-knop van de writer en de verborgen auto-debounce in Checken verdwijnen als losse concepten.

## 3. Eén instellingenplek, twee niveaus

- In de werkbalk blijven alleen de twee dagelijkse keuzes staan, met duidelijke labels: **Anonimiseren als** (anoniem / pseudoniem) en **Wat ga je ermee doen** (kopiëren, exporteren, externe AI, ...). Het woord "modus" wordt daar niet meer gebruikt, dat is voortaan alleen Checken/Schrijven.
- Al het andere (detectielagen, drempels, categorieën, strict, BERT laden/testen, auto-vervangen per categorie) zit in één paneel **Instellingen**, te openen vanuit één knop in de footer. Het tandwiel in de invoerbalk en het losse menu-item verdwijnen; het burgermenu krijgt hooguit een verwijzing naar diezelfde knop.

## 4. Dubbele en onduidelijke functies opruimen

- **Twee scrub-mechanismen**: "Live wissen" in de invoerbalk en "auto-vervangen per categorie" in de writer worden één instelling **Automatisch vervangen**, met dezelfde categorie-instellingen voor beide modi.
- **Twee diagnose-oppervlakken**: footer "Diagnostiek" (LiveTechMonitor) en "Details" onder een resultaat worden één paneel; de resultaatknop opent hetzelfde paneel op het tabblad van dat resultaat.
- **Twee resets**: "Nieuwe tekst" (leegmaken) en "Lokale opslag wissen" krijgen aparte, expliciete labels met één zin uitleg elk, in één sectie van het menu.
- **Dode variant**: de niet-compacte hero-variant van `InputPanel` wordt verwijderd als die nergens meer gerenderd wordt.
- Elke knop die overblijft krijgt een korte uitlegzin of tooltip in gewone taal (wat het doet, niet hoe het werkt).

## Technische uitvoering

- `ProductShell`: nieuwe gedeelde state `analysisMode: "live" | "manual"` plus `runAnalysis()`; beide modi consumeren die in plaats van eigen effecten.
- `types.ts` / `app.search.ts`: `ProductMode` wordt `"check" | "write"`, met redirect van `quick`/`start` naar `check`.
- `modes/QuickMode.tsx` en `modes/StartMode.tsx` gaan op in één `CheckMode.tsx`; stappenbalk verhuist naar een `PipelineSteps`-detailcomponent.
- `WriterWorkspace.tsx`: eigen analyseknop en eigen auto-redact-state weg, gebruikt shell-state.
- `ExpertPanel` wordt `SettingsPanel` (zelfde AdvancedPanel-inhoud, één trigger, één event `pim:open-settings`).
- `StatusFooter`: twee knoppen (Instellingen, Diagnostiek), verder ongewijzigd.
- Engine, detectors, policy, egress en modelintegriteit blijven ongewijzigd.

## Tests

- Bestaande tests aanpassen op de nieuwe modenamen en op één settings-trigger.
- Nieuw: redirect `quick`/`start` → `check`; live versus handmatige analyse gedraagt zich correct in beide modi; auto-vervangen werkt in beide modi vanuit één instelling.
- Volledige suite, typecheck en lint groen voor oplevering.
