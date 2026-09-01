# PiM Light: mobiele versie

Een aparte mobiele opmaak van het bestaande product. Zelfde motor, zelfde privacybelofte, maar een layout en set verwachtingen die op een telefoon kloppen.

## Wat een telefoon aankan (uitgangspunt)

De zware taalmodellen draaien nu in de browser. Wat daarvan realistisch is op mobiel:

- Regelherkenning (namen, e-mail, telefoon, BSN, IBAN, leerlingnummer, groep/klas) kost vrijwel niets en werkt overal, ook offline en op oudere toestellen.
- Het slimme model (DistilBERT, ongeveer 100 MB download) is technisch mogelijk op moderne telefoons, maar kost mobiele data, laadt traag en kan op toestellen met weinig geheugen de tab laten crashen. Het grotere model (ongeveer 180 MB) en het herschrijfmodel (ongeveer 400 MB) zijn op telefoons niet verantwoord.
- Daarom op mobiel: regelherkenning altijd aan, het slimme model alleen na een expliciete keuze met een eerlijke waarschuwing, de zware modellen niet aanbiedbaar.

Concreet gedrag: bij het openen van de instellingen op mobiel toont PiM welke laag actief is, hoeveel de download is, en dat het alleen zin heeft op wifi. Bij weinig geheugen of een oudere telefoon blijft de knop zichtbaar maar met de melding dat het model waarschijnlijk niet past.

## Wat er verandert per scherm

### Header

Een regel: logo, "Lokale modus", menuknop. De uitlegzin en de modus-tabs verhuizen naar de inhoud, zodat de header niet twee lagen hoog is.

### Modekeuze

Twee volledig breedte kaarten boven de inhoud, elk met een titel en een verwachtingsregel:

- Tekst nakijken: "Plak een tekst, PiM zegt of je hem kunt delen."
- Zelf schrijven: "Schrijf zelf, PiM markeert gegevens in je tekst."

### Tekst nakijken (mobiel)

Gestapeld in vaste volgorde: invoerveld, dan een vaste knop onderaan het scherm "Kijk mijn tekst na", dan de uitkomst. Analyse start altijd handmatig, ook bij nakijken; live meelezen blijft desktop-gedrag. Bij wijziging van de tekst wordt de oude uitkomst gedimd met "Tekst gewijzigd, kijk opnieuw na".

Uitkomst: eerst de uitspraak (Klaar om te delen / Nog niet delen), dan de gevonden gegevens als chips, dan een schakelaar Origineel/Zonder gegevens, dan kopieer- en downloadknoppen. Details en stappen blijven ingeklapt.

### Zelf schrijven (mobiel)

De editor krijgt de volle breedte. De zijbalk met bevindingen wordt een uitschuifblad onderaan met een teller ("3 gevonden"), zodat de tekst nooit wordt weggedrukt. Analyseren gebeurt met dezelfde vaste knop onderaan.

### Instellingen

Eén vol scherm in plaats van een zijpaneel, met dezelfde twee groepen als op desktop ("Waar PiM op zoekt", "Wat PiM markeert") plus het mobiele modelblok hierboven.

### Voettekst

Op mobiel teruggebracht tot één regel met de lokale-modus-status; de technische regels blijven achter "Technische details".

## Technisch

- Nieuwe hook of gebruik van de bestaande `useIsMobile` om in `ProductShell` een mobiele opmaak te kiezen; geen aparte route, geen dubbele logica.
- `AppHeader`: modus-tabs en uitlegregel alleen tonen vanaf `sm`; op mobiel rendert de nieuwe kaartkeuze in de inhoud.
- `CheckMode` en `WriterWorkspace`: layout-varianten (gestapeld, vaste actiebalk onderaan) plus `analysisMode` forceren op `manual` wanneer mobiel; alle engine- en NER-aanroepen blijven ongewijzigd.
- Bevindingenzijbalk van de schrijfmodus naar een bottom sheet op mobiel (Sheet-component), zelfde databron.
- `SettingsPanel`: volledig scherm op mobiel, plus een mobielblok dat modelkeuzes filtert. Model-detectie via `navigator.deviceMemory` en `navigator.hardwareConcurrency` met veilige terugval als die ontbreken.
- Grid: overal `grid-cols-[minmax(0,1fr)_auto]` met `min-w-0` en `shrink-0` in koprijen, zoals de bestaande responsieve regels voorschrijven.
- Tests: mobiele opmaak (matchMedia gemockt) voor beide modi, handmatige analyse op mobiel, en dat zware modellen op mobiel niet startbaar zijn.

## Buiten scope

Geen nieuwe detectielogica, geen wijziging aan de motor of het beslismodel, geen nieuwe route en geen native app.
