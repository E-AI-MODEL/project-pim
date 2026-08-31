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

### Instellingen per functie nagelopen op dubbeling

Het paneel bevat nu vier soorten knoppen die deels hetzelfde doen. Ordening en samenvoeging:

- **Detectielagen** (Regex, Lexicon, Context, BERT): dit zijn vier bronnen die dezelfde categorieën kunnen vinden. Ze worden één blok **Waar PiM op zoekt** met per laag één zin in gewone taal ("Lexicon: bekende namen en plaatsen uit een lokale lijst"). Ze blijven apart, want ze hebben echt verschillende kosten en risico's, maar de UI toont voortaan welke laag welke categorie dekt, zodat "Lexicon uit" begrijpelijk is.
- **Categorieën aan/uit** versus **drempels** versus **strict mode**: drie plekken die alle drie bepalen of iets een hit wordt. Dat wordt één blok **Wat PiM markeert**, met de categorielijst als hoofdvorm en drempel plus strict als geavanceerde regel eronder in dezelfde rij, niet in losse secties.
- **Categorie uitzetten** versus **niet automatisch vervangen**: nu twee losse categorielijsten (detectie en writer auto-redact) die op elkaar lijken maar iets anders doen. Ze worden één lijst met per categorie twee duidelijke schakelaars: *markeren* en *automatisch vervangen*.
- **Strenge cijfercontrole** (writer) versus **strict mode**: overlappende namen; ze worden één instelling **Streng met cijfers en codes**, geldig in beide modi.
- **BERT-varianten (Uit / 100 MB / 180 MB)**: blijft één keuze, maar met verwachtingszinnen (download, snelheid, wat het extra vindt) en de bestaande laad-/testknop en voortgangsbalk op dezelfde plek.
- **Modelintegriteit en diagnostiek** verdwijnen uit het instellingenpaneel en staan alleen nog in het diagnostiekpaneel, zodat instellingen alleen keuzes bevat en geen status.


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
