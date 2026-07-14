# Project PiM product charter

## Probleem
Onderwijsprofessionals werken dagelijks met tekst waarin persoonsgegevens en gevoelige context voorkomen. Zij hebben een laagdrempelige manier nodig om tekst te controleren en veilig te gebruiken zonder eerst privacy-expert te worden.

## Doelgroep
Primair: docenten, mentoren, ondersteuners en schoolmedewerkers.

Secundair: privacycoordinatoren, functioneel beheerders, ontwikkelaars en auditors.

## Kernopdracht
PiM helpt een gebruiker in een vertrouwde documentcontext:
1. tekst openen of invoeren;
2. privacygevoelige informatie herkennen;
3. een veilige versie beoordelen;
4. alleen toegestane uitvoeracties uitvoeren.

## Niet-doelen
PiM is niet:
- een algemene tekstverwerker;
- een marketingwebsite;
- een dashboardverzameling;
- een AI-showcase;
- een complianceclaim zonder technisch bewijs;
- een vervanging voor professioneel juridisch advies.

## Productprincipes
- Local first.
- Veilig falen.
- Een primaire gebruikersflow.
- Gewone Nederlandse taal.
- Techniek is ondergeschikt aan de taak.
- Geen decoratieve of niet-werkende functies.
- Iedere privacybeslissing is reproduceerbaar en uitlegbaar.

## Succescriteria voor versie 1
- Een nieuwe gebruiker begrijpt de hoofdtaak zonder handleiding.
- De normale flow bevat geen technische instellingen.
- Ruwe en pseudonieme tekst kunnen geen egress-autorisatie krijgen.
- Handmatig gewijzigde tekst wordt opnieuw gecontroleerd.
- Alle primaire acties hebben werkende succes-, fout- en blokkadestaten.
- De productiebuild slaagt en de Lovable-preview is gecontroleerd.
