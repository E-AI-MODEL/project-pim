# Project PiM implementation plan

## Werkafspraak
Elke fase wordt uitgevoerd als een afzonderlijke featurebranch met een schrijvende agent en een pull request naar `main`.

## Fase 0: governance
Branch: `agent/pim-governance`

Resultaat:
- agentinstructies;
- productcharter;
- UX-specificatie;
- threat model;
- releasegates;
- masterplan;
- PR-template;
- Lovable Project Knowledge.

## Fase 1: centrale evaluatiemotor
Branch: `refactor/pim-evaluation-engine`

Resultaat:
- karakterisatietests voor huidig gedrag;
- een centrale `evaluate()`-functie;
- een risicoberekening;
- een draftcheckroute;
- modelgate en policy in dezelfde evaluatiestroom;
- geen grote UI-wijziging.

## Fase 2: egress-hardening
Branch: `security/pim-egress-hardening`

Resultaat:
- EgressGuard gebruikt de centrale evaluatiemotor;
- alleen `ALLOW` met een geslaagde guard mag egress uitvoeren;
- payloadcertificaat is gekoppeld aan de werkelijke tekst;
- browseracties zijn afzonderlijke adapters;
- diagnostische instellingen kunnen geen productie-egress autoriseren;
- bypass- en failure-pathtests.

## Fase 3: detectorbenchmark
Branch: `test/pim-detector-benchmark`

Resultaat:
- synthetische onderwijsdataset;
- positieve, negatieve en adversarial cases;
- precision en recall per categorie;
- false-positiveanalyse;
- performancebasis en releasegrenzen.

## Fase 4: product shell
Branch: `design/pim-product-shell`

Resultaat:
- een primaire PiM-werkruimte;
- technische en informatieve routes uit de normale flow;
- korte, taakgerichte uitleg;
- eigen productidentiteit zonder Word-kopie of AI-demo-uitstraling.

## Fase 5: editor workspace
Branch: `feat/pim-editor-workspace`

Resultaat:
- documentinvoer en ondersteunde bestandsimport;
- privacybevindingen in context;
- veilige versie en hercontrole na edits;
- werkende copy, download, print, share en geconfigureerde AI-acties;
- undo/redo, toetsenbordbediening en responsief gedrag.

## Fase 6: release candidate
Branch: `release/pim-v1-rc1`

Resultaat:
- dependencyreductie;
- blokkerende CI;
- model- en runtimehardening;
- toegankelijkheids- en performancecontrole;
- productie-CSP en hostingcontrole;
- release notes en versie-tag.

## Volgorderegel
Een latere fase start pas wanneer de relevante releasegates van de vorige fase zijn gehaald. UI-polish mag geen ontbrekende veiligheidsarchitectuur maskeren, en securityrefactors mogen niet ongemerkt de productflow uitbreiden.
