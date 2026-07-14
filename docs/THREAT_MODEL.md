# Project PiM threat model

## Beschermde gegevens
- ruwe gebruikersinvoer;
- anonieme en pseudonieme drafts;
- pseudoniem-mappings;
- gedetecteerde entiteiten en gevoelige context;
- model- en policybeslissingen;
- lokale documentinhoud.

## Vertrouwensgrenzen
1. Gebruikersinvoer in de browser.
2. Detectie- en transformatiekern.
3. Lokale opslag en mappingcontainer.
4. Policy en payloadcertificering.
5. Browser-egress: klembord, bestand, print, share en externe AI.
6. Externe modelbestanden en netwerkresources.

## Belangrijkste dreigingen
- Ruwe of pseudonieme tekst bereikt een browseractie.
- Een caller verklaart zelf een payload als gecertificeerd.
- Handmatig gewijzigde tekst gebruikt een oud veiligheidsbesluit.
- UI-instellingen schakelen verplichte detectie uit.
- Policy en EgressGuard gebruiken verschillende risicoregels.
- Modelbestanden wijzigen zonder geldige integriteitscontrole.
- Debug-, audit- of foutlogs bevatten tekst of mappingwaarden.
- Een dependency of runtimepad doet een ongeautoriseerde netwerkrequest.
- Export of share gebruikt een andere tekst dan de beoordeelde tekst.

## Vereiste beheersmaatregelen
- Een centrale evaluation engine voor preview en pre-egress.
- Fail-closed gedrag voor ontbrekende vereiste modellen en ongeldige certificaten.
- Egress alleen na een volledige herbeoordeling van de werkelijke payload.
- Een tekstgebonden certificaat met policy- en profielversie.
- Productie-egress uitgeschakeld bij diagnostische of verzwakte instellingen.
- Externe netwerktoegang standaard geblokkeerd, met een kleine expliciete allowlist.
- Geen inhoud in telemetry, audit, review queue of foutlogging.
- Tests voor bypasses, wijziging na certificering en payloadtype-misbruik.

## Buiten scope van dit document
Dit document is geen juridische DPIA of formele penetratietest. Voor productiegebruik blijven een onafhankelijke securityreview, privacybeoordeling en hostingcontrole nodig.
