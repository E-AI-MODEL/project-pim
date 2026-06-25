# Changelog

Alle noemenswaardige wijzigingen aan Project PiM komen in dit bestand.

## Unreleased

### Added

- CI-workflow voor typecheck, lint, tests, build en dependency audit.
- Securitybeleid met privé meldkanaal.
- Contribution guide met privacyregels voor bijdragen.
- Roadmap met releasevolgorde.
- CSP-headers voor dev/preview en hosts met `_headers` ondersteuning.
- E2E-tests voor copy, export, print, share en send_external_ai.
- Browser-local modelconfig pins via `LOCAL_PIN:*`.

### Changed

- `LICENSE` is gezet op MIT.
- README verduidelijkt de lokale browsergrens, modelintegriteit en bekende grenzen.
- NER-integriteit hasht nu de publieke `config.json` in plaats van de oude descriptor-string.

### Fixed

- BSN-detectie gebruikt nu de Nederlandse elfproef als post-filter.
- `send_external_ai` is expliciet getest als endpointloze simulatie zonder fetch.
