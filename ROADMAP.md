# Roadmap

Project PiM is nu een browser-native proof of concept met lokale fail-closed privacygrenzen. Deze roadmap benoemt wat nog nodig is na de eerste productie-hardening.

## Afgerond in deze hardening-ronde

- MIT-licentie gekozen.
- BSN-elfproef toegevoegd.
- Descriptor-hashes vervangen door browser-local config pins voor NER-releasevarianten.
- CSP-headers toegevoegd voor dev/preview en hosts met `_headers` ondersteuning.
- CI toegevoegd voor typecheck, lint, tests, build en dependency audit.
- E2E-tests toegevoegd voor copy, export, print, share en send_external_ai.

## Resterende productiepunten

1. Publiceer of vervang `context_education` en verwijder de placeholder-hash.
2. Bepaal of `rewrite_qwen` onderdeel wordt van release 1 of design-only blijft.
3. Overweeg voor strikt reproduceerbare distributies statische config- en weight-hashes op immutable modelrevisions. De huidige `LOCAL_PIN:*` aanpak is bewust browser-lokaal.
4. Valideer de CSP op de uiteindelijke hostingomgeving, want niet iedere host leest `public/_headers`.

## Release 1 hardening

- Breid detector-tests uit met property-based tests voor brede nummer- en naamregels.
- Maak de risk-wegingen configureerbaar of hergebruik één centrale risk-functie in egress re-consult.
- Meet performance voor rules-only, NER small en NER large.
- Documenteer browserondersteuning voor WebGPU en WASM fallback.

## Open-source voorbereiding

- Richt issue templates in.
- Leg releaseproces en versiebeleid vast.
- Definieer minimumkwaliteit voor externe bijdragen.

## Latere opties

- Offline modelbundles of gecontroleerde interne mirror.
- Echte context-SLM als vervanging van de huidige heuristische contextdetector.
- Exporteerbare compliance-rapportage zonder tekstinhoud.
