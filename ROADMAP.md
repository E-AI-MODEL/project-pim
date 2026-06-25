# Roadmap

Project PiM is nu een browser-native proof of concept. Deze roadmap benoemt wat nodig is voor een productieklare open-source release.

## Blokkers voor productie

1. Kies een definitieve licentie en vervang de tijdelijke `LICENSE`.
2. Pin modelrevisies op immutable commit SHA's in plaats van `main`.
3. Vervang descriptor-hashes door echte content-hashes van `config.json` en modelbestanden waar de runtime dat toelaat.
4. Publiceer of vervang `context_education` en verwijder de placeholder-hash.
5. Bepaal of `rewrite_qwen` onderdeel wordt van release 1 of design-only blijft.
6. Voeg deployment-hardening toe: CSP, dependency audit en expliciete allowlist voor modelhosts.

## Release 1 hardening

- Breid detector-tests uit met property-based tests voor brede nummer- en naamregels.
- Voeg end-to-end tests toe voor copy, export, print, share en send_external_ai.
- Maak de risk-wegingen configureerbaar of hergebruik één centrale risk-functie in egress re-consult.
- Meet performance voor rules-only, NER small en NER large.
- Documenteer browserondersteuning voor WebGPU en WASM fallback.

## Open-source voorbereiding

- Kies licentie: permissief, copyleft of gesloten bron.
- Richt issue templates in.
- Leg releaseproces en versiebeleid vast.
- Definieer minimumkwaliteit voor externe bijdragen.

## Latere opties

- Offline modelbundles of gecontroleerde interne mirror.
- Echte context-SLM als vervanging van de huidige heuristische contextdetector.
- Exporteerbare compliance-rapportage zonder tekstinhoud.
