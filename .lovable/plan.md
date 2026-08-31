# Gebruiksgemak: één model, geen dubbele functies of feedback

## Eerst je vraag: wat is het verschil tussen controleren en schrijven?

- **Tekst controleren** (nu "Snel checken" + "Stap voor stap"): je plakt bestaande tekst of laadt een document, PiM geeft een oordeel, een veilige versie en een bestemming (kopiëren, exporteren, naar externe AI). Het is een doorlaatpoort.
- **Zelf schrijven**: je stelt tekst op in een editor, met markeringen in de tekst zelf, automatisch vervangen per categorie en docx in en uit. Het is een werkruimte.

Ze delen dezelfde engine en dezelfde NER/BERT-runtime, maar de interactie verschilt echt. Daarom blijft Schrijven apart en gaan Snel checken en Stap voor stap samen: die twee delen invoerveld, engine en resultaat, alleen de stappenbalk verschilt.

Resultaat: twee modi, één analysemodel, één instellingenplek, één feedbackverhaal.

## Fase 1, taal en modi vastzetten

Eerst de woorden, want alle latere schermen gebruiken ze.

- Woordenlijst vastleggen in `src/lib/pim/copy.ts` en overal toepassen: "controleren" (analyse), "veilige versie" (resultaat), "vervangen" (redactie), "bestemming" (wat je met de tekst doet), "markeren" (gevonden gegeven). Synoniemen zoals scan, check, anonimiseren, scrubben en verwerken verdwijnen uit de UI.
- Twee modi met een resultaatzin, zodat de verwachting vooraf klopt:
  - **Tekst controleren**, "Plak of upload tekst. PiM geeft een oordeel en een veilige versie die je kunt kopiëren, exporteren of naar een AI sturen."
  - **Zelf schrijven**, "Schrijf in de editor. PiM markeert persoonsgegevens terwijl je werkt en kan ze vervangen. Opslaan als docx."
- `ModeSwitcher`: twee tabs met die labels, de resultaatzin als tooltip. Bij lege staat staan beide modi als twee kaarten met dezelfde zinnen.
- Publieke pagina's die nog drie modi uitleggen (`_site.modes.tsx`, `_site.index.tsx`, `_site.pipeline.tsx`, `_site.scenarios.tsx`, `_site.architecture.tsx`) worden gelijkgetrokken met deze twee namen.

## Fase 2, routes en modes samenvoegen

- `ProductMode` wordt `"check" | "write"` in `types.ts`; `app.search.ts` accepteert `quick` en `start` en normaliseert die naar `check`, zodat oude links blijven werken. `try.tsx` en `schrijven.tsx` volgen dezelfde normalisatie.
- `QuickMode.tsx` en `StartMode.tsx` gaan op in één `CheckMode.tsx`. De zes-stappenbalk wordt `PipelineSteps`, uitklapbaar onder het resultaat ("Hoe PiM tot dit oordeel komt"), standaard dicht.
- `app.tsx` head-teksten teruggebracht tot twee modi.

## Fase 3, één analysemodel

- Gedeelde state in `ProductShell`: `analysisMode: "live" | "manual"`, `runAnalysis()` en `isStale`.
- **Live meelezen** (standaard bij controleren) of **Analyseren als ik klaar ben** (standaard bij schrijven), omschakelbaar met één toggle bij de werkbalk. De knop **Controleer** is er altijd, ook live, als handmatige herhaling.
- De eigen analyseknop en debounce-logica in `WriterWorkspace.tsx` en de verborgen debounce in de checkmodus verdwijnen; beide roepen de shell aan. `useNerSpans` blijft de runtime, maar wordt door de shell aangestuurd in plaats van per modus.

## Fase 4, één instellingenplek

- In de werkbalk blijven alleen de twee dagelijkse keuzes: **Anonimiseren als** (anoniem of pseudoniem) en **Bestemming**. Het woord "modus" wordt daar niet meer gebruikt.
- Al het andere in één paneel **Instellingen** (`ExpertPanel` wordt `SettingsPanel`, één event `pim:open-settings`), te openen vanuit één knop in de footer. Het tandwiel in `InputPanel` en het losse menu-item in `BurgerMenu` verdwijnen; het menu verwijst naar diezelfde knop.

### Instellingen per functie nagelopen op dubbeling

- **Detectielagen** (Regex, Lexicon, Context, BERT): vier bronnen die dezelfde categorieën kunnen vinden. Eén blok **Waar PiM op zoekt**, met per laag één zin in gewone taal en zichtbaar welke categorieën die laag dekt. Ze blijven apart, want kosten en risico verschillen echt.
- **Categorieën aan/uit** versus **drempels** versus **strict**: drie plekken die bepalen of iets een hit wordt. Eén blok **Wat PiM markeert**, categorielijst als hoofdvorm, drempel en strict als geavanceerde regel daarbinnen.
- **Categorie uitzetten** versus **auto-vervangen per categorie**: nu twee bijna identieke lijsten (detectie en writer). Eén lijst met per categorie twee schakelaars: markeren en automatisch vervangen.
- **Strenge cijfercontrole** (writer) versus **strict mode**: samen één instelling **Streng met cijfers en codes**, geldig in beide modi.
- **Live wissen** in de invoerbalk versus writer auto-redact: één instelling **Automatisch vervangen**, met dezelfde categorielijst voor beide modi.
- **BERT-varianten** (Uit, 100 MB, 180 MB): blijft één keuze, met verwachtingszinnen over download, snelheid en meerwaarde, plus de bestaande laad- en testknop en voortgangsbalk.
- **Modelintegriteit en status** verdwijnen uit Instellingen en staan alleen nog in Diagnostiek: instellingen bevat keuzes, geen status.

## Fase 5, feedback op het scherm: één verhaal in vier lagen

Nu geeft PiM tegelijk feedback via oordeelkaart, chips, markeringen in de tekst, zijbalk "Wat PiM vond", risicoscore, "PiM leest mee", egress-melding, mapping en diagnostiek, met verschillende woorden en tellingen. Terug naar vier lagen met elk één rol:

1. **Oordeel**: één kaart met veilig of geblokkeerd, één reden in gewone taal en de vervolgstap. Enige plek met een verdict (`SafetyVerdictCard`).
2. **Wat gevonden is**: één lijst met categorie en aantal. `FindingChips` en de zijbalklijst in de writer worden dezelfde component met dezelfde telling; klikken springt naar de eerste markering in de tekst.
3. **De tekst zelf**: markeringen in origineel en veilige versie (`TextHighlighter`, `pimPlugin`) met exact dezelfde kleuren en labels als laag 2.
4. **Verantwoording**: één paneel met mapping, detectoren, modelstatus, beleidsregel en tijdstip van de laatste controle. `DetailsDrawer`, `MappingViewer` en `LiveTechMonitor` worden hier samengevoegd tot één Diagnostiek-paneel met tabbladen; de knop onder een resultaat opent hetzelfde paneel op het juiste tabblad.

Dubbelingen die verdwijnen:

- **Twee tellingen** van bevindingen (resultaat en zijbalk) worden één bron.
- **Risicoscore in punten** (`RiskGauge`, `RiskBanner`) wordt secundair binnen de oordeelkaart met één zin uitleg, niet meer een losse score naast het verdict.
- **Statusruis** ("PiM leest mee", spinner, "Bewerkt, opnieuw beoordeeld", footerstatus) wordt één statusregel met vier toestanden: klaar, bezig, verouderd, fout.
- **Uitkomstmeldingen**: egress-melding en knopstaat in `ResultActions` worden één melding onder de knop.
- **Verouderde uitkomst** wordt expliciet: na tekstwijziging dimt het resultaat met "Tekst gewijzigd, controleer opnieuw".
- **Footer** houdt alleen versie, lokale modus, Instellingen en Diagnostiek; geen bevindingen.
- **Scheiding blijft zichtbaar**: bij schrijven ligt de nadruk op markeringen in de tekst en de lijst ernaast, bij controleren op oordeel en veilige versie. Zelfde componenten, andere volgorde, dezelfde woorden.

## Fase 6, restopruiming

- Twee resets in `BurgerMenu` ("Nieuwe tekst" en "Lokale opslag wissen") krijgen elk een expliciet label met één zin uitleg, in één sectie.
- De ongebruikte niet-compacte hero-variant van `InputPanel` verwijderen als die nergens meer gerenderd wordt; hetzelfde geldt voor `UspGrid` en `PipelineTimeline` als die na fase 1 nergens meer voorkomen.
- Elke overgebleven knop krijgt een korte uitlegzin of tooltip in gewone taal.

## Betrokken bestanden

- Shell en modi: `product/ProductShell.tsx`, `ProductShellContext.tsx`, `AppHeader.tsx`, `ModeSwitcher.tsx`, `StatusFooter.tsx`, `types.ts`, `modes/CheckMode.tsx` (nieuw, vervangt Quick en Start), `modes/WriteMode.tsx`.
- Instellingen: `ExpertPanel.tsx` naar `SettingsPanel.tsx`, `start-go/AdvancedPanel.tsx`, `hooks/usePimSettings.ts`, `lib/pim/detectionSettings.ts` (alleen UI-mapping, geen gedragswijziging).
- Feedback: `SafetyVerdictCard.tsx`, `FindingChips.tsx`, `ResultPanel.tsx`, `ResultActions.tsx`, `TextHighlighter.tsx`, `DetailsDrawer.tsx`, `MappingViewer.tsx`, `LiveTechMonitor.tsx`, `RiskGauge.tsx`, `RiskBanner.tsx`, `AnonymizedText.tsx`.
- Invoer en schrijven: `start-go/InputPanel.tsx`, `ExamplePicker.tsx`, `BurgerMenu.tsx`, `StartHeader.tsx`, `writer/WriterWorkspace.tsx`, `writer/pimPlugin.ts`, `writer/pimGeneralizations.ts`.
- Routes en teksten: `routes/app.tsx`, `app.search.ts`, `try.tsx`, `schrijven.tsx`, `_site.index.tsx`, `_site.modes.tsx`, `_site.pipeline.tsx`, `_site.scenarios.tsx`, `_site.architecture.tsx`, `_site.compliance.tsx`, `_site.trust.tsx`, `lib/pim/copy.ts`.
- Documentatie: `docs/GOLDEN_PATH.md`, `ROADMAP.md`, `CHANGELOG.md`.
- Ongewijzigd: engine, detectors, policy, egressGuard, modelIntegrity, modelCatalog, secureMapping. Dit is een UI- en copylaag-wijziging.

## Tests en controles

- Aanpassen: `__tests__/ProductShell.test.tsx`, `ProductModesNer.test.tsx`, `WriteMode.test.tsx`, `WriterNerSource.test.tsx`, `sliceC.test.tsx`, `routes/__tests__/appSearch.test.ts`, `redirects.test.ts`, `routeChrome.test.tsx` op de nieuwe modenamen en de enkele settings-trigger.
- Nieuw: normalisatie `quick`/`start` naar `check`; live versus handmatige analyse in beide modi; verouderd-resultaat na tekstwijziging; één telling in resultaat en zijbalk; automatisch vervangen werkt vanuit één instelling in beide modi.
- Parity-tests van de engine (`startGoParity`, `tryPageParity`, `writerParity`) moeten ongewijzigd groen blijven; dat bewijst dat het gedrag van de pipeline niet verandert.
- Afronding: volledige suite, typecheck, lint en een browsercontrole van beide modi op mobiel en desktop.
