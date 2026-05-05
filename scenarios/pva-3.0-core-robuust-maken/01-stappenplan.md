# 01 - Stappenplan

Doel: de bestaande PiM-code stap voor stap naar v3-compliance brengen, met de core als eerste werkgebied.

## Stap 1 - Repo naast v3 leggen

Check:

- naamgeving in README, UI en code;
- huidige `src/lib/pim` modules;
- huidige pipeline-profielen;
- huidige egress guard;
- huidige modelcatalogus;
- ontbrekende tests en CI-gates.

Output:

- korte lijst met afwijkingen van v3;
- besluit welke afwijkingen direct moeten worden opgelost.

## Stap 2 - Types v3-proof maken

Werk toe naar vaste types voor:

- `PrivacyMode`;
- `IntendedAction`;
- `DraftStatus`;
- `PimDecision`;
- `GuardResult`;
- `PrivacySignals`;
- `PipelineProfile`.

Belangrijk:

- `PimDecision` bevat altijd `policyVersion`, `profileId`, `ruleId`, `reasonCode` en `timestamp`;
- mapping komt nooit als data terug in een process-result;
- alleen een mapping-handle mag zichtbaar zijn voor de UI.

## Stap 3 - Een vaste PIM-ingang maken

Maak of vervang de policy-ingang door:

```ts
evaluatePim(input: PimInput): PimDecision
```

Deze functie is de enige plek waar allow, warning of block wordt bepaald.

## Stap 4 - Harde regels bovenaan zetten

De eerste regels in PIM zijn fail-closed regels:

- debug logging van inhoud blokkeert;
- falende guard blokkeert;
- niet-gecertificeerde draft blokkeert;
- mapping in output blokkeert;
- ruwe persoonsgegevens in output blokkeren;
- modus mismatch blokkeert;
- pseudonieme uitgaande acties blokkeren;
- anonieme output met pseudonieme tokens blokkeert.

## Stap 5 - Draft Check Guard aanscherpen

De Draft Check Guard moet minimaal detecteren:

- ruwe e-mail;
- telefoonnummer;
- BSN;
- IBAN;
- pseudonieme tokens in anonieme draft;
- onverwachte tokens in pseudonieme draft.

Outputstatus:

```txt
draft_certified_anonymous
draft_certified_pseudonymous
draft_repair_needed
draft_blocked
```

## Stap 6 - Production Egress Guard payload-aware maken

De guard krijgt niet alleen tekst, maar ook payloadtype:

```txt
draft
mapping
raw_input
restored
unknown
```

Altijd blokkeren:

- mapping;
- raw input;
- herstelde tekst zonder nieuwe PiM-verwerking;
- pseudonieme payload naar uitgaande acties;
- anonieme payload met pseudonieme tokens.

## Stap 7 - Release-1 profielen afdwingen

Alleen deze profielen zijn release-1:

```txt
education-nl-full
education-nl-rules-only
```

Regels:

- baseline `rules` verplicht;
- baseline `special-category-lexicon-nl` verplicht;
- onbekende detector-id blokkeert;
- conflicterende talen blokkeren;
- rules-only krijgt strengere uitgaande drempels.

## Stap 8 - Modelintegriteit scheiden in demo en productie

Demo mag tonen met waarschuwing.

Productie mag geen uitgaande actie toestaan met:

- placeholderhash;
- mismatch;
- ontbrekend model;
- niet-geverifieerde modelstatus.

`display` mag waar nodig met waarschuwing. Uitgaande acties niet.

## Stap 9 - Invariant-suite toevoegen

Minimale tests:

1. pseudonymous + external AI blokkeert altijd;
2. pseudonymous + copy/export/print/share blokkeert altijd;
3. anonymous + pseudonym token blokkeert;
4. mapping payload blokkeert;
5. raw input payload blokkeert;
6. failed guard blokkeert;
7. model unverified + egress blokkeert;
8. rules-only gebruikt strengere drempels;
9. invalid profile wordt geweigerd;
10. detector-result bevat geen verboden velden.

## Stap 10 - Middleware-contract uitschrijven

Voor UMDT, EAI Classroom en EAI Studio komt er een dun contract:

```txt
inputText
sourceKind
mode
intendedAction
profileId
processResult
pimDecision
egressResult
```

De onderwijsapp mag PiM niet overslaan bij export, copy, share of AI.

## Stap 11 - CI privacy gate toevoegen

CI draait minimaal:

```txt
typecheck
lint
test
privacy invariant tests
build
```

Een falende invariant blokkeert merge of release.

## Stap 12 - Pas daarna UI en integraties

Na deze stappen kan de UI opnieuw aan de core worden gekoppeld. Daarna pas:

- UMDT-koppeling;
- EAI Studio-koppeling;
- EAI Classroom-koppeling;
- browserextensie;
- document-add-ons.
