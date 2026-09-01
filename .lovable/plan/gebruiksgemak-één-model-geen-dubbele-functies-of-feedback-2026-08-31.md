# Gebruiksgemak: één model, geen dubbele functies of feedback

## Eerst je punt: de woorden moeten uit de wereld van de gebruiker komen

"Veilige versie", "vervangen", "bestemming" en "verdict" zijn woorden die kloppen als je weet hoe de motor werkt. Een leerkracht of begeleider denkt niet in versies en vervangingen, maar in: kan ik dit zo doorsturen, en wat staat er nog in dat niet naar buiten mag. De taal wordt dus omgedraaid naar wat de gebruiker wil bereiken.

| Nu (motor-taal)                  | Straks (gebruikerstaal)                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| Tekst controleren / scan         | **Tekst controleren**                                                                 |
| Verdict veilig / block           | **Klaar om te delen** / **Nog niet delen**                                            |
| Veilige versie                   | **Tekst zonder persoonsgegevens**                                                     |
| Anonimiseren / pseudonimiseren   | **Anonimiseren / pseudonimiseren**                                                    |
| Vervangen / redactie / live wipe | **Gegevens weghalen** (automatisch of per woord/ tekstdeel)                           |
| Bestemming                       | **Welke stap wil je hierna?**(kopiëren, downloaden, naar een AI-chat)                 |
| Findings / markeringen           | **Wat PiM gevonden heeft**, per soort: namen, adressen, geboortedata, leerlingnummers |
| Risicoscore                      | verdwijnt als getal, wordt één zin: "Nog 3 namen en 1 leerlingnummer in de tekst"     |
| Detectielagen / BERT             | **Hoe streng PiM meekijkt** (basis, uitgebreid, slim taalmodel)                       |

Regel voor alle teksten: benoem het gegeven en de gevolgen, niet de bewerking. Dus niet "2 entiteiten vervangen" maar "2 namen weggehaald, deze tekst kun je delen".

## Wat is het verschil tussen de twee schermen?

- **Tekst nakijken** (nu "Snel checken" + "Stap voor stap"): je plakt tekst of laadt een document en je hoort of het weg mag, met een versie zonder persoonsgegevens erbij. Poortwachter.
- **Zelf schrijven**: je typt in een schrijfscherm en PiM kleurt persoonsgegevens terwijl je bezig bent, en kan ze meteen weghalen. Werkruimte.

Ze delen dezelfde motor, maar het gebruik verschilt echt. Daarom blijft Zelf schrijven apart en gaan Snel checken en Stap voor stap samen: die twee delen invoerveld, motor en uitkomst, alleen de stappenbalk verschilt.

Resultaat: twee schermen, één manier van analyseren, één instellingenplek, één terugkoppeling.

## Fase 1, taal en schermen vastzetten

Eerst de woorden, want alle latere schermen gebruiken ze.

- Woordenlijst uit de tabel hierboven vastleggen in `src/lib/pim/copy.ts` en overal toepassen. Programmeerwoorden (verdict, entity, redactie, sanitize, scan, egress, pipeline) verdwijnen uit alles wat de gebruiker ziet; ze mogen in code en in Diagnostiek blijven staan.
- Twee schermen met een verwachtingszin, zodat vooraf duidelijk is wat je terugkrijgt:
  - **Tekst nakijken**, "Plak of upload je tekst. Je hoort of je hem mag delen en krijgt een versie zonder persoonsgegevens."
  - **Zelf schrijven**, "Schrijf hier je tekst. PiM kleurt persoonsgegevens terwijl je typt en haalt ze op verzoek weg. Opslaan als Word-bestand."
- `ModeSwitcher`: twee tabs met die namen, de verwachtingszin eronder of als tooltip. Bij een leeg scherm staan beide als twee kaarten met dezelfde zinnen.
- Publieke pagina's die nog drie modi uitleggen (`_site.modes.tsx`, `_site.index.tsx`, `_site.pipeline.tsx`, `_site.scenarios.tsx`, `_site.architecture.tsx`) worden gelijkgetrokken met deze twee namen en deze woordenlijst.

## Fase 2, routes en modes samenvoegen

- `ProductMode` wordt `"check" | "write"` in `types.ts`; `app.search.ts` accepteert `quick` en `start` en normaliseert die naar `check`, zodat oude links blijven werken. `try.tsx` en `schrijven.tsx` volgen dezelfde normalisatie.
- `QuickMode.tsx` en `StartMode.tsx` gaan op in één `CheckMode.tsx`. De zes-stappenbalk wordt `PipelineSteps`, uitklapbaar onder de uitkomst ("Hoe PiM dit heeft bekeken"), standaard dicht.
- `app.tsx` head-teksten teruggebracht tot twee modi.

## Fase 3, één analysemodel

- Gedeelde state in `ProductShell`: `analysisMode: "live" | "manual"`, `runAnalysis()` en `isStale`.
- **PiM kijkt mee terwijl ik typ** (standaard bij nakijken) of **Pas kijken als ik klaar ben** (standaard bij schrijven), omschakelbaar met één keuze bij de werkbalk. De knop **Nu nakijken** is er altijd, ook als PiM meekijkt.
- De eigen analyseknop en debounce-logica in `WriterWorkspace.tsx` en de verborgen debounce in de checkmodus verdwijnen; beide roepen de shell aan. `useNerSpans` blijft de runtime, maar wordt door de shell aangestuurd in plaats van per modus.

## Fase 4, één instellingenplek

- In de werkbalk blijven alleen de twee dagelijkse keuzes: **Namen weghalen of codenamen gebruiken** en **Waar gaat de tekst heen**. Het woord "modus" komt daar niet meer voor.
- Al het andere in één paneel **Instellingen** (`ExpertPanel` wordt `SettingsPanel`, één event `pim:open-settings`), te openen vanuit één knop in de footer. Het tandwiel in `InputPanel` en het losse menu-item in `BurgerMenu` verdwijnen; het menu verwijst naar diezelfde knop.

### Instellingen per functie nagelopen op dubbeling

- **Detectielagen** (Regex, Lexicon, Context, BERT): vier bronnen die hetzelfde kunnen vinden. Eén blok **Hoe streng kijkt PiM mee**, met per niveau één zin in gewone taal en wat het extra vindt. Ze blijven apart, want snelheid en zwaarte verschillen echt.
- **Categorieën aan/uit** versus **drempels** versus **strict**: drie plekken die bepalen of iets meetelt. Eén blok **Waar moet PiM op letten**, met de soorten gegevens (namen, adressen, geboortedata, leerlingnummers, klas) als hoofdvorm; gevoeligheid en streng zijn een geavanceerde regel daarbinnen.
- **Categorie uitzetten** versus **auto-vervangen per categorie**: nu twee bijna identieke lijsten. Eén lijst met per soort twee schakelaars: **laten zien** en **meteen weghalen**.
- **Strenge cijfercontrole** (writer) versus **strict mode**: samen één instelling **Ook twijfelgevallen met cijfers en codes meenemen**, geldig in beide schermen.
- **Live wissen** in de invoerbalk versus writer auto-redact: één instelling **Gegevens meteen weghalen**, met dezelfde lijst voor beide schermen.
- **BERT-varianten** (Uit, 100 MB, 180 MB): één keuze **Slim taalmodel**, met zinnen over eenmalige download, snelheid en wat het extra vindt, plus de bestaande laadknop, testknop en voortgangsbalk.
- **Modelintegriteit en status** verdwijnen uit Instellingen en staan alleen nog in Diagnostiek: instellingen bevat keuzes, geen status.

## Fase 5, terugkoppeling op het scherm: één verhaal in vier lagen

Nu geeft PiM tegelijk feedback via oordeelkaart, chips, kleuren in de tekst, zijbalk, risicoscore, "PiM leest mee", egress-melding, mapping en diagnostiek, met verschillende woorden en tellingen. Terug naar vier lagen met elk één rol, allemaal in gebruikerstaal:

1. **Mag dit weg?**: één kaart met **Klaar om te delen** of **Nog niet delen**, één reden in gewone taal en de vervolgstap ("Haal de 2 namen weg en je kunt hem versturen"). Enige plek met een uitspraak (`SafetyVerdictCard`).
2. **Wat PiM gevonden heeft**: één lijst met soort gegeven en aantal in gewone woorden (namen, adressen, geboortedata, leerlingnummers). `FindingChips` en de zijbalk in het schrijfscherm worden dezelfde component met dezelfde telling; klikken springt naar die plek in de tekst.
3. **De tekst zelf**: kleuren in de originele tekst en in de tekst zonder persoonsgegevens (`TextHighlighter`, `pimPlugin`), met exact dezelfde kleuren en woorden als laag 2.
4. **Waarom PiM dit zegt**: één paneel met de vervangingen, wat PiM waarop vond, modelstatus, regel en tijdstip. `DetailsDrawer`, `MappingViewer` en `LiveTechMonitor` worden hier samengevoegd tot één paneel met tabbladen; technische taal mag hier wel.

Dubbelingen die verdwijnen:

- **Twee tellingen** van bevindingen (uitkomst en zijbalk) worden één bron.
- **Risicoscore in punten** (`RiskGauge`, `RiskBanner`) verdwijnt als los getal en wordt één zin in de kaart: "Nog 3 namen en 1 leerlingnummer in de tekst".
- **Statusruis** ("PiM leest mee", spinner, "Bewerkt, opnieuw beoordeeld", footerstatus) wordt één statusregel met vier toestanden: klaar, bezig, tekst is veranderd, er ging iets mis.
- **Uitkomstmeldingen**: egress-melding en knopstaat in `ResultActions` worden één zin onder de knop, in de vorm "Gekopieerd zonder persoonsgegevens".
- **Verouderde uitkomst** wordt expliciet: na een wijziging dimt de uitkomst met "Je tekst is veranderd, kijk hem opnieuw na".
- **Footer** houdt alleen versie, lokale modus, Instellingen en Diagnostiek; geen bevindingen.
- **Scheiding blijft zichtbaar**: in Zelf schrijven ligt de nadruk op kleuren in de tekst en de lijst ernaast, in Tekst nakijken op de uitspraak en de tekst zonder persoonsgegevens. Zelfde componenten, andere volgorde, dezelfde woorden.

## Fase 6, restopruiming

- Twee resets in `BurgerMenu` worden "Begin met een lege tekst" en "Wis alles wat op dit apparaat is onthouden", elk met één zin uitleg, in één sectie.
- De ongebruikte niet-compacte hero-variant van `InputPanel` verwijderen als die nergens meer gerenderd wordt; hetzelfde geldt voor `UspGrid` en `PipelineTimeline` als die na fase 1 nergens meer voorkomen.
- Elke overgebleven knop krijgt een korte uitlegzin of tooltip in gewone taal; een copy-review loopt alle zichtbare teksten na op achtergebleven motor-woorden.

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
