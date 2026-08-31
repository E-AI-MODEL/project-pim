# PiM issuelijst (prioriteit)

Bron van waarheid voor vrijgave-impact. Peildatum: audit op commit `edf7d64825cedfb58dd5427ba3a0fcb505fcbc4b`.

Classificatie:
- **P0 blocker**: mag niet naar productie/verkoop.
- **P1 vrijgavevoorwaarde**: mag mee in release 1, moet opgelost of contractueel afgedekt zijn voor betaalde uitrol.
- **P2 kwaliteit**: verbetering, geen vrijgave-impact.

## P0 blocker

Geen. Alle privacy-kritieke gedragingen zijn in de audit bevestigd: 0 externe requests, klembord-uitvoer volledig gemaskeerd, geen persoonsgegevens in localStorage, fail-closed blokkade bij niet-toegestaan profiel.

## P1 vrijgavevoorwaarden

| ID | Onderwerp | Beschrijving | Bewijs |
|----|-----------|--------------|--------|
| P1-1 | Modelpinning niet immutabel | `src/lib/pim/modelCatalog.ts` gebruikt `revision: "main"` en `LOCAL_PIN:`-placeholders in plaats van vaste commit-hashes en gepubliceerde SHA-256 waarden. Een gewijzigd upstream model wordt bij een eerste installatie geaccepteerd. | `rg revision src/lib/pim/modelCatalog.ts` |
| P1-2 | Modeldownload is de enige egress | Bij inschakelen van BERT wordt het model van Hugging Face gehaald. Functioneel correct en aangekondigd, maar moet expliciet in de privacyverklaring en in de UI-toestemming staan. | audit: 0 requests zolang BERT uit staat |
| P1-3 | WebGPU niet beschikbaar in auditomgeving | `Failed to create WebGPU Context Provider`; WASM-fallback werkt maar is trager. Performancebudget voor grote documenten met BERT aan is niet gemeten op doelhardware. | browserconsole tijdens audit |
| P1-4 | Detectiekwaliteit niet extern gevalideerd | Regex/lexicon + optionele NER zijn getest met eigen fixtures (160 tests), niet tegen een onafhankelijke Nederlandse onderwijsdataset. Recall-claims richting scholen moeten voorzichtig geformuleerd blijven. | `bunx vitest run` |
| P1-5 | Geen persistentie van gebruikersvoorkeuren | Instellingen (profiel, detectielagen, drempels) leven alleen in geheugen en resetten bij refresh. Bewuste privacykeuze, maar voor verkoop moet dit als productgedrag gedocumenteerd zijn of optioneel worden. | `storageBoundary.test.ts` |

## P2 kwaliteit

| ID | Onderwerp | Beschrijving |
|----|-----------|--------------|
| P2-1 | Lege ruimte onder resultaat in Stap voor stap op desktop; layout kan compacter. |
| P2-2 | 10 "Fast refresh" lintwaarschuwingen (UI-componenten en router). Geen runtime-impact. |
| P2-3 | Bij een BLOCK-verdict is de tab "Veilig" uitgeschakeld zonder inline uitleg waarom; gebruiker moet zelf de stap naar profiel "Anoniem" bedenken. |
| P2-4 | `[PIM hardening] external fetch detected` verschijnt als console-waarschuwing op elke route. Dit is de eigen zelftest (`probeHardening`), maar leest als een fout. |
| P2-5 | Geen zichtbare voortgangsindicatie tijdens de eenmalige modeldownload van BERT. |
