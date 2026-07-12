# Project PiM release gates

## Gate 1: scope
- De wijziging heeft een afgebakend doel.
- Alleen noodzakelijke bestanden zijn aangepast.
- Geen ongevraagde dependency, feature of algemene refactor.

## Gate 2: privacy en security
- Privacy-invarianten blijven intact.
- Ruwe en pseudonieme tekst kunnen geen geautoriseerde egress bereiken.
- Gewijzigde tekst wordt opnieuw beoordeeld.
- Logs, telemetry en foutmeldingen bevatten geen documentinhoud of mappingwaarden.
- Nieuwe netwerktoegang is expliciet beoordeeld.

## Gate 3: kwaliteit
Verplicht voor codewijzigingen:
- `bun run typecheck`
- `bun run lint`
- `bun run test`
- `bun run build`
- `bun audit`

Een mislukte verplichte check wordt niet als adviespunt weggeboekt.

## Gate 4: gedrag
- Primaire succesroute werkt.
- Loading-, fout-, blokkade- en lege toestanden zijn gecontroleerd.
- Bestaande relevante functies blijven werken.
- Nieuwe privacy- of egresslogica heeft tests voor failure paths en bypasses.

## Gate 5: product en UX
- De wijziging past in de primaire PiM-flow.
- Elke zichtbare bediening werkt echt.
- Technische details zijn niet onnodig zichtbaar voor normale gebruikers.
- Toetsenbord, focus, contrast en kleinere viewport zijn gecontroleerd.
- Lovable-preview is handmatig beoordeeld.

## Gate 6: pull request
De PR vermeldt:
- doel en aanleiding;
- gewijzigde bestanden of subsystemen;
- privacy- en security-impact;
- uitgevoerde checks en resultaten;
- bekende beperkingen;
- screenshots bij zichtbare wijzigingen.

## Gate 7: merge en Lovable
- PR is beoordeeld en checks zijn groen.
- Merge gaat naar `main` via GitHub.
- Lovable wordt daarna teruggezet naar `main`.
- De Lovable-preview toont de gemergde versie zonder regressies.
