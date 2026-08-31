# Tekst nakijken opschonen + regelset flink uitbreiden

## 1. Eén tekst in beeld, niet drie

Nu staat dezelfde tekst drie keer onder elkaar in "Tekst nakijken": het invoerveld, het bewerkbare origineel met markeringen, en het veilige tekstvak. Dat wordt teruggebracht tot één tekstvlak met een schakelaar.

Nieuwe opbouw van het scherm:

```text
[ status  |  nieuwe tekst ]
[ Origineel | Veilige versie ]      <- schakelaar boven het tekstvlak
[ één tekstvlak, bewerkbaar, met markeringen erin ]
[ uitspraak + reden + acties ]
[ bevindingen ]
[ details dicht ]
```

- Het invoerveld en het resultaatvlak worden hetzelfde vlak. Zolang er nog geen uitkomst is, zie je gewoon het lege tekstvlak met de voorbeeldkiezer.
- "Origineel" toont je eigen tekst met markeringen erin, direct bewerkbaar, zoals in Schrijven.
- "Veilige versie" toont de opgeschoonde tekst, ook bewerkbaar, met dezelfde herbeoordeling als nu.
- De uitspraakkaart schuift naar boven het tekstvlak zodat de volgorde status → tekst → acties is.

## 2. Reageren zoals in Schrijven

Het schrijfscherm voelt prettiger omdat markeringen in de tekst zelf staan en meteen meebewegen. Nakijken krijgt dezelfde markeeraanpak: één overlay met gekleurde markeringen op het bewerkbare vlak, in plaats van een los gemarkeerd blok onder een kaal tekstvak. Analysemodel (live op desktop, knop op mobiel) blijft ongewijzigd.

## 3. Veel bredere regelset (regex en vaste regels)

De huidige set haalt te weinig eruit. De regelset wordt uitgebreid met onder meer:

- Contact: e-mailvarianten met plus/punt-notatie, "naam [at] domein", internationale en doorkiesnummers, 06-nummers met scheidingstekens, WhatsApp-notaties.
- Identificatie: paspoort- en ID-nummers, rijbewijsnummer, V-nummer, BRIN-nummer, KvK, btw-nummer, DigiD-verwijzingen, verzekerings-/UZOVI- en polisnummers, zorgverzekeringsnummer.
- Onderwijs: leerlingnummer met meer trefwoorden (lln, pgn, onderwijsnummer, inschrijfnummer), klas/groep in meer schrijfwijzen (groep 7b, 3havo, 4-VWO, klas 2A, brugklas), leerjaar, mentorgroep, cijferlijst-/rapportverwijzing, IB-, OPP-, DUO-, LVS-, Cito- en dyslexieverwijzingen.
- Adres: straat + huisnummer met toevoeging, postbus, postcode-varianten zonder spatie en met kleine letters, plaats + wijk, "woont aan de ...".
- Datum/tijd: geboortedatum in tekst, dd-mm-jjjj, d januari 2026, leeftijd ("12 jaar oud"), schooljaaraanduiding.
- Financieel: IBAN met en zonder spaties, rekeningnummer-trefwoorden, bedragen gekoppeld aan een persoon, incasso/machtiging.
- Digitaal: URL's met paden, e-maildomeinen van scholen, IPv4/IPv6, MAC-adres, gebruikersnamen en social handles, Teams-/Zoom-links, bestandsnamen met een naam erin.
- Namen: meer tussenvoegsels en samenstellingen, initialen (J.P. de Vries), naam met titel (dhr./mevr./juf/meester), voor- en achternaam gescheiden door een komma, en hoofdletterongevoelige varianten.
- Context: extra signaalwoorden voor zorg, gedrag, incident, thuissituatie, juridisch, gezondheid, geloof/afkomst, en prestaties.

Uitgangspunten hierbij:
- Alles blijft lokaal en regelgebaseerd, geen extra netwerkverkeer.
- Nieuwe regels vallen onder bestaande categorieën waar dat kan; alleen waar echt nodig komt er een categorie bij, zodat instellingen en zijbalk niet uitdijen.
- Validators blijven leidend voor BSN, IBAN, creditcard en kenteken, zodat de strengere modus geen ruis oplevert.

## Technische uitwerking

- `src/components/pim/product/modes/CheckMode.tsx`: invoer en resultaat samenvoegen tot één vlak; `InputPanel` alleen nog voor modus/actie-keuze en voorbeelden.
- `src/components/pim/start-go/ResultPanel.tsx`: dubbele tekstvakken vervangen door één tabvlak met markeringsoverlay; herbeoordeling van de bewerkte veilige tekst blijft intact.
- Markeringsoverlay hergebruikt de aanpak uit `TextHighlighter` en de writer-plugin, in een klein gedeeld component.
- `src/lib/pim/detectors.ts`: regelset uitbreiden; `src/lib/pim/writer/validators.ts` uitbreiden waar een nieuwe checksum nodig is.
- Tests: uitbreiden van `src/lib/pim/__tests__/detectors.test.ts` en `detectionQuality.test.ts` met positieve en negatieve gevallen per nieuwe regel; UI-test die bevestigt dat de tekst nog maar één keer in beeld staat.
