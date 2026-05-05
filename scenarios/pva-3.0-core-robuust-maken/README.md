# PVA 3.0 - core robuust maken

Status: concept-PVA
Doelrepo: `E-AI-MODEL/project-pim`
Bronlijn: `Project-PiM-source-v3.md`

## Doel

Breng de bestaande Project PiM-code eerst op orde in de core. Niet starten met extra integraties of nieuwe schermen. De beslislaag moet eerst betrouwbaar, testbaar en fail-closed zijn.

De eerste stap is:

```txt
PIM-core robuust maken volgens v3.
```

## Waarom deze stap eerst

PiM moet per actie afdwingen wat wel en niet mag. Alle latere routes hangen daaraan:

- upload of import;
- OCR;
- feedback op teksten;
- analyse;
- lokale opslag;
- delen of export;
- koppeling met EAI Classroom, EAI Studio of UMDT.

Als de core niet hard klopt, kan elke integratie alsnog fout gedrag toestaan.

## V3-lijn

Dit PVA blijft in lijn met v3 als deze keuzes blijven staan:

1. `Project PiM` is de productnaam.
2. `Privacy Integrity Monitor` is de volledige naam.
3. `PIM` is alleen de deterministische beslislaag.
4. Release 1 gebruikt alleen `education-nl-full` en `education-nl-rules-only`.
5. Mapping blijft lokaal.
6. Pseudonieme output blijft lokaal.
7. Uitgaande routes gebruiken alleen anonieme output na alle guards.
8. Audit bevat geen tekstinhoud.
9. Er komt geen claim van volledige anonimiteit.

## Richting

PiM wordt middleware in onderwijsflows:

```txt
input -> OCR/import -> PiM -> veilige draft -> feedback/analyse -> docent
```

Voorbeelden:

- UMDT: toets en antwoorden uploaden, OCR, PiM, reflectie op denkfouten.
- EAI Studio: docent maakt opdracht, leerlingen leveren essays in, PiM verwerkt voor feedback.
- EAI Classroom: PiM als vaste privacylaag voor leerlingteksten.

## Belangrijke grens

Pseudoniem kan alleen voor lokale verwerking. Zodra tekst naar een uitgaande route gaat, moet PiM naar anoniem en moet PIM expliciet toestaan.

## Resultaat

Aan het eind ligt er:

- een v3-conforme PIM-core;
- een vaste ingang voor beslissingen;
- een harde guard voor uitgaande acties;
- tests voor de v3-invarianten;
- release-1 profielvalidatie;
- een middleware-contract voor onderwijsapps;
- CI die onveilige wijzigingen stopt.

## Niet in scope

Nog niet:

- browserextensie;
- Docs of Office add-on;
- zorgprofiel;
- generieke profielen;
- nieuw dashboard;
- server-feedbackroute.

Zie ook:

- `01-stappenplan.md`
- `02-middleware-casus-onderwijs.md`
- `03-v3-checklist.md`
