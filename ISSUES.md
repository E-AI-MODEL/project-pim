# PiM issuelijst (prioriteit)

Bron van waarheid voor vrijgave-impact. Bijgewerkt na de afwerkronde op de
fiatteringsaudit (commit `edf7d64`) en de eerlijke go/no-go (commit in deze ronde).

Classificatie:
- **P0 blocker**: mag niet naar productie/verkoop.
- **P1 vrijgavevoorwaarde**: mag mee in release 1, moet opgelost of contractueel afgedekt zijn voor betaalde uitrol.
- **P2 kwaliteit**: verbetering, geen vrijgave-impact.

## Eerlijke go/no-go

- **Privacy-kern: GO.** Geverifieerd in audit en in deze sessie: 0 externe
  requests tijdens sessie, klembord-uitvoer volledig gemaskeerd, geen
  persoonsgegevens in localStorage, fail-closed blokkade bij niet-toegestaan
  profiel/payload/model.
- **Betaalde uitrol: pas na drie open voorwaarden (zie P1-3, P1-4 en P1-6).**
  Deze zijn niet oplosbaar door ze weg te schrijven; ze moeten echt gemeten of
  contractueel afgedekt zijn.

## P0 blocker

Geen. Alle privacy-kritieke gedragingen zijn in de audit bevestigd: 0 externe requests, klembord-uitvoer volledig gemaskeerd, geen persoonsgegevens in localStorage, fail-closed blokkade bij niet-toegestaan profiel.


## P1 vrijgavevoorwaarden

| ID | Onderwerp | Status | Afhandeling |
|----|-----------|--------|-------------|
| P1-1 | Modelpinning niet immutabel | **Opgelost** | `modelCatalog.ts` gebruikt nu immutable HF-commits (`c2a4dbf…`, `263e82c…`) met vaste SHA-256 van `config.json`. Helper `hasStaticProductionHash()` in `modelIntegrity.ts`; test bewaakt dat geen release-1 entry nog `main` of `LOCAL_PIN`/`PLACEHOLDER` gebruikt. |
| P1-2 | Modeldownload is de enige egress | **Opgelost** | Expliciet benoemd in het expertpaneel bij BERT en vastgelegd in `docs/GOLDEN_PATH.md` (sectie "Modeldownload en egress"). Download start alleen na gebruikersactie. |
| P1-3 | WebGPU niet beschikbaar in auditomgeving | **Open, geaccepteerd risico** | WASM-fallback werkt aantoonbaar. Performance in de preview is gemeten (zie `docs/GOLDEN_PATH.md`); doelhardware moet vóór betaalde uitrol één keer gemeten worden. Ligt bij de uitrol-partij. |
| P1-4 | Detectiekwaliteit niet extern gevalideerd | **Open, contractueel** | Eigen tests dekken de regels. Externe validatie op een onafhankelijk Nederlands onderwijscorpus blijft nodig; recall-claims richting scholen blijven voorzichtig geformuleerd ("niet extern gevalideerd"). |
| P1-5 | Geen persistentie van gebruikersvoorkeuren | **Opgelost als productgedrag** | Vastgelegd in `docs/GOLDEN_PATH.md`: instellingen zijn bewust vluchtig, refresh valt terug op defaults. Bewaakt door `storageBoundary.test.ts`. |
| P1-6 | CSP-controle op definitieve hosting | **Open, vrijgavevoorwaarde** | `public/_headers` en dev/preview CSP staan er, maar niet elke host leest `_headers`. Vóór betaalde uitrol moet de CSP op de echte hosting gemeten worden. |

## P2 kwaliteit

| ID | Onderwerp | Status |
|----|-----------|--------|
| P2-1 | Lege ruimte onder resultaat in Stap voor stap op desktop | Open, cosmetisch |
| P2-2 | 10 "Fast refresh" lintwaarschuwingen | Geaccepteerd: alle tien komen uit vendored shadcn-componenten en `router.tsx`; 0 lint-errors |
| P2-3 | BLOCK-verdict schakelt tab "Veilig" uit zonder uitleg | **Opgelost**: inline hint "kies modus Anoniem of verwijder de gegevens" |
| P2-4 | Zelftest logde als `external fetch detected` waarschuwing | **Opgelost**: probe wordt herkend, gelogd als `[PIM zelftest]` op info-niveau en gefilterd uit de schendingenlijst op `/trust` |
| P2-5 | Geen voortgang tijdens modeldownload | **Opgelost**: voortgangsbalk met percentage en bestandsnaam in het expertpaneel |
