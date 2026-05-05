# 03 - V3-checklist voor PVA 3.0

Deze checklist hoort bij `PVA 3.0 - core robuust maken`.

## A. Naamgeving

- [ ] UI gebruikt `Project PiM` als productnaam.
- [ ] Documentatie gebruikt `Privacy Integrity Monitor` als volledige naam.
- [ ] `PIM` wordt alleen gebruikt voor de deterministische beslislaag.
- [ ] Oude naamgeving zoals `Privacy Intelligence Module` is verwijderd of gemarkeerd als oud.

## B. Release-1 scope

- [ ] Alleen `education-nl-full` is selecteerbaar als volledig profiel.
- [ ] Alleen `education-nl-rules-only` is selecteerbaar als light-profiel.
- [ ] Zorgprofielen zijn niet actief in release 1.
- [ ] Generic-profielen zijn niet actief in release 1.

## C. PIM-besluit

Elke beslissing bevat:

- [ ] decision of verdict;
- [ ] action;
- [ ] mode;
- [ ] ruleId;
- [ ] reasonCode;
- [ ] severity;
- [ ] policyVersion;
- [ ] profileId;
- [ ] timestamp.

## D. Draft Check Guard

- [ ] Geen actie zonder gecertificeerde draft.
- [ ] Anonieme draft bevat geen pseudonieme tokens.
- [ ] Pseudonieme draft bevat alleen verwachte tokens.
- [ ] Ruwe e-mail blokkeert.
- [ ] Ruw telefoonnummer blokkeert.
- [ ] Ruwe BSN blokkeert.
- [ ] Ruwe IBAN blokkeert.

## E. Pseudonieme modus

Altijd block:

- [ ] `pseudonymous + send_external_ai`;
- [ ] `pseudonymous + export_file`;
- [ ] `pseudonymous + copy`;
- [ ] `pseudonymous + print`;
- [ ] `pseudonymous + share`.

Lokaal toegestaan met waarschuwing:

- [ ] display;
- [ ] restore;
- [ ] save_local, alleen met versleutelde mapping.

## F. Anonieme modus

- [ ] `anonymous + restore` blokkeert.
- [ ] Egress blokkeert bij ruwe persoonsgegevens.
- [ ] Egress blokkeert bij pseudonieme tokens.
- [ ] Egress blokkeert bij hard-review labels.
- [ ] Externe AI mag alleen bij lage risk en alle gates groen.

## G. Production Egress Guard

Altijd block:

- [ ] mapping payload;
- [ ] raw input payload;
- [ ] restored payload zonder nieuwe PiM-verwerking;
- [ ] unknown payload bij egress;
- [ ] PIM decision = block.

## H. Model Integrity Gate

- [ ] Placeholderhash blokkeert productie-egress.
- [ ] Hash mismatch blokkeert.
- [ ] Ontbrekend model blokkeert alle niet-display acties die dat model nodig hebben.
- [ ] Display mag met duidelijke waarschuwing als detectie beperkt is.
- [ ] Modelstatus komt terug in PIM-context.

## I. Pipeline-profielen

- [ ] `rules` is verplicht.
- [ ] `special-category-lexicon-nl` is verplicht.
- [ ] Onbekende detector-id wordt geweigerd.
- [ ] Conflicterende talen worden geweigerd.
- [ ] Rules-only krijgt risk boost.
- [ ] Rules-only krijgt strengere egress-drempels.
- [ ] UI toont waarschuwing bij rules-only.

## J. Audit en logging

- [ ] Audit bevat geen ruwe input.
- [ ] Audit bevat geen drafttekst.
- [ ] Audit bevat geen mapping.
- [ ] Audit bevat geen prompt.
- [ ] Audit bevat geen OCR-afbeelding.
- [ ] Console logging van ruwe input of mapping is verboden.

## K. Middleware-casus onderwijs

- [ ] OCR-output gaat altijd door PiM.
- [ ] Originele upload of scan gaat niet automatisch naar AI.
- [ ] Pseudoniem blijft lokaal.
- [ ] Externe feedback gebruikt alleen anonieme draft.
- [ ] Mappinghandle mag lokaal worden bewaard.
- [ ] Mappingentries worden nooit aan de onderwijsapp gegeven.
- [ ] Feedbackmodule krijgt geen ruwe input.

## L. Tests

Minimaal aanwezig:

- [ ] policy tests;
- [ ] egress guard tests;
- [ ] draft guard tests;
- [ ] pipeline profile tests;
- [ ] model integrity tests;
- [ ] detector contract tests;
- [ ] invariant tests.

## M. CI

- [ ] typecheck;
- [ ] lint;
- [ ] test;
- [ ] privacy invariant suite;
- [ ] build;
- [ ] release blokkeert bij falende privacytest.

## Klaar voor volgende fase wanneer

Deze PVA-fase is klaar als:

1. de core v3-conforme beslissingen neemt;
2. de harde regels als tests bestaan;
3. de egress guard payload-aware is;
4. release-1 profielen worden afgedwongen;
5. een onderwijsapp PiM als middleware kan aanroepen zonder ruwe tekst door te geven aan AI.
