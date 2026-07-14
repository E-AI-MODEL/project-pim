# Project PiM masterplan

## Doel
Project PiM wordt een browser-first, local-first privacyproduct voor onderwijsprofessionals. Het product helpt tekst controleren, veilig herschrijven en alleen via gecontroleerde acties uitvoeren.

## Productbelofte
- Ruwe tekst blijft in de browser.
- Pseudonieme tekst wordt nooit als anoniem behandeld.
- Alleen een opnieuw gecontroleerde, anonieme payload mag kopieren, downloaden, printen, delen of naar een geconfigureerde externe AI-route gaan.
- Iedere zichtbare functie werkt echt of wordt duidelijk als niet beschikbaar getoond.

## Productervaring
PiM is een werkproduct, geen documentatiesite of technische demo. De hoofdflow bestaat uit een herkenbare documentomgeving met invoer, bevindingen, veilige versie en toegestane acties. Technische instellingen, testpanelen en architectuurinformatie horen buiten de normale productflow.

## Werkmodel
- GitHub is het controlepunt.
- Lovable is bouw- en previewomgeving.
- Een taak gebruikt een featurebranch en een schrijvende agent.
- Wijzigingen gaan via pull requests naar main.
- Main moet altijd bouwbaar en beoordeelbaar blijven.

## Uitvoeringsfasen
1. Governance: instructies, productkader, UX-kader, threat model en releasegates.
2. Architecture Lock: een centrale evaluatiemotor, policy en risicoberekening.
3. Security Lock: egress-autorisatie, certificering, netwerkbeleid en modelintegriteit.
4. Product Shell: een primaire PiM-werkomgeving en verwijdering van demo-navigatie.
5. Editor Workspace: documentbewerking, bevindingen, veilige versie en echte acties.
6. Release Candidate: tests, toegankelijkheid, performance, dependency-audit en productiecontrole.

## Definition of Done
Een wijziging is pas klaar wanneer scope, privacy-effect, tests, typecheck, lint, build en Lovable-preview zijn gecontroleerd. Geen functie wordt als werkend beschreven zonder implementatie en verificatie.
