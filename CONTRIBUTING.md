# Contributing

Project PiM is nog een proof of concept. Houd bijdragen klein, toetsbaar en privacygericht.

## Voor je begint

1. Open eerst een issue of bespreek je wijziging met de maintainer.
2. Gebruik geen echte leerlinggegevens, personeelsgegevens of andere PII in tests, screenshots of commits.
3. Voeg bij privacylogica altijd tests toe.

## Lokale checks

Gebruik Bun:

```bash
bun install
bun run check
```

`bun run check` voert typecheck, lint, tests en build uit.

## Privacyregels

- Ruwe input mag de browser niet verlaten.
- Mapping mag nooit worden gelogd of geëxporteerd.
- Audit mag geen originele tekst bevatten.
- Egress moet fail-closed blijven.
- Nieuwe detectors moeten liever te veel dan te weinig signaleren, maar brede regels moeten een post-filter krijgen.

## Pull requests

Een PR bevat minimaal:

- korte uitleg van de wijziging
- testbewijs of reden waarom testen niet kan
- privacy-impact, zeker bij detectoren, egress, modelintegriteit of mapping

## Licentie

De huidige `LICENSE` is een tijdelijke all-rights-reserved placeholder. Accepteer geen externe bijdragen voordat er bewust een definitieve licentie is gekozen.
