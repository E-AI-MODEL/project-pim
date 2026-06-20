# Volgende stappen: PiM UX & functionaliteit

## Probleem
Na document-upload (fase 1, net gebouwd) is de grootste UX-gap duidelijk: de gebruiker ziet **welke** categorieën PiM vond, maar **niet waar** in de tekst. Bij lange documenten is handmatig zoeken onwerkbaar.

Daarnaast: de spec belooft 3 uitleglagen (docent / bestuurder / tech) maar de UI toont er 2. En de pseudonieme mapping + self-test modules bestaan maar zijn onzichtbaar.

## Fase 1 — Gekleurde tekst-highlighting in ResultPanel (hoogste impact)

**Nieuw component:** `TextHighlighter.tsx`

Toon de originele invoertekst met inline gekleurde highlights op elke PII-detectie:
- **Directe PII** (email, BSN, naam, adres…): oranje/rood achtergrond + tooltip met categorie + confidence
- **Contextuele PII** (zorgcontext, incident, kleine groep…): amber/geel achtergrond + tooltip
- Overlappende spans: hoogste confidence wint (zelfde logica als detectors)
- Lange teksten (>5000 chars): scrollbaar met sticky categorie-legenda

**UI-integratie in ResultPanel:**
- Nieuwe sectie boven "De veilige versie van je tekst" — genaamd "Wat PiM herkende in je tekst"
- Tab-switcher: [Origineel met highlights] | [Veilige versie]
- FindingChips blijft bestaan als samenvatting bovenaan

**Technisch:**
- Render spans als overlappende `<mark>`-achtige elementen via absolute positioning of span-injectie
- Tooltip via native `title` of kleine popover op hover
- Responsief: op mobile wordt de tekst horizontaal scrollbaar met zoom-indicator

## Fase 2 — Tech-laag toevoegen aan SafetyVerdictCard

COPY.ts bevat alleen `layerTeacher*` en `layerLeader*`. De spec noemt expliciet een **tech-collega**-laag.

**Actie:**
- Nieuwe COPY-keys: `layerTechAllow`, `layerTechWarn`, `layerTechBlock`
- Tech-laag toont: ruleId, policyVersion, aantal detectoren, riskScore breakdown, payloadType
- SafetyVerdictCard krijgt 3e `Layer` (met `Code` icon) naast GraduationCap en Building2

## Fase 3 — Pseudoniem mapping viewer

Wanneer modus = pseudoniem, toon een uitklapbare "Token mapping" tabel onder de veilige tekst:
- Kolommen: Token | Origineel | Categorie
- Zoek/filter op token of categorie
- Knop "Kopieer mapping als JSON" (lokaal — geen egress)
- Alleen zichtbaar bij modus = pseudonymous

## Fase 4 — Trust indicator (self-test)

De `selfTest.ts` module is compleet maar onzichtbaar.

**Actie:**
- Mini trust-badge in MonitorShell footer (naast "Local Guard actief")
- Groen vinkje = self-test PASS, oranje uitroepteken = FAIL
- Klik opent een klein popover met: golden-cases resultaten, hardening status, ruleset hash (eerste 12 chars)
- Self-test runt automatisch bij eerste render (non-blocking)

## Technische details

- Geen nieuwe dependencies nodig
- Alles blijft 100% client-side
- TypeScript strict compatibel

## Scope

Alleen frontend/UI wijzigingen — geen aanpassingen aan detectoren, policy, of pipeline-logica.