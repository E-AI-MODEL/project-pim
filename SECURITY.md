# Security policy

Project PiM verwerkt onderwijsteksten lokaal in de browser. Meld beveiligingsproblemen daarom privé, niet via een publiek issue.

## Melden

Stuur een melding naar:

- security contact: vis@emmauscollege.nl

Zet in de melding:

- korte beschrijving van het probleem
- stappen om het probleem te reproduceren
- impact op privacy, egress of modelintegriteit
- browser, besturingssysteem en build of commit

## Scope

In scope:

- bypass van de fail-closed policy
- raw text egress via copy, export, print, share, fetch, XHR, WebSocket of sendBeacon
- lekken van pseudoniem-mapping of originele tekst
- foutieve modelintegriteitsstatus
- XSS of dependency issues die tekst of mapping kunnen lekken

Niet in scope:

- algemene browserbugs zonder Project PiM-specifieke impact
- social engineering
- denial-of-service zonder privacy-impact

## Verwachte reactie

We proberen meldingen binnen 5 werkdagen te bevestigen. Bij privacy-impact krijgt de fix voorrang boven nieuwe features.

## Disclosure

Publiceer details pas nadat er een fix beschikbaar is of nadat we samen een redelijke publicatiedatum hebben afgesproken.
