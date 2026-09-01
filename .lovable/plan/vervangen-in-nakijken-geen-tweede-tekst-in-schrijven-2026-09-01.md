# Vervangen in Nakijken, geen tweede tekst in Schrijven

Twee correcties: de klik-en-vervang werkwijze uit Zelf schrijven komt naar Tekst nakijken, en de opgeschoonde tweede tekst verdwijnt uit Zelf schrijven.

## 1. Markering aanklikken en vervangen (Tekst nakijken)

In je eigen tekst zijn de gevonden stukken gearceerd. Klik je op zo'n arcering, dan verschijnt hetzelfde bubbeltje als in Schrijven:

```text
[ Vervang ]  [ Negeer ]  [x]
```

- Vervang zet het gearceerde stuk om naar het passende label, bijvoorbeeld [LEERLING] of [SCHOOL], direct in je eigen tekst.
- Negeer laat het stuk staan en haalt de arcering weg tot je de tekst weer wijzigt.
- Na een wijziging loopt de analyse opnieuw, precies zoals nu.
- Dit werkt alleen op het tabblad met je eigen tekst; de veilige versie blijft zoals hij is.
- Op mobiel doet een tik hetzelfde als een klik.

## 2. Zelf schrijven toont maar één tekst

De kaart "Tekst zonder persoonsgegevens" met de tweede, opgeschoonde tekst verdwijnt uit het schrijfscherm. Je schrijft daar in één tekst en werkt de arceringen weg met Vervang/Negeer, zoals bedoeld.

De knoppen Kopiëren, Downloaden en Naar AI blijven bestaan; die staan voortaan onder de bevindingen en werken op de tekst zoals die op dat moment in de editor staat. De melding na kopiëren of delen blijft ongewijzigd.

## Technische uitwerking

- `src/components/pim/start-go/HighlightedTextArea.tsx`: klik in het tekstvlak vertaalt `selectionStart` naar de bijbehorende span; positie van het bubbeltje via de bounding rect van de bijbehorende `<mark>` in de overlay. Nieuwe optionele props `onSpanAction(span, "replace" | "ignore")`.
- `src/components/pim/start-go/InputPanel.tsx`: geeft de nieuwe props door; het bubbeltje wordt gerenderd naast het tekstvlak (zelfde vormgeving als het bubbeltje in `WriterWorkspace`).
- `src/components/pim/product/modes/CheckMode.tsx`: handelt Vervang af door de tekst te herschrijven met het label uit `GENERALIZATIONS` (`src/components/pim/writer/pimGeneralizations.ts`) en `setText` aan te roepen; Negeer houdt een lokale lijst van genegeerde bereiken bij, die bij elke tekstwijziging leegloopt.
- `src/components/pim/writer/WriterWorkspace.tsx`: `SafeVersionCard` verwijderen; de drie acties naar een compacte actierij onder `FindingsCard`, met dezelfde handlers en `requestAction`-egresscontrole. `buildSafeText` blijft in gebruik als payload voor die acties.
- Tests: `src/components/pim/product/__tests__` uitbreiden met een test die het bubbeltje in Nakijken opent en Vervang uitvoert, plus aanpassing van bestaande writer-tests die de veilige-versiekaart verwachten.
