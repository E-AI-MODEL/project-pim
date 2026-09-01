# Volledige functionaliteitscheck vanuit gebruikersperspectief

Doel: niet "de tests zijn groen", maar bewijzen dat een echte gebruiker elke knop, elk veld en elke route kan gebruiken zonder fouten. Alles wat stuk blijkt, wordt in dezelfde run gerepareerd tot 0 fouten.

## Aanpak

Een browserrobot (Playwright) doorloopt de app precies zoals een gebruiker dat doet, klikt alles aan, leest wat er op het scherm verschijnt en maakt screenshots. Elke stap krijgt een oordeel: werkt / werkt niet / onduidelijk. Parallel draaien de technische checks (typecheck, lint, tests, build) en worden console- en netwerkfouten meegelogd.

## Wat wordt doorlopen

### 1. Marketing/site-pagina's

Landing, over, trust, compliance, architectuur, pipeline, modes, scenarios, flags.
Per pagina: laadt hij, is de header identiek, werken alle links, geen console-errors, geen "Privacy in Mind"-restanten, geen em-dash, leesbare kleuren, mobiel (390px) en desktop (1280px).

### 2. Snel checken (/app?mode=quick)

Voorbeeldtekst kiezen, eigen tekst plakken, analyse, bevindingen-chips, markeringen in de tekst, veilige versie, anoniem/pseudoniem wisselen, doelactie wisselen, Kopieren / Downloaden / Naar AI, verdict-kaart en technische details, details-drawer, blokkade-gedrag bij een geblokkeerde actie.

### 3. Stap voor stap (/app?mode=start)

Zelfde tekstflow, plus: stappenbalk loopt correct door, bevindingen en veilige versie komen overeen met Quick, mapping-viewer bij pseudoniem.

### 4. Schrijven (/app?mode=write)

Typen in de editor, Analyseer-knop, "analyseer opnieuw"-status na wijziging, markeringen, privacypaneel rechts, categorie-toggles, veilige versie, kopieren/downloaden, docx-import/export, tekst blijft behouden bij moduswissel.

### 5. Detectiekwaliteit (de inhoudelijke kern)

Een vaste testtekst met: hoofdlettervarianten van namen, kleine letters, achternamen met tussenvoegsel, leerlingnummer met en zonder hoofdletter, "groep 7B", klas 4H2, BSN, e-mail, telefoon, adres, school- en plaatsnaam, geboortedatum, IBAN.
Verwachting per item vastleggen en aftikken; ook controleren dat de veilige versie geen restant en geen corrupte tekst bevat, en dat toegevoegde tekst na een eerdere analyse alsnog wordt gedetecteerd.

### 6. Expertpaneel en menu

Detectielagen aan/uit, drempels, categorieen uitzetten, strict-modus, writer-instellingen, diagnostiek, "Nieuwe tekst" met bevestiging bij writer-inhoud, geschiedenis/opslag wissen.

### 7. NER/BERT

Model laden via Expert (100 MB en 180 MB), status-pill, extra hits in het verdict, en de kernclaim: Quick, Stap voor stap en Schrijven delen een runtime en vragen geen tweede download. Als de download in de testomgeving niet haalbaar is, wordt dat expliciet als "niet geverifieerd" gerapporteerd in plaats van als "werkt".

### 8. Oude routes en randgevallen

/try en /schrijven redirecten, onbekende ?mode-waarde valt terug op quick, 404-pagina, herladen midden in een flow, lege invoer, zeer lange tekst, dubbele klikken.

## Reparatie

Elke gevonden fout wordt geclassificeerd (blokkerend / storend / cosmetisch) en direct opgelost, met een regressietest erbij waar dat zinvol is. Daarna draait de hele doorloop opnieuw tot alles groen is.

## Oplevering

Een rapport met per onderdeel het oordeel, screenshots van elk scherm (mobiel en desktop), de lijst gevonden en opgeloste fouten, en de uitslag van typecheck, lint, tests en build.

## Technisch

- Playwright-scripts onder `/tmp/browser/pim-audit/`, draaien tegen de lokale dev-server, viewports 390x844 en 1280x1800.
- Console-errors, unhandled rejections en gefaalde netwerkverzoeken worden per pagina verzameld en als fout geteld.
- Nieuwe regressietests komen naast de bestaande suites in `src/components/pim/**/__tests__` en `src/lib/pim/__tests__`.
- Detectieverwachtingen worden vastgelegd als datagedreven test in `src/lib/pim/__tests__`, zodat de kwaliteit later niet stil kan wegzakken.
