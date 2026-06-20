
# Project PiM — uitvoeringsplan derde analyse (definitief)

Werkbestand: `scenarios/pva-3.0-core-robuust-maken/04-derde-analyse-verbeterplan.md` — bevat de integrale analyse + onderstaande checklist. Bij elke afgeronde taak: `[ ]` → `[x]`, datum en eventuele afwijking, gecommit samen met de codewijziging.

Eén afwijking op de analyse: dit project gebruikt **Bun** (`bunfig.toml`), geen npm. Alle `npm ci` / `npm run`-eisen worden 1:1 als `bun install` / `bun run` uitgevoerd; npm-lockfile wordt niet gecommit. De geest van §4.2 (reproduceerbare schone install) blijft afgedwongen.

Volgorde = §13 van de analyse, zonder tussenpauzes: Fase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7, gevolgd door acceptatietest T1–T5 en backlog-verificatie M/S/L.

## Guardrails (§16 — bovenaan werkbestand vastgelegd)
- G1 Geen extra panelen aan `/try`.
- G2 Geen UI bouwen vóór build/tests groen zijn.
- G3 Geen claim "productie-anonimisatie".
- G4 Rules-only mag niet exporteren.
- G5 Pseudonieme output niet kopiëren/delen.
- G6 Modelstatus niet verstoppen als die het besluit beïnvloedt.
- G7 Geen uitleg dumpen op `/`.
- G8 Geen OCR vóór egress + tests hard zijn.

## Fase 0 — Repo-hygiëne (§2.1, §4.2, §4.3, §4.12)
- [ ] 0.1 `bun install` werkt schoon.
- [ ] 0.2 Script `typecheck` = `tsc --noEmit`.
- [ ] 0.3 Script `test` = `vitest run`.
- [ ] 0.4 Script `test:watch` = `vitest`.
- [ ] 0.5 Script `check` = typecheck + lint + test + build.
- [ ] 0.6 Vitest + jsdom + @testing-library/react geïnstalleerd.
- [ ] 0.7 Eén groene smoketest aanwezig.
- [ ] 0.8 `<html lang="en">` → `"nl"` in `__root.tsx`.

## Fase 1 — PIM-core hard maken (§4.4–4.7, §11.2, §11.3)

**Types — `src/lib/pim/types.ts`**
- [ ] 1.1 `PayloadType`: `draft_anonymous_certified | draft_pseudonymous_local | raw_input | mapping | restored | unknown`.
- [ ] 1.2 `CertifiedPayload` interface (text, mode, payloadType, profileId, guardStatus).
- [ ] 1.3 `DraftCheckResult` uitgebreid met status + residuele metadata zonder ruwe tekst.

**Policy — `src/lib/pim/policy.ts`**
- [ ] 1.4 `DecideInput` krijgt `profileId`.
- [ ] 1.5 `DecideInput` krijgt `payloadType`.
- [ ] 1.6 `PimDecision` krijgt `profileId`.
- [ ] 1.7 `education-nl-rules-only` + `send_external_ai` ⇒ BLOCK.
- [ ] 1.8 `education-nl-rules-only` + `export_file` ⇒ BLOCK.
- [ ] 1.9 `education-nl-rules-only` + copy/share/print: alleen low risk + gecertificeerde anonymous draft.
- [ ] 1.10 Payload-gate: alleen `draft_anonymous_certified` mag naar buiten.

**Processing — `src/lib/pim/processing.ts`**
- [ ] 1.11 `draftCheckWithRegistry(draft, mode, profileId, { async })` via detectorRegistry.
- [ ] 1.12 Bestaande `draftCheck()` herleiden hierheen.
- [ ] 1.13 Aanroepers: resultaatstatus, PIM-besluit, alle egress-acties, tests.

**Modelgate — `src/routes/try.tsx` + helper**
- [ ] 1.14 `modelGateFor(profileId, action, integrity)` helper.
- [ ] 1.15 Hardcoded `modelVerified: true` weg uit `try.tsx`.
- [ ] 1.16 Demo-hash geeft géén productiegroen voor non-lokale acties.

**Egress — `src/lib/pim/egressGuard.ts`**
- [ ] 1.17 `executeAction()` accepteert alleen `CertifiedPayload`.
- [ ] 1.18 copy: payload-aware re-consult (zelfde pad als send_external_ai).
- [ ] 1.19 export: idem.
- [ ] 1.20 print: idem.
- [ ] 1.21 share: idem.
- [ ] 1.22 Ongetypeerde payload ⇒ weigering met reden.

**Testbestanden (§11.2, exact pad)**
- [ ] 1.23 `src/lib/pim/__tests__/policy.test.ts`
- [ ] 1.24 `src/lib/pim/__tests__/draftCheck.test.ts`
- [ ] 1.25 `src/lib/pim/__tests__/egressGuard.test.ts`
- [ ] 1.26 `src/lib/pim/__tests__/profiles.test.ts`
- [ ] 1.27 `src/lib/pim/__tests__/modelIntegrity.test.ts`
- [ ] 1.28 `src/lib/pim/__tests__/invariants.test.ts`
- [ ] 1.29 `src/components/pim/start-go/__tests__/startGoShell.test.tsx` (na Fase 4).

**Privacy-invarianten (§11.3, 20 stuks)**
- [ ] 1.30 pseudonymous + send_external_ai ⇒ BLOCK.
- [ ] 1.31 pseudonymous + export_file ⇒ BLOCK.
- [ ] 1.32 pseudonymous + copy ⇒ BLOCK.
- [ ] 1.33 pseudonymous + print ⇒ BLOCK.
- [ ] 1.34 pseudonymous + share ⇒ BLOCK.
- [ ] 1.35 anonymous + restore ⇒ BLOCK.
- [ ] 1.36 anonymous draft met pseudoniem-token ⇒ BLOCK.
- [ ] 1.37 raw_input → egress ⇒ BLOCK.
- [ ] 1.38 mapping → egress ⇒ BLOCK.
- [ ] 1.39 restored → egress ⇒ BLOCK.
- [ ] 1.40 unknown → egress ⇒ BLOCK.
- [ ] 1.41 model mismatch ⇒ BLOCK non-lokale acties.
- [ ] 1.42 missing model ⇒ BLOCK afhankelijke acties.
- [ ] 1.43 rules-only + externe AI ⇒ BLOCK.
- [ ] 1.44 rules-only + export ⇒ BLOCK.
- [ ] 1.45 audit bevat geen ruwe tekst.
- [ ] 1.46 audit bevat geen drafttekst.
- [ ] 1.47 audit bevat geen mapping.
- [ ] 1.48 draftCheck vindt e-mail, telefoon, BSN, IBAN.
- [ ] 1.49 copy/export/share/print alleen gecertificeerde anonieme payload.

## Fase 2 — Naamgeving + claims (§2.4, §4.8)
- [ ] 2.1 README: term-tabel — `Project PiM` (product) / `Privacy Integrity Monitor` (volledige naam) / `PIM` (beslislaag); `Privacy Intelligence Module` markeren als oud.
- [ ] 2.2 `routes/index.tsx` — termgebruik.
- [ ] 2.3 `routes/__root.tsx` — termgebruik.
- [ ] 2.4 `routes/trust.tsx` — termgebruik.
- [ ] 2.5 `routes/compliance.tsx` — termgebruik.
- [ ] 2.6 README: modelhash-uitleg eerlijk (descriptor-hash = trust-on-first-pin, geen weights-hash).
- [ ] 2.7 UI-label "demo verified" vs "productie verified" gescheiden bij modelstatus.
- [ ] 2.8 Modeldownload + externe modelhosts apart benoemd in README en UI.

## Fase 3 — App-shell + burger menu (§4.11, §7)
- [ ] 3.1 Brede nav weg uit `__root.tsx`.
- [ ] 3.2 Header = logo + LocalStatusPill + ☰.
- [ ] 3.3 `LocalStatusPill` 3-staten: groen=lokaal actief / oranje=beperkte detectie / rood=niet klaar (uit self-test + modelgate).

**Burgermenu (§7.2, 10 items exact)**
- [ ] 3.4 Nieuwe test  3.5 Voorbeelden  3.6 Expert lab  3.7 Trust dashboard  3.8 Pipeline uitleg  3.9 Modi uitleg  3.10 Compliance  3.11 Flags  3.12 Instellingen  3.13 Over Project PiM.

**Componenten**
- [ ] 3.14 `src/components/pim/start-go/StartHeader.tsx`.
- [ ] 3.15 `src/components/pim/start-go/BurgerMenu.tsx`.
- [ ] 3.16 `src/components/pim/start-go/LocalStatusPill.tsx`.
- [ ] 3.17 Footer behouden, soberder.

## Fase 4 — `/` wordt Start & Go (§6, §8, §10, §15)

**Componenten (§8)**
- [ ] 4.1 `StartGoShell.tsx` — alleen state + koppeling, geen uitleg.
- [ ] 4.2 `InputPanel.tsx` — textarea + voorbeeldknop + Start PiM + korte privacyregel.
- [ ] 4.3 `ModeTargetBar.tsx` — Anoniem | Pseudoniem-lokaal + Doel.
- [ ] 4.4 `ResultPanel.tsx` — status → reden → veilige tekst → primaire actie → details dicht.
- [ ] 4.5 `SafetyVerdictCard.tsx`.
- [ ] 4.6 `ResultActions.tsx`.
- [ ] 4.7 `FindingChips.tsx`.
- [ ] 4.8 `DetailsDrawer.tsx` — risk, categorieën, detectoren, modelstatus, policyregel, auditmetadata, pipeline-stappen.
- [ ] 4.9 `ExamplePicker.tsx`.

**Gedrag (§6.1–6.3, §9)**
- [ ] 4.10 `/` toont InputPanel + ModeTargetBar + Start PiM bovenaan.
- [ ] 4.11 Resultaat direct onder input.
- [ ] 4.12 Block-scherm met findings-chips + "wat nu?"-tekst.
- [ ] 4.13 Oude uitleg op `/` verhuisd naar nieuwe route `/over`.

**Niet meer bovenaan (§6.4)**
- [ ] 4.14 pipeline-timeline weg van `/`.
- [ ] 4.15 modelcatalogus weg van `/`.
- [ ] 4.16 auditfeed weg van `/`.
- [ ] 4.17 review queue weg van `/`.
- [ ] 4.18 compliancechecklist weg van `/`.
- [ ] 4.19 scenario-overzicht weg van `/`.
- [ ] 4.20 lange architectuurtekst weg van `/`.

**Kwaliteitslat (§10)**
- [ ] 4.21 Resultaatkaart beantwoordt: mag-ik-delen / welke-veilige-tekst / beste-actie / waarom / details.
- [ ] 4.22 Statusteksten exact: groen="Deze draft lijkt veilig genoeg voor de gekozen actie." / oranje="Deze draft is bruikbaar, maar de context kan herkenbaar zijn. Controleer de details." / rood="Niet delen. PiM vond nog directe persoonsgegevens of een verboden route."
- [ ] 4.23 Knoppen exact: ALLOW="Kopieer veilige tekst" / ALLOW_WITH_WARNING="Controleer en kopieer" / BLOCK="Maak opnieuw veilig".

**Copy centraal in `src/lib/pim/copy.ts` (§15)**
- [ ] 4.24 Titel: "Test tekst voordat je die deelt met AI".
- [ ] 4.25 Subtekst: "PiM maakt eerst een veilige versie. Alles draait lokaal in je browser. Delen kan pas als de gekozen actie is toegestaan."
- [ ] 4.26 Placeholder: "Plak hier een docentnotitie, leerlingtekst of verslag..."
- [ ] 4.27 Startknop: "Start PiM".
- [ ] 4.28 Resultaatkoppen: "Veilige draft klaar" / "Controle nodig" / "Niet delen".
- [ ] 4.29 Detailslink: "Waarom dit oordeel?".
- [ ] 4.30 Privacyregel onder Start: "Je tekst blijft in deze browser totdat jij een toegestane actie kiest."

## Fase 5 — `/try` wordt expertlab (§4.10, §12-Fase5)
- [ ] 5.1 Titel: "Expert lab".
- [ ] 5.2 Bovenin link "← terug naar snelle test".
- [ ] 5.3 Pipeline + modelstatus + audit + review queue blijven.
- [ ] 5.4 Geen primaire route meer (geen CTA vanaf `/`).

## Fase 6 — CI privacy gate (§12-Fase6, optioneel)
- [ ] 6.1 `.github/workflows/ci.yml` met `bun install` + `bun run check` (optioneel; Lovable deployt zelf).

## Fase 7 — Runtime hardening positionering (§4.9)
- [ ] 7.1 Hardening-meldingen alleen in trust/details, niet hoofdresultaat.
- [ ] 7.2 Geen tekstinhoud in logs verifiëren.
- [ ] 7.3 README/UI: hardening = "extra vangnet", niet de echte gate.

## Acceptatietest — 5 user-tasks (§11.4)
- [ ] T1 Docentnotitie ("Tom de Vries uit 4H2…") → veilige tekst + begrijpelijke vervangingen.
- [ ] T2 Harde PII (BSN+IBAN+tel+adres) → block of stevige anonimisatie + geen copy bij niet-gecertificeerd + hersteladvies.
- [ ] T3 Pseudoniem → externe AI → direct block + uitleg "pseudoniem is alleen lokaal".
- [ ] T4 Rules-only + export → block + uitleg "beperkte detectie".
- [ ] T5 Details openen → vindbaar, niet in de weg, terug-pad werkt.

## Backlog-verificatie (§14)
**Must** — M1 `bun install` schoon · M2 `bun run check` · M3 Vitest · M4 modelVerified weg · M5 profileId in decide · M6 rules-only blokkeert export+externe AI · M7 draft check via registry · M8 egress payloadtypes · M9 alleen gecertificeerde draft naar buiten · M10 zelfde naamgeving · M11 `/` is testvenster · M12 burgermenu vervangt brede nav.
**Should** — S1 detailsdrawer (=4.8) · S2 statuspill 3-staten (=3.3) · S3 voorbeeldknop (=4.2) · S4 heldere block-uitleg (=4.12) · S5 `html lang="nl"` (=0.8) · S6 productieclaims gescheiden (=2.7).
**Later (alleen registreren, niet uitvoeren)** — L1 OCR · L2 middleware-API · L3 browserextensie · L4 Docs/Office add-on · L5 zorgprofiel · L6 generieke profielen.

## Definition of done per fase
1. `bun run check` groen.
2. Werkbestand `04-derde-analyse-verbeterplan.md` bijgewerkt: vinkjes gezet, datum, notitie bij afwijkingen.
3. Korte chatupdate "fase X klaar → start fase X+1".

## Uitvoering
Na akkoord: ik draai alle fasen achter elkaar zonder tussenvragen, en geef per afgeronde fase één statusregel.
