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

## 4. Schrijffouten, slordige notatie en bewuste omzeiling

De regels worden zo geschreven dat ze ook werken bij tekst die niet netjes is getypt:

- E-mail: "naam (at) school punt nl", "naam @ school .nl", spaties rond de @, komma in plaats van punt, dubbele punten, ontbrekende punt voor de extensie.
- Telefoon: 06 12345678, 06-12 34 56 78, +31(0)6, 0031 6, puntjes als scheiding, cijfers met spaties per twee, "zes-nul" prefix-typo's zoals 06.12345678.
- BSN en nummers: met punten of streepjes ertussen, met een spatie na drie cijfers, met een letter erin door een typefout (blijft laag vertrouwen zonder elfproef).
- Postcode: 1234ab, 1234 AB, 1234-AB, kleine letters, ontbrekende spatie.
- IBAN: kleine letters, groepjes van vier met extra spaties, met streepjes.
- Namen: dubbele spaties, vergeten hoofdletter (jan de vries), tussenvoegsels aan elkaar (vd Berg, v.d. Berg, vd. Berg), koppeltekens (Jan-Peter), apostrofnamen ('t Hart, d'Angelo), en veelgemaakte schrijfvarianten van tussenvoegsels.
- Klas en groep: groep7, groep 7b, Groep 7B, gr. 7, klas2a, 4 vwo, 4-VWO, havo4.
- Datum: 1-1-26, 01.01.2026, 1 jan 2026, 1e januari, jaar met twee cijfers.
- Bewuste versluiering: cijfers voor letters (j4n), spaties tussen elke letter van een naam, sterretjes of streepjes in een nummer, en "at"/"dot" in plaats van tekens.

Er komt ook een kleine normaliseerstap voor de detectielaag: dubbele witruimte, unicode-koppeltekens, slimme apostrofs en niet-brekende spaties worden gelijkgetrokken voordat de regels lopen. De weergegeven tekst en de posities van de markeringen blijven ongewijzigd; alleen het zoeken wordt toleranter.

## 5. Bronnen voor de regelset

Als referentie voor de uitbreiding worden publieke, open Nederlandse PII-regelsets gebruikt (onder meer MIT-gelicenseerde de-identificatiebibliotheken voor Nederlandse zorgteksten, een Go-bibliotheek met NL-detectoren voor BSN, telefoon, postcode, KvK en ID-documenten, en publieke gists met NL-regexen voor KvK, btw, IBAN en identiteitsbewijzen). De patronen worden overgenomen als inspiratie en opnieuw geschreven in de PiM-stijl; er wordt geen code met een onduidelijke licentie gekopieerd en er komt geen nieuwe dependency bij.

Uitgangspunten hierbij:

- Alles blijft lokaal en regelgebaseerd, geen extra netwerkverkeer.
- Nieuwe regels vallen onder bestaande categorieën waar dat kan; alleen waar echt nodig komt er een categorie bij, zodat instellingen en zijbalk niet uitdijen.
- Validators blijven leidend voor BSN, IBAN, creditcard en kenteken, zodat de strengere modus geen ruis oplevert.
- Tolerante varianten krijgen een lager vertrouwen dan strakke treffers, zodat de drempels in instellingen blijven werken en ruis beheersbaar blijft.

## Technische uitwerking

- `src/components/pim/product/modes/CheckMode.tsx`: invoer en resultaat samenvoegen tot één vlak; `InputPanel` alleen nog voor modus/actie-keuze en voorbeelden.
- `src/components/pim/start-go/ResultPanel.tsx`: dubbele tekstvakken vervangen door één tabvlak met markeringsoverlay; herbeoordeling van de bewerkte veilige tekst blijft intact.
- Markeringsoverlay hergebruikt de aanpak uit `TextHighlighter` en de writer-plugin, in een klein gedeeld component.
- `src/lib/pim/detectors.ts`: regelset uitbreiden; `src/lib/pim/writer/validators.ts` uitbreiden waar een nieuwe checksum nodig is.
- Tests: uitbreiden van `src/lib/pim/__tests__/detectors.test.ts` en `detectionQuality.test.ts` met positieve en negatieve gevallen per nieuwe regel; UI-test die bevestigt dat de tekst nog maar één keer in beeld staat.
