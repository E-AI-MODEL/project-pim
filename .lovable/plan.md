# Eén werkruimte in plaats van twee modi

## Wat het onderzoek laat zien

De twee schermen doen grotendeels hetzelfde werk met verschillende machinerie:

- Beide draaien op dezelfde engine, dezelfde detectoren en dezelfde egress-poort (`requestActionForText`).
- Beide hebben eigen arcering: nakijken via `HighlightedTextArea` (textarea + overlay), schrijven via de Tiptap-plugin. Twee keer onderhoud, twee keer ander gedrag bij klikken/vervangen.
- Beide hebben eigen upload: nakijken accepteert .txt/.md/.csv/.json/.html/.docx, schrijven alleen .docx.
- Beide hebben eigen acties: nakijken via `ResultPanel`/`ResultActions`, schrijven via een eigen `ActionRow`.
- Nakijken heeft daarbovenop een tweede tekstweergave ("Jouw tekst" / "Veilige versie"), waardoor dezelfde inhoud twee keer op het scherm staat en de gebruiker moet begrijpen welke versie leidend is. Dat is de belangrijkste bron van verwarring.
- De keuze tussen de modi zit op drie plekken (header-tabs, mobiele kiezer, `?mode=` in de URL) en levert bij elke wissel een lege of verouderde toestand op.

Conclusie: nakijken voegt geen capaciteit toe die schrijven niet kan hebben. Wat het uniek heeft (brede bestandsupload, voorbeeldteksten, keuze van bestemming, uitspraakkaart met bevindingen en pseudoniemenlijst) zijn losse onderdelen die prima in de werkruimte passen.

## Wat we bouwen

Eén scherm, met een naam die zowel plakken als schrijven dekt: **Werkruimte** (kop in het scherm: "Jouw tekst"). Daarin:

1. Eén tekstvlak (de bestaande editor) waar je tekst in plakt, schrijft of laadt.
2. Eén invoerknop met de brede bestandslijst uit nakijken (.txt, .md, .csv, .json, .html, .docx) plus de voorbeeldteksten.
3. Arcering in de tekst zelf, met vervangen/negeren per markering. Geen tweede tekstweergave meer.
4. Eén actiebalk: bestemming kiezen (klembord, bestand, externe AI) en uitvoeren, altijd via de bestaande egress-poort.
5. Eén uitkomstblok onder de tekst: uitspraak, bevindingen en desgewenst de pseudoniemenlijst, samengevouwen.
6. Eén analysemodel: meelezen tijdens typen op desktop, knop "Nu nakijken" op mobiel, precies zoals nu al in de shell zit.

## Wat verdwijnt

- De modewissel: header-tabs en mobiele kiezer.
- `CheckMode` en de tweede tekstweergave in `InputPanel`.
- De dubbele arceringsmachinerie (`HighlightedTextArea` vervalt zodra de editor de vervang/negeer-bubbel heeft).

## Techniek

- `src/routes/app.tsx` en `app.search.ts`: `?mode=` blijft geaccepteerd maar wordt genegeerd/genormaliseerd naar de werkruimte, zodat oude links en `/try` en `/schrijven` blijven werken (redirect naar `/app`).
- `ProductShell` verliest de `mode`-prop en rendert alleen de werkruimte; `ModeSwitcher` en `MobileModePicker` worden verwijderd.
- `ProductShellContext` houdt de gedeelde toestand (tekst, NER-spans, analysemodel, instellingen) ongewijzigd; er is nog maar één consument.
- Bestandsimport wordt één helper op basis van de bestaande `documentReader` plus `docxIO`.
- Uitkomst hergebruikt `SafetyVerdictCard`, `FindingChips` en `MappingViewer`; `ResultPanel` wordt de gedeelde uitkomstsectie onder de editor.
- Kopiëren, downloaden en versturen blijven exact via `requestActionForText`, inclusief de her-controle en fail-closed gedrag.
- Teksten in `copy.ts`, `types.ts`, landing en headmetadata aangepast naar één werkruimte.

## Tests

- Bestaande modus-tests (`twoModes`, `mobileLight`, `checkModeEditedCopy`, `routeChrome`, `appSearch`) omgeschreven naar de enkele werkruimte.
- Nieuwe tests: bestand met .txt-inhoud landt in de editor, vervangen via de bubbel past de tekst aan, kopiëren loopt door de poort, `?mode=check` en `/try` komen op de werkruimte uit.
- E2E-privacytest aangepast aan het nieuwe scherm; klembord- en fail-closed-assertions blijven ongewijzigd.
