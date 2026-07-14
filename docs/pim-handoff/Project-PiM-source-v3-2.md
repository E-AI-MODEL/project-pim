# Project PiM source v3

**Privacy Integrity Monitor — broncode-specificatie voor een browser-first privacytool met deterministische besluitvorming, pluggable detectiepipeline en strikte scheiding tussen anoniem en pseudoniem.**

Specificatieversie: v3.0  
Datum: 2026-04-27  
Bestandsnaam: `Project-PiM-source-v3.md`  
Status: **source of truth** voor bouwen, reviewen en releasebesluiten  
Scope eerste release: `education-nl`  
Eerste releaseprofielen: `education-nl-full`, `education-nl-rules-only`  
Latere profielen: `healthcare-nl`, `generic-nl`, `generic-en`  
Doelgroep: ontwikkelaar, privacy engineer, security reviewer, architect, product owner, juridisch reviewer, onderwijsorganisatie, andere domeinorganisaties.

Lezer: er is geen voorkennis nodig. Dit document beschrijft het volledige product, de juridische context, de architectuur, de TypeScript-types, de pipeline, het besluitmodel, het pluginmodel, de UI-eisen, de tests, de CI-gates en de productiegate. Wie dit document leest moet PiM kunnen bouwen, beoordelen of vrijgeven.

---

## v3-correcties en bindende keuzes

Deze versie verwerkt de reviewcorrecties op het vorige bronbestand. De inhoud hieronder is leidend voor de rest van dit document.

### Naamgeving

Gebruik deze namen consequent:

```txt
Project PiM = productnaam
PIM = deterministische policy engine / beslislaag
Privacy Integrity Monitor = volledige naam
```

Schrijf niet door elkaar `PiM`, `PIM`, `Project PIM` en `Project-PiM` voor dezelfde laag. In code en besluitobjecten blijft de beslislaag `PIM` heten. In UI, README en documenttitels heet het product `Project PiM`.

### Scope eerste release

De eerste release bouwt alleen het onderwijsprofiel:

```txt
education-nl-full
education-nl-rules-only
```

Andere profielen blijven ontwerpvoorbereiding en worden niet vrijgegeven in release 1:

```txt
healthcare-nl
generic-nl
generic-en
```

Dat voorkomt dat de eerste bouwfase te breed wordt. Het pluginmodel blijft behouden, maar de productiegate accepteert in release 1 alleen `education-nl`.

### Modelcatalogus

De catalogusstructuur uit dit document blijft staan, maar de standaardvulling voor release 1 gebruikt concrete modelkeuzes:

```txt
NER SLM:
jdp8/wikineural-multilingual-ner
Base model: Babelscape/wikineural-multilingual-ner
Runtime: @huggingface/transformers
Task: token-classification
Device: webgpu, daarna wasm

Browser LLM rewrite:
mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC
Runtime: @mlc-ai/web-llm
Task: contextual_generalization / draft_repair
Device: webgpu
```

De contextdetector voor onderwijs blijft een eigen te trainen of te finetunen model:

```txt
pim-education-privacy-context-v2
Runtime: @huggingface/transformers
Task: text-classification
Status release 1: vereist voor volledige egress, anders degrade_no_export
```

Productie vereist eigen mirror of gepinde artifacts met SHA256. Een placeholderhash blokkeert productie.

### Externe AI

Deze regel is absoluut:

```txt
pseudonymous + send_external_ai = altijd block
pseudonymous + export_file = altijd block
pseudonymous + copy / print / share = altijd block
```

Een externe AI-route mag alleen worden bereikt via `anonymous`, na Draft Check Guard, Model Integrity Gate, PIM `allow`, lage risk en Production Egress Guard.

### Productiegate

Geen release zonder:

```txt
validated education-nl profile
baseline detectoren actief
geen placeholder modelhashes
pseudonymous egress invariants groen
external AI wrapper verplicht
Draft Check Guard invariants groen
PIM default block groen
audit zonder inhoud getest
geen claim van 100 procent anonimiteit
```

---

## 0. Wat dit document is, en wat het niet is

PiM staat voor **Privacy Integrity Monitor**. Dit document is vanaf v3 het bronbestand voor bouwen en releasebeoordeling.

PiM is een **browser-first privacytool**. Tekst die persoonlijk of contextueel gevoelig is, wordt lokaal in de browser bewerkt voordat die tekst zichtbaar wordt, lokaal wordt opgeslagen, gekopieerd, geprint, gedeeld, geëxporteerd of naar een externe AI-route gaat.

De centrale beslislaag heet **PIM**. PIM is geen prompt, geen taalmodel en geen leergeheugen. PIM is **deterministische applicatiecode** die per concrete actie beslist of die actie mag doorgaan.

Dit document beschrijft:

- waarom PiM bestaat;
- de juridische afbakening tussen anoniem en pseudoniem;
- het dreigingsmodel;
- de volledige pipeline van invoer tot besluit;
- het pluginmodel — gebruikers kunnen detectoren en modellen kiezen uit een vaste, ondertekende catalogus;
- de TypeScript-types, configuratie en code;
- de besluitlogica;
- de UI-eisen, met name de verplichte zichtbaarheid van de **niet-100%-anonimiteits-claim**;
- de invariant-suite die elke release moet doorstaan;
- de productiegate.

Dit document is **niet**:

- een marketingclaim van absolute anonimiteit;
- een vervanger voor een DPIA of juridische beoordeling;
- een framework dat onbeperkt uitbreidbaar is — uitbreidingen volgen een streng contract;
- een leergeheugen, een chatbot of een gespreksassistent.

De toon is bewust streng. Het doel is niet om gebruikers gerust te stellen, maar om technisch te voorkomen dat zij per ongeluk persoonsgegevens lekken.

---

## 1. Productclaim — wat PiM wel en niet belooft

### 1.1 Wat PiM doet

PiM verwerkt tekst lokaal in de browser. PiM detecteert:

- **directe persoonsgegevens** — namen, e-mailadressen, telefoonnummers, adressen, identificatienummers;
- **bijzondere categorieën** — gezondheid, religie, etniciteit, seksuele oriëntatie, biometrie, en sectorspecifieke gevoelige categorieën zoals jeugdzorg- of safeguarding-context;
- **quasi-identifiers** — gegevens die alleen geen persoon identificeren, maar in combinatie wel;
- **contextuele rubrieken** — uniciteit door rol, kleine groep, zeldzame combinatie, gedrag-met-tijd-en-plaats.

PiM levert per invoer:

- een **anonieme of pseudonieme draft**;
- een **risicoscore** met onderbouwing;
- een **PIM-besluit** dat per actie (display, copy, export, send_external_ai, ...) bepaalt of de actie mag doorgaan.

### 1.2 Wat PiM expliciet niet belooft

> **Anonimisering is geen 100%-garantie.**

Anonimisering is een **risicobeperkende maatregel**. Geen technische maatregel kan garanderen dat een persoon onder alle omstandigheden niet meer herleidbaar is uit een tekst. De volgende risico's blijven bestaan, ook na een succesvolle PiM-verwerking:

- **uniciteitsrisico** — een tekst zonder naam kan toch maar bij één persoon passen wanneer rol, situatie of combinatie van kenmerken zeldzaam genoeg is;
- **achtergrondkennis** — een lezer met aanvullende informatie kan een geanonimiseerde tekst alsnog herleiden;
- **aggregatie-risico** — meerdere geanonimiseerde teksten samen kunnen meer onthullen dan elk afzonderlijk;
- **detectiefouten** — geen detector vindt elke variant; nieuwe formuleringen, dialect, schrijffouten en onbekende eigennamen kunnen ontsnappen;
- **modelfouten** — taalmodellen falen soms stil en fout-positief of fout-negatief.

PiM wordt verkocht als **technische ondersteuning bij privacy-verantwoordelijkheid**, niet als juridisch sluitende anonimisering. De eindverantwoordelijkheid ligt altijd bij de gebruiker en de verantwoordelijke organisatie.

### 1.3 Waar de claim zichtbaar is

De niet-100%-claim is verplicht zichtbaar:

- in de README (eerste paragraaf na de titel);
- in de UI bij modusselectie;
- in een persistent zichtbaar component `AnonymityClaimNotice` in alle anonieme draft-views;
- in elk PIM-besluitpaneel waarin een actie wordt toegestaan met `allow_with_warning`.

De claim mag niet wegklikbaar zijn. Inklapbaar mag.

---

## 2. Anoniem versus pseudoniem — strikte scheiding

PiM kent twee modi. Ze mogen technisch nooit door elkaar lopen.

### 2.1 Niet-omkeerbaar anoniem

**Doel:** delen, exporteren, rapporteren, onderzoek, en eventueel — onder strenge voorwaarden — naar een externe AI-route.

**Wat gebeurt er?** Persoonlijke gegevens worden vervangen door generaliseringen ("een leerling", "een contactgegeven", "een regio"). Er is **geen mapping** terug naar het origineel. Er bestaat ook geen geheime sleutel die het terugzetten alsnog mogelijk zou maken.

**Eigenschap:** wat eruit komt, kan niet door PiM worden teruggebracht naar het origineel. Mensen met achtergrondkennis kunnen alsnog herleiden — zie 1.2.

**Wettelijk:** anonieme gegevens vallen niet onder de AVG. PiM beweert echter niet dat zijn anonieme output juridisch absoluut anoniem is. Het is **best-effort** richting anoniem, met expliciete risicocommunicatie.

### 2.2 Omkeerbaar pseudoniem (lokaal)

**Doel:** lokale verwerking, lokaal hergebruik, en herstel naar het origineel binnen dezelfde sessie of via een lokaal versleutelde mapping.

**Wat gebeurt er?** Persoonlijke gegevens worden vervangen door tokens (`STUDENT_001`, `EMAIL_002`). Er bestaat een **mapping** tussen tokens en originelen. Die mapping blijft lokaal en wordt versleuteld opgeslagen.

**Wettelijk:** pseudonieme gegevens **blijven persoonsgegevens** in de zin van de AVG. De mapping is een sleutel; zolang die bestaat, is herleiding mogelijk.

### 2.3 Wat de scheiding precies inhoudt

| Aspect | Anoniem | Pseudoniem |
|---|---|---|
| Mapping bestaat? | Nee | Ja, lokaal versleuteld |
| Externe AI-call toegestaan? | Mogelijk, alleen bij zeer lage risk en allow door PIM | **Nooit** |
| Export als bestand? | Mogelijk, alleen bij voldoende lage risk en allow door PIM | **Nooit** |
| Kopiëren naar klembord? | Mogelijk, met PIM-allow | **Nooit** |
| Print? | Mogelijk, met PIM-allow | **Nooit** |
| Delen via webshare? | Mogelijk, met PIM-allow | **Nooit** |
| Lokaal opslaan? | Toegestaan | Toegestaan, alleen versleuteld |
| Herstel naar origineel? | Onmogelijk | Toegestaan, lokaal |
| Output bevat tokens? | Nooit | Altijd |
| Output bevat ruwe persoonsgegevens? | Nooit | Nooit |

### 2.4 Geen stille modus-wisseling

Een gebruiker kan tijdens een sessie van modus wisselen, maar dan wordt de invoer opnieuw verwerkt. Een pseudonieme tekst wordt nooit "automatisch geanonimiseerd". Een anonieme tekst kan niet "tijdelijk pseudoniem worden gemaakt om te exporteren".

PiM kent geen modus die "tussen anoniem en pseudoniem" zit. Wie zo'n modus mist, mist iets dat PiM bewust niet biedt.

---

## 3. Juridische afbakening

### 3.1 Toepasselijk kader

PiM is ontworpen tegen het kader van:

- **Algemene Verordening Gegevensbescherming (AVG/GDPR)** — definities van persoonsgegevens, bijzondere categorieën, pseudonimisering en anonimisering;
- **AI Act** (EU 2024/1689) — verboden praktijken en hoog-risico-toepassingen, met name profileringsverboden in onderwijs en zorg;
- **Sectorrechten** — onderwijswetten, jeugdwet, WGBO, en organisatie-eigen reglementen.

PiM is een hulpmiddel binnen dit kader, geen vervanging van juridische beoordeling.

### 3.2 Definities zoals dit document ze gebruikt

- **Persoonsgegevens**: alle informatie over een geïdentificeerde of identificeerbare natuurlijke persoon (AVG art. 4 lid 1).
- **Bijzondere persoonsgegevens**: gezondheid, religieuze of levensbeschouwelijke overtuigingen, etnische afkomst, politieke opvattingen, lidmaatschap vakvereniging, seksueel gedrag of seksuele oriëntatie, biometrische gegevens voor unieke identificatie, genetische gegevens (AVG art. 9).
- **Pseudonimisering**: zodanig verwerken dat persoonsgegevens niet meer aan een specifieke persoon kunnen worden gekoppeld zonder aanvullende informatie, mits die aanvullende informatie afzonderlijk wordt bewaard met technische en organisatorische maatregelen (AVG art. 4 lid 5).
- **Anonimisering**: zodanig verwerken dat de persoon niet meer identificeerbaar is. Anonieme gegevens vallen buiten de AVG. PiM beweert niet dat zijn anonieme output dit niveau wettelijk haalt — zie sectie 1.2.
- **Identificeerbaar**: redelijkerwijze identificeerbaar, gezien alle middelen die redelijkerwijs door de verantwoordelijke of een derde gebruikt kunnen worden (AVG overweging 26).

### 3.3 Verboden praktijken die PiM expliciet niet ondersteunt

- **Leerlingprofilering** — PiM bouwt geen persistent profiel van een leerling, medewerker of cliënt. Detectiesignalen worden niet opgeslagen of geaggregeerd over teksten heen, behalve in de minimale audit (sectie 26) en die bevat geen inhoud.
- **Geautomatiseerde besluiten met juridisch gevolg op basis van bijzondere categorieën** — PiM neemt geen besluiten over personen, alleen over teksten.
- **Heimelijke verwerking** — alle verwerking is zichtbaar in de UI; er is geen verborgen logging van inhoud.
- **Doorverkoop, externe analyse of training op gebruikersinvoer** — PiM stuurt invoer niet naar derden.

### 3.4 Wat PiM aan de juridisch verantwoordelijke vraagt

- documenteer per use-case welke modus passend is;
- voer een DPIA uit waar dat verplicht is;
- communiceer naar betrokkenen welke verwerking plaatsvindt;
- beoordeel restrisico per use-case — PiM toont risk en redenen, maar de beoordeling is menselijk.

---

## 4. Dreigingsmodel

### 4.1 In scope

- per ongeluk delen van een naam, e-mail, BSN of adres in een externe AI-prompt;
- per ongeluk exporteren van een document met identificeerbare context;
- per ongeluk loggen van invoer naar console, foutendienst of analytics;
- modelhallucinatie waarbij een lokaal taalmodel namen of details verzint die toch op echte personen lijken;
- combinatie-aanvallen waarbij meerdere op zichzelf onschuldige kenmerken samen een persoon onthullen;
- het lekken van een mapping (pseudonieme modus) naar buiten de browser;
- het ongezien wisselen tussen anoniem en pseudoniem;
- modelmanipulatie — een aangeroepen detector levert valse resultaten;
- ongeauthenticeerde modelbestanden (verkeerd model gedownload).

### 4.2 Buiten scope

- het beveiligen van het apparaat zelf tegen gerichte aanvallen op browser of OS;
- het beveiligen tegen achtergrondkennis bij de menselijke lezer;
- het garanderen van anonimiteit tegen partijen die externe datasets kunnen koppelen;
- inhoudsmoderatie buiten privacy (haatzaaien, geweld) — dat is een aanpalend probleem.

### 4.3 Aannames

- de browser draait een actuele versie met standaard sandboxing;
- de gebruiker heeft toestemming om de invoertekst te verwerken;
- modellen worden geladen via een mirror onder controle van de organisatie of van een vertrouwde tussenpartij;
- modellen zijn vooraf gepind op een specifieke versie en SHA256-hash;
- de verantwoordelijke organisatie houdt zich aan de productiegate uit sectie 49.

---

## 5. Architectuur op één pagina

```txt
┌─────────────────────────────────────────────────────────────┐
│                    Browser (lokaal)                         │
│                                                             │
│   Invoer                                                    │
│     │                                                       │
│     ▼                                                       │
│   Pipeline (configureerbaar via PipelineProfile)            │
│     ├── rules-detector       (deterministisch, code)        │
│     ├── ner-slm-detector     (lokale SLM, optioneel)        │
│     ├── context-slm-detector (lokale SLM, optioneel)        │
│     └── rewrite-llm-detector (lokale LLM, optioneel)        │
│     │                                                       │
│     ▼                                                       │
│   Merge → Risk → Generaliseer / Pseudonimiseer              │
│     │                                                       │
│     ▼                                                       │
│   Draft Check Guard                                         │
│     │                                                       │
│     ▼                                                       │
│   PIM (deterministische beslislaag)                         │
│     │                                                       │
│     ▼                                                       │
│   Production Egress Guard ← handhaaft PIM-besluit           │
│     │                                                       │
│     ▼                                                       │
│   Output: display, copy, save_local, restore,               │
│           export_file, send_external_ai, print, share       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Elke pijl is in code een functieaanroep met expliciete types. Geen losse globale state. Geen verborgen pad.

---

## 6. Pluginmodel — vrijheid binnen kaders

### 6.1 Waarom plugins

Een privacytool moet zich aanpassen aan domein, taal en risicotolerantie. Onderwijs heeft andere lexicons dan zorg. Nederlandstalige tekst heeft andere NER-modellen nodig dan Engelstalige tekst. Een ziekenhuis wil misschien een zwaardere `safeguarding`-detectie; een uitgever wil misschien helemaal geen NER omdat zijn invoer al gestructureerd is.

PiM lost dat op met **configuratie-plugins**: de gebruiker kiest welke detectoren actief zijn, in welke taal, met welke parameters — uit een vaste, ondertekende catalogus.

### 6.2 Wat dit pluginmodel wel is

- een **vaste catalogus** van detectoren en modellen, gepubliceerd door de PiM-distributeur;
- elk catalogus-item heeft een **id**, een **versie**, een **integriteits-hash** en een **declaratie** van wat het detecteert;
- de gebruiker kiest een **PipelineProfile**: welke catalogus-items zijn aan, in welke volgorde, met welke parameters;
- elk profiel wordt gevalideerd voor het wordt geactiveerd; een profiel zonder verplichte baseline-detectoren wordt geweigerd.

### 6.3 Wat dit pluginmodel niet is

- **geen dynamic loading** van willekeurige code in de browser;
- **geen mogelijkheid om PIM zelf te vervangen of te overrulen** — PIM is altijd identiek en niet-configureerbaar;
- **geen route waarmee een gebruiker invariants kan uitzetten**;
- **geen mogelijkheid om de baseline-detectoren te verwijderen** (rules + lexicon voor bijzondere categorieën zijn altijd verplicht).

### 6.4 Verplichte baseline

In elk profiel zijn deze detectoren altijd actief, zonder uitzondering:

- `rules` — regex en validators voor BSN, IBAN, e-mail, telefoon, postcode, adres, identificatienummers, datums;
- `special-category-lexicon` — lexicon-detector voor AVG art. 9 categorieën en domeinspecifieke gevoelige categorieën van het profiel.

Een profiel waarin deze baseline ontbreekt, wordt door de configuratie-validator geweigerd. Geen profiel = geen verwerking.

### 6.5 Optionele detectoren

Per profiel kan de gebruiker kiezen uit een aantal door de catalogus aangeboden detectoren. Voorbeelden:

- `ner-slm-nl` — NER-SLM voor Nederlandse namen, organisaties en plaatsen;
- `ner-slm-en` — Engelse equivalent;
- `ner-slm-multilingual` — multilingual NER;
- `context-slm-nl-education` — contextuele rubrieken voor Nederlands onderwijs;
- `context-slm-nl-healthcare` — contextuele rubrieken voor Nederlandse zorg;
- `rewrite-llm-nl-small` — kleine lokale LLM voor herschrijven, NL;
- `rewrite-llm-en-small` — Engels equivalent.

De catalogus groeit, maar elk item moet door de PiM-distributeur worden ondertekend en gehasht voor het in de catalogus komt.

### 6.6 Taalkeuze en taal-onafhankelijkheid

De `rules`-detector is grotendeels **taal-onafhankelijk**. BSN, IBAN, e-mail-syntax, IP-adres, datums in numeriek formaat, postcodes — die werken zonder taalmodel.

Lexicons en NER-modellen zijn **taalafhankelijk**. Een Nederlandse `safeguarding`-lexicon herkent "Veilig Thuis"; een Engelse lexicon doet dat niet. Een Nederlandse NER vindt "Yusuf" als naam; een Engels model zou kunnen falen op zeldzame Nederlandse namen.

Elke detector in de catalogus declareert zijn taal in `language: 'nl' | 'en' | 'language-agnostic' | 'multilingual'`. De configuratie-validator weigert profielen waarin de actieve talen elkaar uitsluiten.

### 6.7 Trade-off: wel of geen pre-trained SLM?

Een gebruiker mag een profiel kiezen **zonder** SLM/LLM-detectoren. Bijvoorbeeld:

- de invoer is gestructureerde data waarin namen al in vaste velden staan, dus NER toevoegt niets;
- de invoer is in een taal waarvoor geen NER-model beschikbaar is, en de gebruiker accepteert dat alleen `rules` werkt;
- de organisatie wil geen modellen laden om bandbreedte- of integriteitsredenen.

In dat geval blijft de baseline (rules + lexicon) actief. PiM merkt zo'n profiel als **rules-only** en doet drie dingen:

- de risicoscore krijgt een **vaste opslag** (`rulesOnlyRiskBoost`) omdat ontbrekende detectie niet hetzelfde is als afwezig risico;
- de UI toont een waarschuwing dat detectie beperkt is;
- bepaalde acties (`send_external_ai`, `export_file`) worden door PIM **strenger** beoordeeld in een rules-only profiel, of geblokkeerd boven een lagere risk-drempel.

PiM verzwijgt de keuze nooit. Elk PIM-besluit verwijst expliciet naar het actieve profiel en de actieve detectoren.

---

## 7. Detectie-taxonomie

PiM detecteert in drie lagen. Elke detectie krijgt een **severity** (`low | medium | high | critical`) en een **confidence** (0..1). PIM gebruikt severity voor classificatie, confidence voor scoring.

### 7.1 Directe persoonsgegevens

Alleen-staand of bijna alleen-staand identificerend.

#### 7.1.1 Critical (alleen-staand identificerend)

| Label | Definitie | Detectie-signaal | Severity |
|---|---|---|---|
| `bsn` | Burgerservicenummer | regex + 11-proef | critical |
| `iban` | Bankrekeningnummer | regex + mod-97 | critical |
| `passport_number` | Paspoort/ID-nummer | regex per land | critical |
| `digid_id` | DigiD-username of nummer | regex + context | critical |
| `national_id_other` | Buitenlands persoonsnummer | NER + regex | critical |

Een `critical`-detectie blokkeert externe AI altijd, ongeacht modus of profiel.

#### 7.1.2 High (identificerend in normale context)

| Label | Definitie | Detectie-signaal | Severity |
|---|---|---|---|
| `full_name` | Voornaam + achternaam | NER + lexicon | high |
| `email_personal` | E-mail met persoonlijke handle | regex | high |
| `phone_mobile` | Mobiel telefoonnummer | regex per land | high |
| `address_full` | Straat + huisnummer + postcode | regex + NER | high |
| `postcode_huisnummer` | NL-postcode + huisnummer | regex | high |
| `birthdate_exact` | Volledige geboortedatum | regex + context | high |
| `student_number` | Leerling-/studentnummer | regex + lexicon | high |
| `employee_number` | Medewerkersnummer | regex + lexicon | high |
| `username_handle` | Persoonlijke gebruikersnaam | regex + context | high |
| `url_personal_id` | URL met persoonlijke identifier | regex | high |
| `photo_face_reference` | Tekstuele verwijzing naar foto | lexicon + context | high |

#### 7.1.3 Medium (identificerend in combinatie)

| Label | Definitie | Detectie-signaal | Severity |
|---|---|---|---|
| `first_name_only` | Alleen voornaam | NER | medium |
| `last_name_only` | Alleen achternaam | NER | medium |
| `partial_postcode` | Postcode zonder huisnummer | regex | medium |
| `birthdate_partial` | Maand+jaar of dag+maand | regex | medium |
| `school_name` | Schoolnaam of vestiging | NER + lexicon | medium |
| `class_code` | Klas of groepsaanduiding | regex + lexicon | medium |
| `place_name_school_context` | Plaatsnaam met institutionele context | NER + co-occurrence | medium |
| `ip_address` | IP-adres | regex | medium |
| `device_id` | Apparaat- of MAC-adres | regex | medium |
| `email_role` | Rol-e-mailadres | regex | medium |

#### 7.1.4 Detectie-aandachtspunten

- BSN-detectie vereist 11-proef. Telefoonnummers of willekeurige cijferreeksen mogen geen BSN-flag krijgen.
- IBAN-detectie vereist mod-97-validatie.
- Geboortedatums alleen flaggen wanneer ze in een plausibel bereik vallen voor de doelgroep van het profiel (typisch huidige eeuw, breder voor medewerkers).
- `first_name_only` en `last_name_only` worden nooit alleen-staand `high`. Ze worden zwaarder via interactie met andere signalen.

### 7.2 Bijzondere categorieën

#### 7.2.1 AVG art. 9 — universeel

| Label | Grondslag | Severity |
|---|---|---|
| `health_condition` | gezondheid | high |
| `disability` | gezondheid | high |
| `mental_health` | gezondheid | high |
| `religion` | religieuze overtuiging | high |
| `ethnicity` | raciale/etnische afkomst | high |
| `sexual_orientation` | seksuele oriëntatie | critical |
| `gender_identity` | geslachtsidentiteit (analoog) | critical |
| `political_opinion` | politieke opvatting | high |
| `union_membership` | lidmaatschap vakvereniging | high |
| `biometric_reference` | biometrisch | critical |
| `genetic_reference` | genetisch | critical |

#### 7.2.2 Domeinspecifiek — onderwijs en zorg

| Label | Definitie | Severity |
|---|---|---|
| `support_need` | Aangewezen ondersteuningsbehoefte (dyslexie, ADHD, autisme als diagnose, hoogbegaafdheid in zorgcontext) | high |
| `youth_care_involvement` | Jeugdzorg, jeugdbescherming, voogdij | critical |
| `foster_care` | Pleegzorg, gezinshuis | critical |
| `safeguarding_signal` | Veilig Thuis, kindermishandeling, huiselijk geweld, melding | critical |
| `migration_status` | Asiel, statushouder, AZC, ongedocumenteerd, recente NT2-instroom | high |
| `home_language_minority` | Niet-NL thuistaal als kenmerk | medium |
| `financial_distress_family` | Schulden, voedselbank, kwijtschelding | high |
| `behavioral_incident` | Schorsing, time-out, fysiek incident, politie-betrokkenheid | high |
| `attendance_concern` | Verzuim, leerplicht, langdurig ziekteverzuim | medium |
| `academic_underperformance` | Doublure, afstroom, ontwikkelingsperspectief | medium |
| `bullying_involvement` | Pesten als slachtoffer of pleger | high |

Welke domeinspecifieke labels actief zijn, hangt af van de **lexicon-plugin** in het profiel (sectie 6).

#### 7.2.3 Geen profilering

PiM slaat detectiesignalen niet op buiten de huidige verwerking. Geen leerlingprofielen, geen patiëntprofielen. Bijzondere categorieën zijn alleen signalen voor risicobeoordeling van de **huidige tekst**.

### 7.3 Quasi-identifiers

Velden die niet identificeren maar de zoekruimte verkleinen.

| Label | Definitie | Severity |
|---|---|---|
| `age_exact` | Exacte leeftijd in jaren | medium |
| `grade_level` | Klas of leerjaar | low |
| `school_type` | Onderwijssoort | low |
| `region_municipality` | Gemeente of regio | low |
| `nationality` | Nationaliteit | medium |
| `parental_role` | "moeder van", "vader van" als rol | medium |
| `staff_role_unique` | Unieke rolnaam in een institutie | high |
| `sibling_reference` | "het zusje van" | medium |

Quasi-identifiers zijn zelden alleen-staand kritiek, maar zwaar in interactie (zie 7.4).

### 7.4 Contextuele rubrieken

Context kan herleiden zonder directe PII. PiM detecteert dit als gestructureerde rubrieken met **definitie**, **niveau** (`low | medium | high`), en **scoringsbijdrage**.

| Rubriek | Definitie | Scoringsbijdrage (laag → hoog) |
|---|---|---|
| `small_group_risk` | Persoon in een groep die naar verwachting klein is, gecombineerd met een kenmerk | 0.10 → 0.18 |
| `unique_role_risk` | Verwijzing naar een rol die typisch door één persoon wordt vervuld | 0.12 → 0.20 |
| `safeguarding_context` | Tekst speelt zich af binnen of verwijst naar een safeguarding-traject | 0.18 → 0.25 |
| `temporal_specificity` | Tijdspecificiteit; van schooljaar (low) tot specifieke dag (high) | 0.00 → 0.12 |
| `location_specificity` | Locatie van regio (low) tot wijk/gebouw (high) | 0.00 → 0.12 |
| `school_specificity` | Mate waarin de instelling identificeerbaar is zonder naam | 0.00 → 0.15 |
| `rare_combination_risk` | Meerdere quasi-identifiers samen die de zoekruimte sterk verkleinen | 0.10 → 0.22 |
| `family_context` | Beschrijving van gezinssamenstelling | 0.06 → 0.15 |
| `peer_reference` | Verwijzing naar tweede persoon (medeleerling, ouder) op herleidbare manier | 0.06 → 0.15 |
| `behavioral_specificity` | Gedetailleerde gedragsbeschrijving die met datum/locatie identificeert | 0.06 → 0.18 |

### 7.5 Interactie-effecten

Sommige combinaties zijn gevaarlijker dan de som van hun delen. PiM telt extra opslag voor:

| Interactie | Voorwaarden | Opslag |
|---|---|---|
| `smallGroupWithSpecialCategory` | `small_group_risk` ≥ low én een bijzondere categorie aanwezig | +0.10 |
| `uniqueRoleWithParentalRole` | `unique_role_risk` ≥ low én `parental_role` aanwezig | +0.08 |
| `safeguardingWithExport` | `safeguarding_context` ≥ low én actie is egress (export, send_external_ai, share, print) | +0.15 |
| `behavioralWithTemporal` | `behavioral_specificity` ≥ low én `temporal_specificity` ≥ medium | +0.08 |

### 7.6 Voorbeelden

| Tekst | Verwachte labels | Verwachte rubrieken | Verwacht risk |
|---|---|---|---|
| "Een leerling vroeg me iets na de les." | — | — | low |
| "Yusuf uit groep 7 had een goede dag." | `first_name_only`, `class_code` | — | medium |
| "De enige leerling met dyscalculie in groep 7B." | `support_need`, `class_code` | `small_group_risk` | high |
| "Het kind van de conciërge schorste gisteren." | `parental_role`, `behavioral_incident` | `unique_role_risk`, `temporal_specificity:high`, `behavioral_specificity` | high |
| "Na de melding bij Veilig Thuis is M. opgevangen door pleegouders." | `safeguarding_signal`, `foster_care`, `first_name_only` | `safeguarding_context` | critical |
| "11-jarige Oekraïense leerling, recent ingestroomd, groep 8, Lochem." | `age_exact`, `migration_status`, `grade_level`, `region_municipality` | `rare_combination_risk`, `temporal_specificity` | high |

---

## 8. Hoe code, SLM en LLM samenwerken

### 8.1 Twee soorten detectie

PiM heeft een eenvoudige verdeling:

- **Deterministische detectie** — regex en lexicon. Snel, betrouwbaar, herhaalbaar. Goed voor patronen (BSN, IBAN, e-mail) en woordenlijsten (lexicon voor bijzondere categorieën).
- **Semantische detectie** — taalmodellen. Nuttig voor namen die niet in een lexicon staan, voor het herkennen van rubrieken zoals "kleine groep" en voor herschrijven van tekst in natuurlijk Nederlands.

Beide leveren signalen aan PIM. PIM beslist.

### 8.2 Modellen beslissen nooit

Een taalmodel mag in PiM alleen signalen produceren. Het mag niet:

- bepalen of een actie mag doorgaan;
- bepalen of een tekst veilig is;
- vragen om bevestiging aan de gebruiker;
- de gebruiker een prompt voorleggen die als beslissing fungeert.

### 8.3 Conflictregel

Bij tegenstrijdige signalen geldt altijd de **strengste uitkomst**:

```txt
code zegt risico, model zegt veilig    -> risico
model zegt risico, code zegt veilig    -> risico
model is onzeker                        -> risk verhogen
model ontbreekt of is niet geverifieerd -> rules-only-mode + boost
```

### 8.4 Detector-contract — uniforme aanroep

Elke detector — rules, NER-SLM, context-SLM, rewrite-LLM — implementeert hetzelfde TypeScript-contract. PiM heeft geen registry die runtime-pluggable is, maar de plugin-keuze uit sectie 6 selecteert welke detectoren actief zijn.

```ts
export type DetectorPurpose = 'direct-pii' | 'rubric' | 'rewrite';

export interface DetectorInput {
  text: string;
  mode: PrivacyMode;
  intendedAction: IntendedAction;
  language: 'nl' | 'en' | 'multilingual' | 'language-agnostic';
  priorDetections?: DetectionSpan[];
  priorRubric?: ContextRubric;
}

export interface DetectorResult {
  detectorId: string;
  detections: DetectionSpan[];
  rubricSignals: RubricSignal[];
  rewrittenText?: string;
  uncertain: boolean;
  failed: boolean;
  failReason?: string;
}

export interface PrivacyDetector {
  readonly id: string;
  readonly purpose: DetectorPurpose;
  readonly runtime: 'code' | 'slm' | 'llm';
  readonly language: 'nl' | 'en' | 'multilingual' | 'language-agnostic';
  readonly requiresModel?: string;
  readonly failPolicy: 'fail-closed' | 'fail-open-with-warning';
  detect(input: DetectorInput): Promise<DetectorResult>;
}
```

### 8.5 Verboden velden in detector-output

Geen detector mag een DetectorResult retourneren met:

- een `decision`- of `pimDecision`-veld;
- een `mappingEntries`- of `rawText`-veld;
- een veld dat ruwe invoer of mapping doorgeeft.

Een type-guard `assertDetectorContract` controleert dit na elke aanroep.

### 8.6 Volgorde en early-exit

De orchestrator draait detectoren in een vaste volgorde:

1. `rules` (verplicht, snel, deterministisch);
2. `special-category-lexicon` (verplicht);
3. `ner-slm` (indien actief en model integer);
4. `context-slm` (indien actief en model integer);
5. `rewrite-llm` (alleen wanneer modus en actie dit nodig hebben).

Bij een `critical`-detectie in stap 1 of 2 in combinatie met een egress-actie mag de orchestrator besluiten direct te blokkeren. Voor draft-acties (`display`, `save_local`) draait alle context-detectie altijd door, zodat de gebruiker volledige feedback krijgt.

---

## 9. Modellen en model-integriteit

### 9.1 Modellen die PiM in de catalogus opneemt

Elk model in de PiM-catalogus is:

- **lokaal** — draait in de browser via WebGPU of WASM, geen externe call;
- **gepind** — vaste versie, vaste SHA256-hash;
- **gedeclareerd** — taalbereik, taakbeschrijving, runtime-eis;
- **ondertekend** — door de PiM-distributeur via een vertrouwde mirror.

### 9.2 Integriteitsgate

Voor elk modelgebruik geldt:

1. download model van de gepinde URL;
2. bereken SHA256 van het binary-blob;
3. vergelijk met de in de catalogus vermelde hash;
4. weiger model bij mismatch — fail-closed;
5. cache geverifieerd model in IndexedDB voor hergebruik.

```ts
export interface ModelGateResult {
  verified: boolean;
  modelId: string;
  modelVersion: string;
  reason?: string;
}

export async function loadVerifiedModel(spec: ModelCatalogEntry): Promise<ModelGateResult> {
  const blob = await fetchModelBlob(spec.url);
  const computedHash = await sha256Hex(blob);
  if (computedHash !== spec.expectedSha256) {
    return { verified: false, modelId: spec.id, modelVersion: spec.version, reason: 'hash_mismatch' };
  }
  await cacheVerifiedBlob(spec.id, blob);
  return { verified: true, modelId: spec.id, modelVersion: spec.version };
}
```

### 9.3 Wat gebeurt er als een model faalt?

Bij een falende integriteitsgate:

- de detector die het model nodig heeft retourneert `failed: true`;
- `modelState[detector] = false`;
- `slmUncertain = true` in de risicoberekening;
- PIM blokkeert alle acties waarvoor dat model nodig is — meestal alle egress-acties.

`display` en `save_local` mogen vaak nog door, met expliciete waarschuwing dat detectie beperkt is.

---

## 10. Repositorystructuur

```txt
project-pim/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   ├── privacy.config.ts
│   │   │   ├── taxonomy.ts
│   │   │   ├── modelCatalog.ts
│   │   │   ├── modelIntegrity.ts
│   │   │   ├── pipelineProfile.ts
│   │   │   ├── detectors/
│   │   │   │   ├── detectorContract.ts
│   │   │   │   ├── rulesDetector.ts
│   │   │   │   ├── specialCategoryLexicon.ts
│   │   │   │   ├── nerSlmDetector.ts
│   │   │   │   ├── contextSlmDetector.ts
│   │   │   │   └── rewriteLlmDetector.ts
│   │   │   ├── mergeDetections.ts
│   │   │   ├── risk.ts
│   │   │   ├── anonymize.ts
│   │   │   ├── pseudonymize.ts
│   │   │   ├── secureMapping.ts
│   │   │   ├── contextualGeneralization.ts
│   │   │   ├── draftCheckGuard.ts
│   │   │   ├── repairAnonymousDraft.ts
│   │   │   ├── pimPolicy.ts
│   │   │   ├── productionEgressGuard.ts
│   │   │   ├── restoreGuard.ts
│   │   │   ├── minimalAudit.ts
│   │   │   ├── reviewQueue.ts
│   │   │   ├── differentialPrivacy.ts
│   │   │   ├── abuseDetection.ts
│   │   │   ├── runtimeHardening.ts
│   │   │   ├── processText.ts
│   │   │   ├── hash.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   │   ├── pimPolicy.test.ts
│   │   │   ├── draftGuard.test.ts
│   │   │   ├── egressGuard.test.ts
│   │   │   ├── mapping.test.ts
│   │   │   ├── modelGate.test.ts
│   │   │   ├── detectorContract.test.ts
│   │   │   ├── pipelineProfile.test.ts
│   │   │   ├── rubricScoring.test.ts
│   │   │   ├── invariants.test.ts
│   │   │   ├── privacyProperties.test.ts
│   │   │   └── fixtures.ts
│   │   └── package.json
│   ├── ui/
│   │   ├── PrivacyModeToggle.tsx
│   │   ├── PipelineProfilePicker.tsx
│   │   ├── BrowserPrivacyLoadingIndicator.tsx
│   │   ├── DraftSafetyBadge.tsx
│   │   ├── AnonymityClaimNotice.tsx
│   │   └── PimDecisionPanel.tsx
│   └── browser-workbench/
│       ├── index.html
│       ├── src/
│       │   ├── App.tsx
│       │   └── main.tsx
│       └── package.json
├── docs/
│   └── Project-PiM-source.md
├── .github/
│   └── workflows/
│       └── ci.yml
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── README.md
└── LICENSE
```

PIM zit in `core` als deterministische TypeScript-code. De UI is presentatie. De catalogus zit in `modelCatalog.ts`. Profielen zitten in `pipelineProfile.ts`. Detectoren staan in `detectors/`.

---

# DEEL B: TypeScript core

## 11. types.ts

### 11.1 Modi, acties en risico

```ts
export type PrivacyMode = 'anonymous' | 'pseudonymous';

export type IntendedAction =
  | 'display'
  | 'copy'
  | 'save_local'
  | 'restore'
  | 'send_external_ai'
  | 'export_file'
  | 'print'
  | 'share'
  | 'debug_log';

export type RiskLevel = 'low' | 'medium' | 'high' | 'blocked';
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type DraftStatus =
  | 'draft_unchecked'
  | 'draft_blocked'
  | 'draft_repair_needed'
  | 'draft_certified_anonymous'
  | 'draft_certified_pseudonymous';

export type DetectionSource =
  | 'rule'
  | 'special_category_lexicon'
  | 'slm_ner'
  | 'slm_context'
  | 'rewrite'
  | 'draft_guard';
```

### 11.2 Labels

```ts
export type DirectPiiType =
  | 'bsn' | 'iban' | 'passport_number' | 'digid_id' | 'national_id_other'
  | 'full_name' | 'email_personal' | 'phone_mobile' | 'address_full'
  | 'postcode_huisnummer' | 'birthdate_exact' | 'student_number'
  | 'employee_number' | 'username_handle' | 'url_personal_id'
  | 'photo_face_reference'
  | 'first_name_only' | 'last_name_only' | 'partial_postcode'
  | 'birthdate_partial' | 'school_name' | 'class_code'
  | 'place_name_school_context' | 'ip_address' | 'device_id' | 'email_role';

export type SpecialCategoryType =
  | 'health_condition' | 'disability' | 'mental_health'
  | 'religion' | 'ethnicity' | 'sexual_orientation' | 'gender_identity'
  | 'political_opinion' | 'union_membership'
  | 'biometric_reference' | 'genetic_reference'
  | 'support_need' | 'youth_care_involvement' | 'foster_care'
  | 'safeguarding_signal' | 'migration_status' | 'home_language_minority'
  | 'financial_distress_family' | 'behavioral_incident'
  | 'attendance_concern' | 'academic_underperformance'
  | 'bullying_involvement';

export type QuasiIdentifierType =
  | 'age_exact' | 'grade_level' | 'school_type'
  | 'region_municipality' | 'nationality'
  | 'parental_role' | 'staff_role_unique' | 'sibling_reference';

export type PiiLabel = DirectPiiType | SpecialCategoryType | QuasiIdentifierType;
```

### 11.3 Rubrieken

```ts
export type RubricLabel =
  | 'small_group_risk' | 'unique_role_risk' | 'safeguarding_context'
  | 'temporal_specificity' | 'location_specificity' | 'school_specificity'
  | 'rare_combination_risk' | 'family_context'
  | 'peer_reference' | 'behavioral_specificity';

export type RubricLevel = 'low' | 'medium' | 'high';

export interface RubricSignal {
  label: RubricLabel;
  level: RubricLevel;
  confidence: number;
  evidenceSpans: Array<{ start: number; end: number }>;
  rationale?: string;
}

export interface ContextRubric {
  signals: RubricSignal[];
  quasiIdentifierCount: number;
  interactionFlags: {
    smallGroupWithSpecialCategory: boolean;
    uniqueRoleWithParentalRole: boolean;
    safeguardingWithExport: boolean;
    behavioralWithTemporal: boolean;
  };
}
```

### 11.4 Detector-interface

```ts
export type DetectorPurpose = 'direct-pii' | 'rubric' | 'rewrite';
export type DetectorLanguage = 'nl' | 'en' | 'multilingual' | 'language-agnostic';

export interface DetectorInput {
  text: string;
  mode: PrivacyMode;
  intendedAction: IntendedAction;
  language: DetectorLanguage;
  priorDetections?: DetectionSpan[];
  priorRubric?: ContextRubric;
}

export interface DetectorResult {
  detectorId: string;
  detections: DetectionSpan[];
  rubricSignals: RubricSignal[];
  rewrittenText?: string;
  uncertain: boolean;
  failed: boolean;
  failReason?: string;
}

export interface PrivacyDetector {
  readonly id: string;
  readonly purpose: DetectorPurpose;
  readonly runtime: 'code' | 'slm' | 'llm';
  readonly language: DetectorLanguage;
  readonly requiresModel?: string;
  readonly failPolicy: 'fail-closed' | 'fail-open-with-warning';
  detect(input: DetectorInput): Promise<DetectorResult>;
}
```

### 11.5 Detection en signals

```ts
export interface DetectionSpan {
  start: number;
  end: number;
  label: PiiLabel;
  source: DetectionSource;
  severity: Severity;
  confidence: number;
  replacementHint?: string;
}

export interface PrivacySignals {
  directPii: Partial<Record<DirectPiiType, boolean>>;
  specialCategories: Partial<Record<SpecialCategoryType, boolean>>;
  quasiIdentifiers: Partial<Record<QuasiIdentifierType, boolean>>;
  rubric: ContextRubric;
  outputState: {
    containsRawPersonalData: boolean;
    containsPseudonymTokens: boolean;
    containsMapping: boolean;
    anonymizationMode: PrivacyMode;
    riskScore: number;
    riskLevel: RiskLevel;
  };
  modelState: {
    nerVerified: boolean;
    contextVerified: boolean;
    rewriteVerified: boolean;
  };
  pipelineState: {
    profileId: string;
    rulesOnlyMode: boolean;
    activeDetectorIds: string[];
  };
  mappingState: 'none' | 'local_only' | 'encrypted_local' | 'unsafe_present';
}
```

### 11.6 Mapping en resultaat

```ts
export interface MappingEntry {
  token: string;
  original: string;
  piiType: PiiLabel;
}

export interface MappingHandle {
  id: string;
  mode: 'memory_only' | 'encrypted_local';
}

export interface ProcessResult {
  mode: PrivacyMode;
  draft: string;
  draftStatus: DraftStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  signals: PrivacySignals;
  detections: DetectionSpan[];
  mappingHandle?: MappingHandle;
  policyVersion: string;
  profileId: string;
}
```

### 11.7 Beslissing en guard

```ts
export type PimDecisionValue = 'allow' | 'allow_with_warning' | 'block';

export interface PimDecision {
  decision: PimDecisionValue;
  action: IntendedAction;
  mode: PrivacyMode;
  ruleId: string;
  reasonCode: string;
  severity: 'info' | 'warning' | 'critical';
  policyVersion: string;
  profileId: string;
  modelVersion?: string;
  timestamp: string;
}

export interface GuardResult {
  passed: boolean;
  guard: string;
  ruleId: string;
  reasonCode: string;
  severity: 'info' | 'warning' | 'critical';
}
```

### 11.8 Catalogus en profiel

```ts
export interface ModelCatalogEntry {
  id: string;
  version: string;
  url: string;
  expectedSha256: string;
  runtime: 'webgpu' | 'wasm';
  task: 'token-classification' | 'text-classification' | 'text-generation';
  language: DetectorLanguage;
  purpose: DetectorPurpose;
  upstreamModelId?: string;
  baseModelId?: string;
  runtimePackage?: '@huggingface/transformers' | '@mlc-ai/web-llm' | 'internal';
  fallbackRuntime?: 'webgpu' | 'wasm';
  productionMirrorRequired?: boolean;
  notes?: string;
}

export interface DetectorCatalogEntry {
  id: string;
  purpose: DetectorPurpose;
  runtime: 'code' | 'slm' | 'llm';
  language: DetectorLanguage;
  requiresModel?: string;
  description: string;
  isBaseline: boolean;
}

export interface PipelineProfile {
  id: string;
  displayName: string;
  description: string;
  domain: 'education-nl' | 'healthcare-nl' | 'generic-nl' | 'generic-en' | string;
  activeDetectorIds: string[];
  parameters: {
    minRubricConfidence?: number;
    rulesOnlyAcceptable?: boolean;
  };
}
```

### 11.9 Belangrijke invarianten over deze types

```txt
ProcessResult bevat nooit MappingEntry[].
Alleen een MappingHandle mag terugkomen.
DetectorResult bevat nooit een PimDecision.
DetectorResult bevat nooit ruwe persoonsgegevens in failReason of rationale.
PimDecision bevat altijd een profileId.
```

---

## 12. privacy.config.ts

```ts
export const PRIVACY_POLICY_VERSION = 'project-pim-source-1.0.0';

export const PRIVACY_THRESHOLDS = {
  anonymousExportMaxRisk: 0.25,
  anonymousExternalAiMaxRisk: 0.18,
  anonymousCopyMaxRisk: 0.30,
  reviewRequiredRisk: 0.45,
  blockRisk: 0.70,
  slmUncertaintyRiskBoost: 0.15,
  specialCategoryRiskBoost: 0.20,
  rulesOnlyRiskBoost: 0.20,
  // Strenger plafond voor egress in rules-only profielen.
  rulesOnlyAnonymousExportMaxRisk: 0.15,
  rulesOnlyAnonymousExternalAiMaxRisk: 0.10,
} as const;

export const RUBRIC_BOOSTS = {
  small_group_risk:       { low: 0.10, medium: 0.14, high: 0.18 },
  unique_role_risk:       { low: 0.12, medium: 0.16, high: 0.20 },
  safeguarding_context:   { low: 0.18, medium: 0.22, high: 0.25 },
  temporal_specificity:   { low: 0.00, medium: 0.06, high: 0.12 },
  location_specificity:   { low: 0.00, medium: 0.06, high: 0.12 },
  school_specificity:     { low: 0.00, medium: 0.08, high: 0.15 },
  rare_combination_risk:  { low: 0.10, medium: 0.16, high: 0.22 },
  family_context:         { low: 0.06, medium: 0.10, high: 0.15 },
  peer_reference:         { low: 0.06, medium: 0.10, high: 0.15 },
  behavioral_specificity: { low: 0.06, medium: 0.10, high: 0.18 },
} as const;

export const INTERACTION_BOOSTS = {
  smallGroupWithSpecialCategory: 0.10,
  uniqueRoleWithParentalRole:    0.08,
  safeguardingWithExport:        0.15,
  behavioralWithTemporal:        0.08,
} as const;

export const TOKEN_PREFIXES = [
  'STUDENT', 'TEACHER', 'PARENT', 'SCHOOL', 'CLASS', 'LOCATION',
  'DATE', 'SUPPORT_NEED', 'INCIDENT', 'ROLE', 'EMAIL', 'PHONE',
  'ADDRESS', 'POSTCODE', 'STUDENT_ID', 'STAFF_ID', 'ID', 'IBAN',
  'IP', 'DEVICE', 'URL', 'USERNAME', 'PHOTO_REF',
] as const;

export const BLOCKED_ACTIONS_ALWAYS = ['debug_log'] as const;

export const PSEUDONYMOUS_BLOCKED_EGRESS_ACTIONS = [
  'copy', 'export_file', 'print', 'share', 'send_external_ai',
] as const;

// Labels die in egress altijd hard-review forceren.
export const HARD_REVIEW_LABELS = [
  'safeguarding_signal',
  'youth_care_involvement',
  'foster_care',
  'biometric_reference',
  'genetic_reference',
  'sexual_orientation',
  'gender_identity',
  'mental_health',
] as const;
```

---

## 13. taxonomy.ts

Helpers en type-guards voor de taxonomie. Pure functies, geen state.

```ts
import type {
  PiiLabel, DirectPiiType, SpecialCategoryType, QuasiIdentifierType,
  Severity, RubricLevel,
} from './types';

const DIRECT_PII = new Set<DirectPiiType>([
  'bsn','iban','passport_number','digid_id','national_id_other',
  'full_name','email_personal','phone_mobile','address_full',
  'postcode_huisnummer','birthdate_exact','student_number',
  'employee_number','username_handle','url_personal_id','photo_face_reference',
  'first_name_only','last_name_only','partial_postcode','birthdate_partial',
  'school_name','class_code','place_name_school_context',
  'ip_address','device_id','email_role',
]);

const SPECIAL = new Set<SpecialCategoryType>([
  'health_condition','disability','mental_health',
  'religion','ethnicity','sexual_orientation','gender_identity',
  'political_opinion','union_membership','biometric_reference','genetic_reference',
  'support_need','youth_care_involvement','foster_care','safeguarding_signal',
  'migration_status','home_language_minority','financial_distress_family',
  'behavioral_incident','attendance_concern','academic_underperformance',
  'bullying_involvement',
]);

const QUASI = new Set<QuasiIdentifierType>([
  'age_exact','grade_level','school_type','region_municipality',
  'nationality','parental_role','staff_role_unique','sibling_reference',
]);

export function isDirectPiiLabel(l: PiiLabel): l is DirectPiiType {
  return DIRECT_PII.has(l as DirectPiiType);
}
export function isSpecialCategoryLabel(l: PiiLabel): l is SpecialCategoryType {
  return SPECIAL.has(l as SpecialCategoryType);
}
export function isQuasiIdentifierLabel(l: PiiLabel): l is QuasiIdentifierType {
  return QUASI.has(l as QuasiIdentifierType);
}

export const DEFAULT_SEVERITY: Record<PiiLabel, Severity> = {
  bsn:'critical', iban:'critical', passport_number:'critical',
  digid_id:'critical', national_id_other:'critical',
  full_name:'high', email_personal:'high', phone_mobile:'high',
  address_full:'high', postcode_huisnummer:'high', birthdate_exact:'high',
  student_number:'high', employee_number:'high', username_handle:'high',
  url_personal_id:'high', photo_face_reference:'high',
  first_name_only:'medium', last_name_only:'medium', partial_postcode:'medium',
  birthdate_partial:'medium', school_name:'medium', class_code:'medium',
  place_name_school_context:'medium', ip_address:'medium', device_id:'medium',
  email_role:'medium',
  health_condition:'high', disability:'high', mental_health:'high',
  religion:'high', ethnicity:'high',
  sexual_orientation:'critical', gender_identity:'critical',
  political_opinion:'high', union_membership:'high',
  biometric_reference:'critical', genetic_reference:'critical',
  support_need:'high', youth_care_involvement:'critical',
  foster_care:'critical', safeguarding_signal:'critical',
  migration_status:'high', home_language_minority:'medium',
  financial_distress_family:'high', behavioral_incident:'high',
  attendance_concern:'medium', academic_underperformance:'medium',
  bullying_involvement:'high',
  age_exact:'medium', grade_level:'low', school_type:'low',
  region_municipality:'low', nationality:'medium',
  parental_role:'medium', staff_role_unique:'high', sibling_reference:'medium',
};

export function deriveRareCombinationLevel(count: number): RubricLevel | null {
  if (count >= 4) return 'high';
  if (count >= 3) return 'medium';
  if (count >= 2) return 'low';
  return null;
}
```

---

## 14. modelCatalog.ts

De vaste, ondertekende catalogus van modellen die de PiM-distributeur aanbiedt. Een gebruiker kan kiezen welke catalogus-items actief zijn (via `pipelineProfile.ts`), maar kan geen items toevoegen die niet in de catalogus staan.

```ts
import type { ModelCatalogEntry } from './types';

export const MODEL_CATALOG: Readonly<Record<string, ModelCatalogEntry>> = {
  'ner-nl-v1': {
    id: 'ner-nl-v1',
    version: 'pinned-v3',
    upstreamModelId: 'jdp8/wikineural-multilingual-ner',
    baseModelId: 'Babelscape/wikineural-multilingual-ner',
    url: 'https://models.pim.example/mirrors/jdp8/wikineural-multilingual-ner/model.onnx',
    expectedSha256: 'REPLACE_WITH_PINNED_SHA256_BEFORE_PRODUCTION',
    runtime: 'webgpu',
    fallbackRuntime: 'wasm',
    runtimePackage: '@huggingface/transformers',
    task: 'token-classification',
    language: 'nl',
    purpose: 'direct-pii',
    productionMirrorRequired: true,
    notes: 'Primaire release-1 NER-route voor Nederlands onderwijs. Draait lokaal in de browser.',
  },

  'ner-multilingual-v1': {
    id: 'ner-multilingual-v1',
    version: 'pinned-v3',
    upstreamModelId: 'jdp8/wikineural-multilingual-ner',
    baseModelId: 'Babelscape/wikineural-multilingual-ner',
    url: 'https://models.pim.example/mirrors/jdp8/wikineural-multilingual-ner/model.onnx',
    expectedSha256: 'REPLACE_WITH_PINNED_SHA256_BEFORE_PRODUCTION',
    runtime: 'webgpu',
    fallbackRuntime: 'wasm',
    runtimePackage: '@huggingface/transformers',
    task: 'token-classification',
    language: 'multilingual',
    purpose: 'direct-pii',
    productionMirrorRequired: true,
    notes: 'Zelfde model als ner-nl-v1, maar als meertalige route gedeclareerd voor latere profielen.',
  },

  'context-nl-education-v2': {
    id: 'context-nl-education-v2',
    version: '2.0.0',
    upstreamModelId: 'pim-education-privacy-context-v2',
    url: 'https://models.pim.example/mirrors/pim-education-privacy-context-v2/model.onnx',
    expectedSha256: 'REPLACE_WITH_PINNED_SHA256_BEFORE_PRODUCTION',
    runtime: 'webgpu',
    fallbackRuntime: 'wasm',
    runtimePackage: '@huggingface/transformers',
    task: 'text-classification',
    language: 'nl',
    purpose: 'rubric',
    productionMirrorRequired: true,
    notes: 'Eigen onderwijscontextmodel. Zonder geverifieerde load: degrade_no_export.',
  },

  'context-nl-healthcare-v1': {
    id: 'context-nl-healthcare-v1',
    version: 'design-only-v3',
    url: 'https://models.pim.example/mirrors/context-nl-healthcare-v1/model.onnx',
    expectedSha256: 'REPLACE_WITH_PINNED_SHA256_BEFORE_PRODUCTION',
    runtime: 'webgpu',
    fallbackRuntime: 'wasm',
    runtimePackage: '@huggingface/transformers',
    task: 'text-classification',
    language: 'nl',
    purpose: 'rubric',
    productionMirrorRequired: true,
    notes: 'Niet actief in release 1. Alleen ontwerpvoorbereiding.',
  },

  'rewrite-nl-small-v1': {
    id: 'rewrite-nl-small-v1',
    version: 'pinned-v3',
    upstreamModelId: 'mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    url: 'https://models.pim.example/mirrors/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC/',
    expectedSha256: 'REPLACE_WITH_PINNED_SHA256_BEFORE_PRODUCTION',
    runtime: 'webgpu',
    runtimePackage: '@mlc-ai/web-llm',
    task: 'text-generation',
    language: 'nl',
    purpose: 'rewrite',
    productionMirrorRequired: true,
    notes: 'Alleen gebruiken op reeds geschoonde tekst. Nooit raw input of mapping prompten.',
  },
};
```

Productieregels:

```txt
Een model met expectedSha256 = 'REPLACE_...' mag niet worden geactiveerd in productie.
De catalogus is read-only op runtime — geen gebruiker kan items toevoegen.
Distributeur wijzigt de catalogus alleen via een nieuwe release.
```

---

## 15. pipelineProfile.ts

```ts
import type { PipelineProfile, DetectorCatalogEntry } from './types';

/**
 * De vaste catalogus van detectoren. Baseline = altijd actief.
 * Niet-baseline = optioneel via profielconfiguratie.
 */
export const DETECTOR_CATALOG: Readonly<Record<string, DetectorCatalogEntry>> = {
  'rules': {
    id: 'rules',
    purpose: 'direct-pii',
    runtime: 'code',
    language: 'language-agnostic',
    description: 'Regex en validators voor BSN, IBAN, e-mail, telefoon, adres, identificatienummers.',
    isBaseline: true,
  },
  'special-category-lexicon-nl': {
    id: 'special-category-lexicon-nl',
    purpose: 'direct-pii',
    runtime: 'code',
    language: 'nl',
    description: 'Nederlandse lexicon voor AVG art. 9 en domeinspecifieke gevoelige categorieën.',
    isBaseline: true,
  },
  'ner-slm-nl': {
    id: 'ner-slm-nl',
    purpose: 'direct-pii',
    runtime: 'slm',
    language: 'nl',
    requiresModel: 'ner-nl-v1',
    description: 'NER-SLM voor Nederlandse namen, organisaties en plaatsen.',
    isBaseline: false,
  },
  'ner-slm-en': {
    id: 'ner-slm-en',
    purpose: 'direct-pii',
    runtime: 'slm',
    language: 'en',
    requiresModel: 'ner-en-v1',
    description: 'NER-SLM voor Engelse namen, organisaties en plaatsen.',
    isBaseline: false,
  },
  'context-slm-nl-education': {
    id: 'context-slm-nl-education',
    purpose: 'rubric',
    runtime: 'slm',
    language: 'nl',
    requiresModel: 'context-nl-education-v2',
    description: 'Context-SLM voor onderwijs-rubrieken (kleine groep, unieke rol, safeguarding-context).',
    isBaseline: false,
  },
  'context-slm-nl-healthcare': {
    id: 'context-slm-nl-healthcare',
    purpose: 'rubric',
    runtime: 'slm',
    language: 'nl',
    requiresModel: 'context-nl-healthcare-v1',
    description: 'Context-SLM voor zorgcontext-rubrieken.',
    isBaseline: false,
  },
  'rewrite-llm-nl-small': {
    id: 'rewrite-llm-nl-small',
    purpose: 'rewrite',
    runtime: 'llm',
    language: 'nl',
    requiresModel: 'rewrite-nl-small-v1',
    description: 'Lokale LLM voor natuurlijker Nederlandse herschrijvingen.',
    isBaseline: false,
  },
};

/**
 * Voorgedefinieerde profielen die de distributeur uitlevert.
 * Release 1 accepteert alleen education-nl-full en education-nl-rules-only.
 * Andere profielen zijn ontwerpvoorbereiding en moeten in productie disabled blijven.
 * De gebruiker mag aangepaste profielen maken, mits gevalideerd door validateProfile().
 */
export const DEFAULT_PROFILES: Readonly<Record<string, PipelineProfile>> = {
  'education-nl-full': {
    id: 'education-nl-full',
    displayName: 'Onderwijs NL — volledig',
    description: 'Alle detectoren actief: rules, lexicon, NER, context, rewrite.',
    domain: 'education-nl',
    activeDetectorIds: [
      'rules',
      'special-category-lexicon-nl',
      'ner-slm-nl',
      'context-slm-nl-education',
      'rewrite-llm-nl-small',
    ],
    parameters: { minRubricConfidence: 0.5, rulesOnlyAcceptable: false },
  },
  'education-nl-rules-only': {
    id: 'education-nl-rules-only',
    displayName: 'Onderwijs NL — rules-only',
    description: 'Alleen baseline. Geen modellen geladen. Strenger plafond op egress.',
    domain: 'education-nl',
    activeDetectorIds: ['rules', 'special-category-lexicon-nl'],
    parameters: { rulesOnlyAcceptable: true },
  },
  'healthcare-nl-full': {
    id: 'healthcare-nl-full',
    displayName: 'Zorg NL — volledig',
    description: 'Rules + zorg-lexicon + NER + zorgcontext.',
    domain: 'healthcare-nl',
    activeDetectorIds: [
      'rules',
      'special-category-lexicon-nl',
      'ner-slm-nl',
      'context-slm-nl-healthcare',
    ],
    parameters: { minRubricConfidence: 0.5, rulesOnlyAcceptable: false, disabledInRelease1: true },
  },
};

export interface ProfileValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateProfile(profile: PipelineProfile): ProfileValidationResult {
  // 1. Baseline-detectoren moeten aanwezig zijn.
  const baselineIds = Object.values(DETECTOR_CATALOG)
    .filter(d => d.isBaseline)
    .map(d => d.id);

  // Een profiel moet minstens één baseline-detector per domein hebben.
  // Voor NL-domeinen is een NL-lexicon verplicht; voor generic-en bestaat
  // een aparte EN-lexicon (uit te breiden in de catalogus).
  if (!profile.activeDetectorIds.includes('rules')) {
    return { valid: false, reason: 'baseline_rules_missing' };
  }

  const hasLexicon = profile.activeDetectorIds.some(id =>
    id.startsWith('special-category-lexicon-')
  );
  if (!hasLexicon) {
    return { valid: false, reason: 'baseline_special_category_lexicon_missing' };
  }

  // 2. Alle actieve detectoren moeten in de catalogus staan.
  for (const id of profile.activeDetectorIds) {
    if (!(id in DETECTOR_CATALOG)) {
      return { valid: false, reason: `unknown_detector:${id}` };
    }
  }

  // 3. Talen moeten consistent zijn (geen conflict tussen NL- en EN-NER samen).
  const langs = new Set(
    profile.activeDetectorIds
      .map(id => DETECTOR_CATALOG[id].language)
      .filter(l => l !== 'language-agnostic' && l !== 'multilingual')
  );
  if (langs.size > 1) {
    return { valid: false, reason: 'conflicting_languages' };
  }

  return { valid: true };
}

export function isRulesOnly(profile: PipelineProfile): boolean {
  return profile.activeDetectorIds.every(id => DETECTOR_CATALOG[id].runtime === 'code');
}
```

Productieregels:

```txt
Een profiel zonder baseline = block (geen verwerking).
Een profiel met onbekende detector-id = block.
Een profiel met conflicterende talen = block.
Profielwissel betekent altijd opnieuw verwerken.
```

---

## 16. detectors/detectorContract.ts

```ts
import type { DetectorResult } from '../types';

export const FORBIDDEN_DETECTOR_FIELDS = [
  'decision', 'reasonCode', 'pimDecision',
  'mappingEntries', 'rawText', 'rawEvidence',
] as const;

export function assertDetectorContract(r: DetectorResult): DetectorResult {
  for (const field of FORBIDDEN_DETECTOR_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(r, field)) {
      return {
        detectorId: r.detectorId,
        detections: [],
        rubricSignals: [],
        uncertain: true,
        failed: true,
        failReason: `forbidden_field:${field}`,
      };
    }
  }
  return r;
}

export interface DetectorTraceEntry {
  detectorId: string;
  ranAt: string;
  durationMs: number;
  failed: boolean;
  uncertain: boolean;
  failReason?: string;
  detectionCount: number;
  rubricSignalCount: number;
}
```

---

## 17. detectors/rulesDetector.ts

```ts
import type { PrivacyDetector, DetectorResult, DetectionSpan, PiiLabel } from '../types';
import { DEFAULT_SEVERITY } from '../taxonomy';
import { assertDetectorContract } from './detectorContract';

interface RulePattern {
  label: PiiLabel;
  regex: RegExp;
  confidence: number;
  validate?: (match: string) => boolean;
  replacementHint?: string;
}

function isValidBsn(s: string): boolean {
  const d = s.replace(/\D/g, '');
  if (d.length !== 9) return false;
  const w = [9,8,7,6,5,4,3,2,-1];
  return d.split('').reduce((a, c, i) => a + Number(c) * w[i], 0) % 11 === 0;
}

function isValidIban(s: string): boolean {
  const c = s.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(c)) return false;
  const re = c.slice(4) + c.slice(0,4);
  const num = re.replace(/[A-Z]/g, x => String(x.charCodeAt(0) - 55));
  let r = 0;
  for (let i = 0; i < num.length; i += 7) r = Number(String(r) + num.slice(i, i+7)) % 97;
  return r === 1;
}

const PATTERNS: RulePattern[] = [
  { label:'email_personal',
    regex:/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    confidence:0.99, replacementHint:'EMAIL' },
  { label:'phone_mobile',
    regex:/\b(?:\+31|0031|0)\s?6[\s-]?\d{8}\b/g,
    confidence:0.95, replacementHint:'PHONE' },
  { label:'postcode_huisnummer',
    regex:/\b[1-9][0-9]{3}\s?[A-Z]{2}\s+\d+[A-Z]?\b/g,
    confidence:0.92, replacementHint:'ADDRESS' },
  { label:'partial_postcode',
    regex:/\b[1-9][0-9]{3}\s?[A-Z]{2}\b/g,
    confidence:0.80, replacementHint:'POSTCODE' },
  { label:'iban',
    regex:/\b[A-Z]{2}\d{2}\s?(?:[A-Z0-9]\s?){11,30}\b/gi,
    confidence:0.99, validate:isValidIban, replacementHint:'IBAN' },
  { label:'bsn',
    regex:/\b(?:\d[\s-]?){9}\b/g,
    confidence:0.85, validate:isValidBsn, replacementHint:'ID' },
  { label:'ip_address',
    regex:/\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    confidence:0.80, replacementHint:'IP' },
  { label:'student_number',
    regex:/\b(?:leerlingnummer|studentnummer|lnr|sid)[:\s-]*[A-Z0-9-]{4,}\b/gi,
    confidence:0.95, replacementHint:'STUDENT_ID' },
  { label:'employee_number',
    regex:/\b(?:medewerkernummer|p-nummer|personeelsnummer)[:\s-]*[A-Z0-9-]{3,}\b/gi,
    confidence:0.92, replacementHint:'STAFF_ID' },
  { label:'birthdate_exact',
    regex:/\b(?:geboren op|geboortedatum|dob)[:\s-]*(?:\d{1,2}[-/ ]\d{1,2}[-/ ]\d{2,4}|\d{1,2}\s+(?:januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+\d{4})\b/gi,
    confidence:0.95, replacementHint:'DATE' },
  { label:'class_code',
    regex:/\b(?:groep|klas|leerjaar)\s?[1-8][A-Z]?\b|\b[1-6]\s?(?:havo|vwo|vmbo|mavo|atheneum|gymnasium)[A-Z]?\b/gi,
    confidence:0.78, replacementHint:'CLASS' },
];

export const rulesDetector: PrivacyDetector = {
  id: 'rules',
  purpose: 'direct-pii',
  runtime: 'code',
  language: 'language-agnostic',
  failPolicy: 'fail-closed',
  async detect(input): Promise<DetectorResult> {
    const spans: DetectionSpan[] = [];
    for (const p of PATTERNS) {
      for (const m of input.text.matchAll(p.regex)) {
        if (m.index === undefined) continue;
        if (p.validate && !p.validate(m[0])) continue;
        spans.push({
          start: m.index,
          end: m.index + m[0].length,
          label: p.label,
          source: 'rule',
          severity: DEFAULT_SEVERITY[p.label],
          confidence: p.confidence,
          replacementHint: p.replacementHint,
        });
      }
    }
    return assertDetectorContract({
      detectorId: 'rules',
      detections: spans.sort((a,b) => a.start-b.start || b.end-a.end),
      rubricSignals: [],
      uncertain: false,
      failed: false,
    });
  },
};
```

---

## 18. detectors/specialCategoryLexicon.ts

```ts
import type { PrivacyDetector, DetectorResult, DetectionSpan, PiiLabel } from '../types';
import { DEFAULT_SEVERITY } from '../taxonomy';
import { assertDetectorContract } from './detectorContract';

interface LexiconEntry {
  label: PiiLabel;
  regex: RegExp;
  confidence: number;
  replacementHint?: string;
}

const LEXICON_NL: LexiconEntry[] = [
  { label:'support_need',
    regex:/\b(?:dyslexie|dyscalculie|adhd|autisme|ASS|hoogbegaafd|arrangement|ondersteuningsbehoefte|iep|opp)\b/gi,
    confidence:0.85, replacementHint:'SUPPORT_NEED' },
  { label:'health_condition',
    regex:/\b(?:diabetes|epilepsie|astma|kanker|chemo|operatie|medicatie)\b/gi,
    confidence:0.85, replacementHint:'HEALTH' },
  { label:'mental_health',
    regex:/\b(?:angststoornis|depressie|psycholoog|psychiater|trauma|ptsd|suïcid)\b/gi,
    confidence:0.85, replacementHint:'HEALTH' },
  { label:'safeguarding_signal',
    regex:/\b(?:veilig thuis|meldcode|jeugdzorg|raad voor de kinderbescherming|ondertoezichtstelling|uithuisplaatsing|jeugdbeschermer)\b/gi,
    confidence:0.95, replacementHint:'SAFEGUARDING' },
  { label:'foster_care',
    regex:/\b(?:pleegzorg|pleegouders|gezinshuis)\b/gi,
    confidence:0.95, replacementHint:'CARE' },
  { label:'youth_care_involvement',
    regex:/\b(?:jeugdbescherming|voogd(?:ij)?|gezinsvoogd)\b/gi,
    confidence:0.95, replacementHint:'CARE' },
  { label:'migration_status',
    regex:/\b(?:nieuwkomer|oekraïne|vluchteling|asiel|statushouder|inburgering|ISK|AZC|ongedocumenteerd)\b/gi,
    confidence:0.80, replacementHint:'MIGRATION' },
  { label:'behavioral_incident',
    regex:/\b(?:geschorst|schorsing|incident|vechtpartij|grensoverschrijdend|time-out|verwijdering)\b/gi,
    confidence:0.80, replacementHint:'INCIDENT' },
  { label:'bullying_involvement',
    regex:/\b(?:pesten|gepest|pester|pestincident|pestgedrag)\b/gi,
    confidence:0.85, replacementHint:'INCIDENT' },
  { label:'financial_distress_family',
    regex:/\b(?:schulden|voedselbank|kwijtschelding|armoede|stadspas)\b/gi,
    confidence:0.80, replacementHint:'FINANCIAL' },
];

export const specialCategoryLexiconNl: PrivacyDetector = {
  id: 'special-category-lexicon-nl',
  purpose: 'direct-pii',
  runtime: 'code',
  language: 'nl',
  failPolicy: 'fail-closed',
  async detect(input): Promise<DetectorResult> {
    const spans: DetectionSpan[] = [];
    for (const e of LEXICON_NL) {
      for (const m of input.text.matchAll(e.regex)) {
        if (m.index === undefined) continue;
        spans.push({
          start: m.index,
          end: m.index + m[0].length,
          label: e.label,
          source: 'special_category_lexicon',
          severity: DEFAULT_SEVERITY[e.label],
          confidence: e.confidence,
          replacementHint: e.replacementHint,
        });
      }
    }
    return assertDetectorContract({
      detectorId: 'special-category-lexicon-nl',
      detections: spans,
      rubricSignals: [],
      uncertain: false,
      failed: false,
    });
  },
};
```

---

## 19. detectors/nerSlmDetector.ts

```ts
import type { PrivacyDetector, DetectorResult, DetectionSpan } from '../types';
import { DEFAULT_SEVERITY } from '../taxonomy';
import { assertDetectorContract } from './detectorContract';
import { loadVerifiedModel } from '../modelIntegrity';
import { MODEL_CATALOG } from '../modelCatalog';

interface NerEntity {
  start: number; end: number;
  type: 'PER' | 'ORG' | 'LOC' | 'MISC';
  score: number; surface: string;
}

async function runBrowserNer(modelId: string, text: string): Promise<NerEntity[]> {
  // Implementatie via @huggingface/transformers in de browser.
  // Productie: WebGPU/WASM, geen raw text logging.
  void modelId; void text;
  return [];
}

function nerTypeToLabel(type: NerEntity['type'], surface: string) {
  if (type === 'PER') {
    const parts = surface.trim().split(/\s+/);
    return parts.length >= 2 ? 'full_name' as const : 'first_name_only' as const;
  }
  if (type === 'LOC') return 'place_name_school_context' as const;
  if (type === 'ORG') return 'school_name' as const;
  return null;
}

export const nerSlmNl: PrivacyDetector = {
  id: 'ner-slm-nl',
  purpose: 'direct-pii',
  runtime: 'slm',
  language: 'nl',
  requiresModel: 'ner-nl-v1',
  failPolicy: 'fail-closed',
  async detect(input): Promise<DetectorResult> {
    const spec = MODEL_CATALOG['ner-nl-v1'];
    const gate = await loadVerifiedModel(spec);
    if (!gate.verified) {
      return assertDetectorContract({
        detectorId: 'ner-slm-nl',
        detections: [],
        rubricSignals: [],
        uncertain: true, failed: true, failReason: 'model_not_verified',
      });
    }
    const ents = await runBrowserNer(spec.id, input.text);
    const spans: DetectionSpan[] = [];
    for (const e of ents) {
      const label = nerTypeToLabel(e.type, e.surface);
      if (!label) continue;
      spans.push({
        start: e.start, end: e.end, label,
        source: 'slm_ner',
        severity: DEFAULT_SEVERITY[label],
        confidence: e.score,
        replacementHint: label === 'full_name' ? 'STUDENT' : 'ENTITY',
      });
    }
    return assertDetectorContract({
      detectorId: 'ner-slm-nl',
      detections: spans,
      rubricSignals: [],
      uncertain: ents.some(e => e.score < 0.7),
      failed: false,
    });
  },
};
```

`ner-slm-en` en `ner-slm-multilingual` zijn structureel identiek, met andere `language` en `requiresModel`-waarden.

---

## 20. detectors/contextSlmDetector.ts

```ts
import type {
  PrivacyDetector, DetectorResult, RubricSignal, RubricLabel, RubricLevel,
} from '../types';
import { assertDetectorContract } from './detectorContract';
import { loadVerifiedModel } from '../modelIntegrity';
import { MODEL_CATALOG } from '../modelCatalog';

interface ContextOutput {
  rubrics: Array<{
    label: RubricLabel; level: RubricLevel;
    confidence: number; spans: Array<{ start: number; end: number }>;
  }>;
  uncertain: boolean;
}

async function runBrowserContext(modelId: string, text: string): Promise<ContextOutput> {
  void modelId; void text;
  return { rubrics: [], uncertain: false };
}

export const contextSlmNlEducation: PrivacyDetector = {
  id: 'context-slm-nl-education',
  purpose: 'rubric',
  runtime: 'slm',
  language: 'nl',
  requiresModel: 'context-nl-education-v2',
  failPolicy: 'fail-closed',
  async detect(input): Promise<DetectorResult> {
    const spec = MODEL_CATALOG['context-nl-education-v2'];
    const gate = await loadVerifiedModel(spec);
    if (!gate.verified) {
      return assertDetectorContract({
        detectorId: 'context-slm-nl-education',
        detections: [], rubricSignals: [],
        uncertain: true, failed: true, failReason: 'model_not_verified',
      });
    }
    const out = await runBrowserContext(spec.id, input.text);
    const rubricSignals: RubricSignal[] = out.rubrics.map(r => ({
      label: r.label, level: r.level,
      confidence: r.confidence, evidenceSpans: r.spans,
    }));
    return assertDetectorContract({
      detectorId: 'context-slm-nl-education',
      detections: [],
      rubricSignals,
      uncertain: out.uncertain,
      failed: false,
    });
  },
};
```

`context-slm-nl-healthcare` is structureel identiek met een ander `requiresModel`.

---

## 21. detectors/rewriteLlmDetector.ts

```ts
import type { PrivacyDetector, DetectorResult } from '../types';
import { assertDetectorContract } from './detectorContract';
import { loadVerifiedModel } from '../modelIntegrity';
import { MODEL_CATALOG } from '../modelCatalog';

async function runBrowserLlmRewrite(modelId: string, text: string): Promise<string | null> {
  void modelId; void text;
  return null;
}

export const rewriteLlmNlSmall: PrivacyDetector = {
  id: 'rewrite-llm-nl-small',
  purpose: 'rewrite',
  runtime: 'llm',
  language: 'nl',
  requiresModel: 'rewrite-nl-small-v1',
  failPolicy: 'fail-open-with-warning',
  async detect(input): Promise<DetectorResult> {
    const spec = MODEL_CATALOG['rewrite-nl-small-v1'];
    const gate = await loadVerifiedModel(spec);
    if (!gate.verified) {
      return assertDetectorContract({
        detectorId: 'rewrite-llm-nl-small',
        detections: [], rubricSignals: [],
        uncertain: true, failed: true, failReason: 'model_not_verified',
      });
    }
    const text = await runBrowserLlmRewrite(spec.id, input.text);
    if (!text) {
      return assertDetectorContract({
        detectorId: 'rewrite-llm-nl-small',
        detections: [], rubricSignals: [],
        uncertain: true, failed: true, failReason: 'rewrite_returned_empty',
      });
    }
    return assertDetectorContract({
      detectorId: 'rewrite-llm-nl-small',
      detections: [], rubricSignals: [],
      rewrittenText: text,
      uncertain: false, failed: false,
    });
  },
};
```

Productieregels voor rewrite:

```txt
- Alleen geschoonde tekst (post-anonymize, post-generalization) naar LLM.
- Geen raw input richting LLM.
- Geen mapping toegankelijk vanuit LLM-context.
- Geen externe call: lokale inference in de browser.
- Output altijd opnieuw door Draft Check Guard.
- failPolicy = 'fail-open-with-warning'; bij falen valt orchestrator
  terug op repairAnonymousDraft.
```

---

## 22. detectorRegistry.ts

```ts
import type { PrivacyDetector } from './types';
import { rulesDetector } from './detectors/rulesDetector';
import { specialCategoryLexiconNl } from './detectors/specialCategoryLexicon';
import { nerSlmNl } from './detectors/nerSlmDetector';
import { contextSlmNlEducation } from './detectors/contextSlmDetector';
import { rewriteLlmNlSmall } from './detectors/rewriteLlmDetector';

/**
 * Statisch register van detector-instanties. Geen dynamic loading.
 * Pipeline kiest welke instanties actief zijn via PipelineProfile.
 */
export const DETECTOR_INSTANCES: Readonly<Record<string, PrivacyDetector>> = {
  'rules': rulesDetector,
  'special-category-lexicon-nl': specialCategoryLexiconNl,
  'ner-slm-nl': nerSlmNl,
  'context-slm-nl-education': contextSlmNlEducation,
  'rewrite-llm-nl-small': rewriteLlmNlSmall,
  // Verdere instanties (ner-slm-en, context-slm-nl-healthcare, etc.) worden
  // toegevoegd zodra hun implementaties en modelhashes vrij zijn.
};
```

---

## 23. mergeDetections.ts

Severity-aware merging. Bij overlap wint de detection met hogere severity, daarna hogere confidence, daarna grotere span.

```ts
import type { DetectionSpan, Severity } from './types';

const SEVERITY_RANK: Record<Severity, number> = {
  low: 0, medium: 1, high: 2, critical: 3,
};

function overlaps(a: DetectionSpan, b: DetectionSpan): boolean {
  return a.start < b.end && b.start < a.end;
}

function shouldReplace(c: DetectionSpan, e: DetectionSpan): boolean {
  if (SEVERITY_RANK[c.severity] !== SEVERITY_RANK[e.severity]) {
    return SEVERITY_RANK[c.severity] > SEVERITY_RANK[e.severity];
  }
  if (c.confidence !== e.confidence) return c.confidence > e.confidence;
  return (c.end - c.start) > (e.end - e.start);
}

export function mergeDetections(spans: DetectionSpan[]): DetectionSpan[] {
  const sorted = [...spans].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    if (a.end !== b.end) return b.end - a.end;
    if (SEVERITY_RANK[b.severity] !== SEVERITY_RANK[a.severity]) {
      return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    }
    return b.confidence - a.confidence;
  });

  const merged: DetectionSpan[] = [];
  for (const s of sorted) {
    const x = merged.find(m => overlaps(m, s));
    if (!x) { merged.push(s); continue; }
    if (shouldReplace(s, x)) {
      merged[merged.indexOf(x)] = s;
    }
  }
  return merged.sort((a, b) => a.start - b.start);
}
```

---

## 24. risk.ts

Risicoberekening, rubric-aware en profiel-bewust.

```ts
import {
  PRIVACY_THRESHOLDS, RUBRIC_BOOSTS, INTERACTION_BOOSTS,
} from './privacy.config';
import type {
  DetectionSpan, PrivacySignals, RiskLevel, RubricSignal, Severity,
} from './types';

const SEVERITY_BASE: Record<Severity, number> = {
  low: 0.02, medium: 0.06, high: 0.12, critical: 0.25,
};

const SPECIAL_CATEGORY_LABELS = new Set([
  'health_condition','disability','mental_health',
  'religion','ethnicity','sexual_orientation','gender_identity',
  'political_opinion','union_membership',
  'biometric_reference','genetic_reference',
  'support_need','youth_care_involvement','foster_care','safeguarding_signal',
  'migration_status','financial_distress_family','behavioral_incident',
  'bullying_involvement',
]);

export function calculateRiskScore(params: {
  detections: DetectionSpan[];
  signals: PrivacySignals;
  slmUncertain?: boolean;
}): number {
  const { detections, signals, slmUncertain } = params;
  let score = 0;

  // 1. Basis: aantal detecties (gedempt).
  score += Math.min(0.30, detections.length * 0.03);

  // 2. Severity-bijdrage per detectie.
  for (const d of detections) {
    score += SEVERITY_BASE[d.severity] ?? 0;
    if (SPECIAL_CATEGORY_LABELS.has(d.label)) {
      score += PRIVACY_THRESHOLDS.specialCategoryRiskBoost;
    }
    if (d.confidence > 0.9 && d.severity !== 'low') score += 0.03;
  }

  // 3. Rubric-bijdragen.
  for (const sig of signals.rubric.signals) {
    score += rubricContribution(sig);
  }

  // 4. Interactie-effecten.
  const f = signals.rubric.interactionFlags;
  if (f.smallGroupWithSpecialCategory) score += INTERACTION_BOOSTS.smallGroupWithSpecialCategory;
  if (f.uniqueRoleWithParentalRole)    score += INTERACTION_BOOSTS.uniqueRoleWithParentalRole;
  if (f.safeguardingWithExport)        score += INTERACTION_BOOSTS.safeguardingWithExport;
  if (f.behavioralWithTemporal)        score += INTERACTION_BOOSTS.behavioralWithTemporal;

  // 5. SLM-onzekerheid.
  if (slmUncertain) score += PRIVACY_THRESHOLDS.slmUncertaintyRiskBoost;

  // 6. Rules-only-mode opslag.
  if (signals.pipelineState.rulesOnlyMode) {
    score += PRIVACY_THRESHOLDS.rulesOnlyRiskBoost;
  }

  // 7. Outputstate-clamps.
  if (signals.outputState.containsRawPersonalData) score = Math.max(score, 0.8);
  if (signals.outputState.containsMapping)         score = 1;

  return Math.max(0, Math.min(1, score));
}

function rubricContribution(sig: RubricSignal): number {
  const t = RUBRIC_BOOSTS[sig.label];
  if (!t) return 0;
  return (t[sig.level] ?? 0) * Math.max(0.7, Math.min(1, sig.confidence));
}

export function toRiskLevel(score: number): RiskLevel {
  if (score >= PRIVACY_THRESHOLDS.blockRisk) return 'blocked';
  if (score >= PRIVACY_THRESHOLDS.reviewRequiredRisk) return 'high';
  if (score >= PRIVACY_THRESHOLDS.anonymousExportMaxRisk) return 'medium';
  return 'low';
}

export function deriveInteractionFlags(params: {
  rubricSignals: RubricSignal[];
  hasSpecialCategory: boolean;
  hasParentalRole: boolean;
  intendedAction: string;
}): PrivacySignals['rubric']['interactionFlags'] {
  const order = { low: 0, medium: 1, high: 2 };
  const has = (label: string, min: 'low'|'medium'|'high' = 'low') =>
    params.rubricSignals.some(s => s.label === label && order[s.level] >= order[min]);

  return {
    smallGroupWithSpecialCategory: has('small_group_risk') && params.hasSpecialCategory,
    uniqueRoleWithParentalRole:    has('unique_role_risk') && params.hasParentalRole,
    safeguardingWithExport: has('safeguarding_context') &&
      ['export_file','send_external_ai','share','print'].includes(params.intendedAction),
    behavioralWithTemporal: has('behavioral_specificity') && has('temporal_specificity', 'medium'),
  };
}
```

---

## 25. modelIntegrity.ts

```ts
import type { ModelCatalogEntry } from './types';

export interface ModelGateResult {
  verified: boolean;
  modelId: string;
  modelVersion: string;
  reason?: string;
}

async function fetchModelBlob(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, { credentials: 'omit', cache: 'force-cache' });
  if (!res.ok) throw new Error(`fetch_failed:${res.status}`);
  return res.arrayBuffer();
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getCachedBlob(modelId: string): Promise<ArrayBuffer | null> {
  // Productie: IndexedDB-lookup. Stub voor specificatie.
  void modelId; return null;
}

async function cacheVerifiedBlob(modelId: string, blob: ArrayBuffer): Promise<void> {
  void modelId; void blob;
}

export async function loadVerifiedModel(spec: ModelCatalogEntry): Promise<ModelGateResult> {
  if (spec.expectedSha256.startsWith('REPLACE_')) {
    return { verified: false, modelId: spec.id, modelVersion: spec.version, reason: 'unpinned_hash' };
  }
  try {
    const cached = await getCachedBlob(spec.id);
    const blob = cached ?? await fetchModelBlob(spec.url);
    const computed = await sha256Hex(blob);
    if (computed !== spec.expectedSha256) {
      return { verified: false, modelId: spec.id, modelVersion: spec.version, reason: 'hash_mismatch' };
    }
    if (!cached) await cacheVerifiedBlob(spec.id, blob);
    return { verified: true, modelId: spec.id, modelVersion: spec.version };
  } catch (e) {
    return { verified: false, modelId: spec.id, modelVersion: spec.version, reason: 'fetch_or_hash_error' };
  }
}
```

---

## 26. secureMapping.ts

```ts
import type { MappingEntry, MappingHandle } from './types';

const memoryStore = new Map<string, MappingEntry[]>();

function makeId(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
}

export function createMappingHandle(entries: MappingEntry[]): MappingHandle {
  const id = makeId();
  memoryStore.set(id, entries);
  return { id, mode: 'memory_only' };
}

export async function persistMappingEncrypted(
  handle: MappingHandle, passphrase: string,
): Promise<MappingHandle> {
  const entries = memoryStore.get(handle.id);
  if (!entries) throw new Error('mapping_not_found');

  // AES-GCM met PBKDF2-derived sleutel.
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200_000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
  );
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(entries))
  );

  // Productie: opslaan in IndexedDB met salt + iv + ciphertext, niet in localStorage.
  void cipher;
  return { id: handle.id, mode: 'encrypted_local' };
}

export function readMapping(handle: MappingHandle): MappingEntry[] | undefined {
  return memoryStore.get(handle.id);
}

export function clearMapping(handle: MappingHandle): void {
  memoryStore.delete(handle.id);
}
```

Productieregels:

```txt
Mapping wordt nooit in plaintext opgeslagen.
Mapping wordt nooit in localStorage of sessionStorage geplaatst.
Mapping verlaat de browser nooit.
Een MappingHandle mag in React state, een MappingEntry[] niet.
```

---

## 27. pseudonymize.ts

```ts
import type { DetectionSpan, MappingEntry, MappingHandle } from './types';
import { createMappingHandle } from './secureMapping';

const TOKEN_LABEL_MAP: Record<string, string> = {
  bsn:'ID', iban:'IBAN', passport_number:'ID',
  digid_id:'ID', national_id_other:'ID',
  full_name:'STUDENT', email_personal:'EMAIL', phone_mobile:'PHONE',
  address_full:'ADDRESS', postcode_huisnummer:'ADDRESS',
  birthdate_exact:'DATE', student_number:'STUDENT_ID',
  employee_number:'STAFF_ID', username_handle:'USERNAME',
  url_personal_id:'URL', photo_face_reference:'PHOTO_REF',
  first_name_only:'STUDENT', last_name_only:'STUDENT',
  partial_postcode:'POSTCODE', birthdate_partial:'DATE',
  school_name:'SCHOOL', class_code:'CLASS',
  place_name_school_context:'LOCATION',
  ip_address:'IP', device_id:'DEVICE', email_role:'EMAIL',
};

export function pseudonymizeText(
  text: string, detections: DetectionSpan[],
): { draft: string; mappingHandle: MappingHandle; expectedTokens: string[] } {
  const sorted = [...detections].sort((a, b) => a.start - b.start);
  const counters = new Map<string, number>();
  const mapping: MappingEntry[] = [];
  const expectedTokens: string[] = [];
  let cursor = 0;
  let output = '';

  for (const d of sorted) {
    if (d.start < cursor) continue;
    const original = text.slice(d.start, d.end);
    const prefix = TOKEN_LABEL_MAP[d.label] ?? d.replacementHint ?? 'ENTITY';
    const next = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, next);
    const token = `${prefix}_${String(next).padStart(3, '0')}`;
    output += text.slice(cursor, d.start);
    output += token;
    cursor = d.end;
    expectedTokens.push(token);
    mapping.push({ token, original, piiType: d.label });
  }
  output += text.slice(cursor);
  return { draft: output, mappingHandle: createMappingHandle(mapping), expectedTokens };
}
```

---

## 28. anonymize.ts

```ts
import type { DetectionSpan } from './types';

const GENERALIZATION_MAP: Record<string, string> = {
  full_name:'een persoon', first_name_only:'een persoon', last_name_only:'een persoon',
  email_personal:'een contactgegeven', email_role:'een contactgegeven',
  phone_mobile:'een contactgegeven',
  address_full:'een adresgegeven', postcode_huisnummer:'een adresgegeven',
  partial_postcode:'een regio',
  student_number:'een leerlingnummer', employee_number:'een medewerkerkenmerk',
  bsn:'een identificatiegegeven', passport_number:'een identificatiegegeven',
  digid_id:'een identificatiegegeven', national_id_other:'een identificatiegegeven',
  iban:'een betalingsgegeven',
  ip_address:'een technisch identificatiegegeven', device_id:'een apparaatkenmerk',
  url_personal_id:'een persoonlijke link', username_handle:'een gebruikersnaam',
  birthdate_exact:'een geboortedatum', birthdate_partial:'een periode',
  school_name:'een instelling', class_code:'een groepsaanduiding',
  place_name_school_context:'een plaats', photo_face_reference:'een afbeelding',
  health_condition:'een gezondheidscontext', disability:'een ondersteuningsbehoefte',
  mental_health:'een gezondheidscontext', religion:'een levensbeschouwing',
  ethnicity:'een achtergrond',
  sexual_orientation:'een persoonlijk kenmerk', gender_identity:'een persoonlijk kenmerk',
  political_opinion:'een persoonlijke opvatting', union_membership:'een persoonlijk kenmerk',
  biometric_reference:'een persoonlijk kenmerk', genetic_reference:'een persoonlijk kenmerk',
  support_need:'een ondersteuningsbehoefte',
  youth_care_involvement:'een ondersteuningstraject',
  foster_care:'een ondersteuningstraject',
  safeguarding_signal:'een beschermingscontext',
  migration_status:'een achtergrondcontext',
  home_language_minority:'een taalachtergrond',
  financial_distress_family:'een thuissituatie',
  behavioral_incident:'een incident', attendance_concern:'een aanwezigheidspatroon',
  academic_underperformance:'een leerontwikkeling',
  bullying_involvement:'een sociaal incident',
  age_exact:'een leeftijdsindicatie', grade_level:'een onderwijsniveau',
  school_type:'een onderwijssoort', region_municipality:'een regio',
  nationality:'een achtergrond',
  parental_role:'een ouder of verzorger', staff_role_unique:'een medewerker',
  sibling_reference:'een familielid',
};

export function anonymizeText(text: string, detections: DetectionSpan[]): string {
  const sorted = [...detections].sort((a, b) => a.start - b.start);
  let cursor = 0;
  let output = '';
  for (const d of sorted) {
    if (d.start < cursor) continue;
    output += text.slice(cursor, d.start);
    output += GENERALIZATION_MAP[d.label] ?? 'een algemeen kenmerk';
    cursor = d.end;
  }
  output += text.slice(cursor);
  return output;
}
```

---

## 29. contextualGeneralization.ts

```ts
import type { PrivacySignals } from './types';

export function applyContextualGeneralization(text: string, signals: PrivacySignals): string {
  let output = text;
  const order = { low: 0, medium: 1, high: 2 };
  const has = (label: string, min: 'low'|'medium'|'high' = 'low') =>
    signals.rubric.signals.some(s => s.label === label && order[s.level] >= order[min]);

  if (has('small_group_risk')) {
    output = output.replace(/\b(?:groep|klas)\s?[1-8][A-Z]?\b/gi, 'een groep');
    output = output.replace(/\b[1-6]\s?(?:havo|vwo|vmbo|mavo)[A-Z]?\b/gi, 'een onderwijsniveau');
  }
  if (has('temporal_specificity', 'high')) {
    output = output.replace(
      /\b(?:gisteren|vandaag|vorige week|afgelopen \w+)\b/gi,
      'in een recente periode',
    );
  }
  if (has('location_specificity', 'high')) {
    output = output.replace(/\bin\s+[A-Z][a-z]+\b/g, 'in een regio');
  }
  const sensitive =
    has('safeguarding_context') ||
    signals.specialCategories.safeguarding_signal === true ||
    signals.specialCategories.health_condition === true ||
    signals.specialCategories.mental_health === true;
  if (sensitive) {
    output = output.replace(/\b(?:hij|zij|hem|haar)\b/gi, 'de persoon');
  }
  return output;
}
```

---

## 30. draftCheckGuard.ts

De Draft Check Guard controleert na anonymize/pseudonymize of de draft veilig is. Failure levert `draft_blocked` of `draft_repair_needed`.

```ts
import type { DraftStatus, PrivacyMode } from './types';

const TOKEN_PATTERN = /\b(?:STUDENT|TEACHER|PARENT|SCHOOL|CLASS|LOCATION|DATE|SUPPORT_NEED|INCIDENT|ROLE|EMAIL|PHONE|ADDRESS|POSTCODE|STUDENT_ID|STAFF_ID|ID|IBAN|IP|DEVICE|URL|USERNAME|PHOTO_REF)_\d{3}\b/;

const RAW_BSN = /\b(?:\d[\s-]?){9}\b/;
const RAW_IBAN = /\b[A-Z]{2}\d{2}\s?(?:[A-Z0-9]\s?){11,30}\b/;
const RAW_EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const RAW_PHONE_NL = /\b(?:\+31|0031|0)\s?6[\s-]?\d{8}\b/;

export function runDraftCheckGuard(params: {
  draft: string;
  mode: PrivacyMode;
  expectedTokens: string[];
  riskScore: number;
}): { status: DraftStatus; reason?: string } {
  const { draft, mode, expectedTokens, riskScore } = params;

  if (RAW_BSN.test(draft)) return { status: 'draft_blocked', reason: 'raw_bsn_in_draft' };
  if (RAW_IBAN.test(draft)) return { status: 'draft_blocked', reason: 'raw_iban_in_draft' };
  if (RAW_EMAIL.test(draft)) return { status: 'draft_blocked', reason: 'raw_email_in_draft' };
  if (RAW_PHONE_NL.test(draft)) return { status: 'draft_blocked', reason: 'raw_phone_in_draft' };

  const tokensInDraft = Array.from(draft.matchAll(new RegExp(TOKEN_PATTERN, 'g'))).map(m => m[0]);

  if (mode === 'anonymous') {
    if (tokensInDraft.length > 0) {
      return { status: 'draft_blocked', reason: 'pseudonym_token_in_anonymous_draft' };
    }
    if (riskScore >= 0.7) {
      return { status: 'draft_repair_needed', reason: 'risk_too_high_for_anonymous_draft' };
    }
    return { status: 'draft_certified_anonymous' };
  }

  // pseudonymous
  const expected = new Set(expectedTokens);
  for (const t of tokensInDraft) {
    if (!expected.has(t)) {
      return { status: 'draft_blocked', reason: 'unexpected_token_in_pseudonymous_draft' };
    }
  }
  return { status: 'draft_certified_pseudonymous' };
}
```

Productieregel:

```txt
Een tekst zonder gecertificeerde DraftStatus mag niet door PIM worden geaccepteerd.
```

---

## 31. repairAnonymousDraft.ts

Fallback wanneer anonieme rewrite niet beschikbaar is of te risicovol blijft. Niet bedoeld als hoofdroute; alleen als veilige terugval.

```ts
import { applyContextualGeneralization } from './contextualGeneralization';
import type { PrivacySignals } from './types';

export function repairAnonymousDraft(draft: string, signals: PrivacySignals): string {
  let out = applyContextualGeneralization(draft, signals);

  // Vervang resterende verdachte patronen door brede generaliseringen.
  out = out.replace(/\b\d{1,2}\s?(?:januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\b/gi, 'een periode');
  out = out.replace(/\bin\s+[A-Z][a-z]{2,}\b/g, 'in een regio');

  return out;
}
```

---

## 32. pimPolicy.ts

De deterministische beslissingsmachine.

```ts
import { PRIVACY_POLICY_VERSION, PRIVACY_THRESHOLDS, HARD_REVIEW_LABELS } from './privacy.config';
import type {
  DraftStatus, GuardResult, IntendedAction, PimDecision,
  PrivacyMode, PrivacySignals,
} from './types';

export interface PimInput {
  mode: PrivacyMode;
  action: IntendedAction;
  draftStatus: DraftStatus;
  guardResults: GuardResult[];
  signals: PrivacySignals;
  modelIntegrityPassed: boolean;
  profileId: string;
  policyVersion?: string;
}

function decision(p: {
  value: PimDecision['decision']; mode: PrivacyMode; action: IntendedAction;
  ruleId: string; reasonCode: string; severity: PimDecision['severity'];
  profileId: string;
}): PimDecision {
  return {
    decision: p.value, mode: p.mode, action: p.action,
    ruleId: p.ruleId, reasonCode: p.reasonCode, severity: p.severity,
    policyVersion: PRIVACY_POLICY_VERSION,
    profileId: p.profileId,
    timestamp: new Date().toISOString(),
  };
}

export function evaluatePim(input: PimInput): PimDecision {
  const { mode, action, draftStatus, guardResults, signals, modelIntegrityPassed, profileId } = input;
  const D = (rest: Partial<Parameters<typeof decision>[0]>) =>
    decision({ mode, action, profileId, value: rest.value!, ruleId: rest.ruleId!, reasonCode: rest.reasonCode!, severity: rest.severity! });

  // 1. Debug logging is altijd block.
  if (action === 'debug_log') {
    return D({ value:'block', ruleId:'PIM_DEBUG_LOG_BLOCK', reasonCode:'content_debug_logging_forbidden', severity:'critical' });
  }

  // 2. Modelintegriteit (behalve display).
  if (!modelIntegrityPassed && action !== 'display') {
    return D({ value:'block', ruleId:'PIM_MODEL_INTEGRITY_BLOCK', reasonCode:'model_integrity_not_verified', severity:'critical' });
  }

  // 3. Falende guards.
  if (guardResults.some(r => !r.passed)) {
    return D({ value:'block', ruleId:'PIM_GUARD_FAILURE_BLOCK', reasonCode:'guard_result_failed', severity:'critical' });
  }

  // 4. Mapping aanwezig in output of mappingState onveilig.
  if (signals.outputState.containsMapping || signals.mappingState === 'unsafe_present') {
    return D({ value:'block', ruleId:'PIM_MAPPING_BLOCK', reasonCode:'mapping_present_or_exposed', severity:'critical' });
  }

  // 5. Ruwe persoonsgegevens in output.
  if (signals.outputState.containsRawPersonalData) {
    return D({ value:'block', ruleId:'PIM_RAW_PII_BLOCK', reasonCode:'raw_personal_data_detected', severity:'critical' });
  }

  // 6. Draft niet gecertificeerd.
  if (draftStatus === 'draft_unchecked' || draftStatus === 'draft_repair_needed' || draftStatus === 'draft_blocked') {
    return D({ value:'block', ruleId:'PIM_DRAFT_NOT_CERTIFIED', reasonCode:'draft_not_certified', severity:'critical' });
  }

  // 7. Modus-status mismatch.
  if (mode === 'anonymous' && draftStatus !== 'draft_certified_anonymous') {
    return D({ value:'block', ruleId:'PIM_MODE_STATUS_MISMATCH', reasonCode:'anonymous_mode_requires_anonymous_certification', severity:'critical' });
  }
  if (mode === 'pseudonymous' && draftStatus !== 'draft_certified_pseudonymous') {
    return D({ value:'block', ruleId:'PIM_MODE_STATUS_MISMATCH', reasonCode:'pseudonymous_mode_requires_pseudonymous_certification', severity:'critical' });
  }

  // 8. Pseudoniem: harde regels.
  if (mode === 'pseudonymous') {
    if (action === 'send_external_ai') {
      return D({ value:'block', ruleId:'PIM_PSEUDONYM_EXTERNAL_AI_BLOCK', reasonCode:'pseudonymous_external_ai_forbidden', severity:'critical' });
    }
    if (action === 'export_file' || action === 'copy' || action === 'print' || action === 'share') {
      return D({ value:'block', ruleId:'PIM_PSEUDONYM_EGRESS_BLOCK', reasonCode:'pseudonymous_egress_forbidden', severity:'critical' });
    }
    if (action === 'save_local') {
      if (signals.mappingState !== 'encrypted_local') {
        return D({ value:'block', ruleId:'PIM_PSEUDONYM_SAVE_REQUIRES_ENCRYPTION', reasonCode:'encrypted_local_mapping_required', severity:'critical' });
      }
      return D({ value:'allow_with_warning', ruleId:'PIM_PSEUDONYM_SAVE_LOCAL_ONLY', reasonCode:'encrypted_local_save_only', severity:'warning' });
    }
    if (action === 'display' || action === 'restore') {
      return D({ value:'allow_with_warning', ruleId:'PIM_PSEUDONYM_LOCAL_ALLOW', reasonCode:'local_pseudonymous_action_only', severity:'warning' });
    }
  }

  // 9. Anoniem.
  if (mode === 'anonymous') {
    if (signals.outputState.containsPseudonymTokens) {
      return D({ value:'block', ruleId:'PIM_TOKEN_IN_ANONYMOUS_BLOCK', reasonCode:'pseudonym_token_in_anonymous_output', severity:'critical' });
    }
    if (action === 'restore') {
      return D({ value:'block', ruleId:'PIM_ANONYMOUS_RESTORE_BLOCK', reasonCode:'anonymous_mode_has_no_mapping', severity:'critical' });
    }

    const isEgress = ['send_external_ai','export_file','copy','print','share'].includes(action);

    // Hard-review labels in egress = altijd block.
    if (isEgress) {
      const hasHardLabel = (HARD_REVIEW_LABELS as readonly string[]).some(
        l => (signals.specialCategories as Record<string, boolean | undefined>)[l] === true
      );
      if (hasHardLabel) {
        return D({ value:'block', ruleId:'PIM_HARD_REVIEW_EGRESS_BLOCK', reasonCode:'hard_review_label_blocks_egress', severity:'critical' });
      }
    }

    // Drempelregels — strenger in rules-only mode.
    const ro = signals.pipelineState.rulesOnlyMode;
    const exportMax = ro ? PRIVACY_THRESHOLDS.rulesOnlyAnonymousExportMaxRisk : PRIVACY_THRESHOLDS.anonymousExportMaxRisk;
    const aiMax = ro ? PRIVACY_THRESHOLDS.rulesOnlyAnonymousExternalAiMaxRisk : PRIVACY_THRESHOLDS.anonymousExternalAiMaxRisk;
    const copyMax = PRIVACY_THRESHOLDS.anonymousCopyMaxRisk;

    if (action === 'send_external_ai' && signals.outputState.riskScore > aiMax) {
      return D({ value:'block', ruleId:'PIM_EXTERNAL_AI_RISK_BLOCK', reasonCode:'anonymous_external_ai_risk_too_high', severity:'critical' });
    }
    if (action === 'export_file' && signals.outputState.riskScore > exportMax) {
      return D({ value:'block', ruleId:'PIM_EXPORT_RISK_BLOCK', reasonCode:'anonymous_export_risk_too_high', severity:'critical' });
    }
    if ((action === 'copy' || action === 'print' || action === 'share') &&
        signals.outputState.riskScore > copyMax) {
      return D({ value:'block', ruleId:'PIM_COPY_SHARE_RISK_BLOCK', reasonCode:'anonymous_copy_share_risk_too_high', severity:'critical' });
    }

    // Safeguarding-context lokaal = warning, egress = block (al gedekt door interactionFlags+threshold).
    if (signals.rubric.interactionFlags.safeguardingWithExport) {
      return D({ value:'block', ruleId:'PIM_SAFEGUARDING_EGRESS_BLOCK', reasonCode:'safeguarding_with_export_blocked', severity:'critical' });
    }

    // Rules-only: warning bij elke egress.
    if (ro && isEgress) {
      return D({ value:'allow_with_warning', ruleId:'PIM_RULES_ONLY_EGRESS_WARNING', reasonCode:'rules_only_pipeline_limited_detection', severity:'warning' });
    }

    return D({ value:'allow', ruleId:'PIM_ANONYMOUS_ALLOW', reasonCode:'anonymous_action_allowed', severity:'info' });
  }

  // Default: block.
  return D({ value:'block', ruleId:'PIM_DEFAULT_BLOCK', reasonCode:'no_allow_rule_matched', severity:'critical' });
}
```

Productieregel:

```txt
Geen PIM-besluit = block.
PIM-error = block.
PIM-timeout = block.
PIM-onbekende action = block.
PIM-onbekende mode = block.
```

---

## 33. productionEgressGuard.ts

```ts
import type { PimDecision } from './types';

export interface EgressAttempt {
  channel: 'fetch' | 'xhr' | 'beacon' | 'websocket' | 'clipboard' | 'export' | 'print' | 'share';
  payloadKind: 'draft' | 'mapping' | 'raw_input' | 'restored' | 'unknown';
  decision: PimDecision;
}

export class EgressBlockedError extends Error {
  constructor(public readonly attempt: EgressAttempt) {
    super(`egress_blocked:${attempt.decision.reasonCode}`);
    this.name = 'EgressBlockedError';
  }
}

export function enforcePimDecision(attempt: EgressAttempt): void {
  if (attempt.decision.decision === 'block') throw new EgressBlockedError(attempt);
  if (attempt.payloadKind === 'mapping') throw new EgressBlockedError(attempt);
  if (attempt.payloadKind === 'raw_input') throw new EgressBlockedError(attempt);
}
```

Productieregel:

```txt
Egress Guard beslist niets zelf. Hij handhaaft.
Een PimDecision met value=block leidt altijd tot een geblokkeerde egress.
Een payload met kind=mapping of raw_input wordt onafhankelijk van het besluit geblokkeerd.
```

---

## 34. restoreGuard.ts

```ts
import type { PimDecision } from './types';

export function canRestore(decision: PimDecision): boolean {
  if (decision.action !== 'restore') return false;
  if (decision.mode !== 'pseudonymous') return false;
  if (decision.decision === 'block') return false;
  return true;
}

export function blockExportOfRestoredText(): never {
  throw new Error('restored_text_must_be_re_anonymized_before_export');
}
```

Productieregel:

```txt
Herstelde tekst is opnieuw ruw. Voor export of externe AI moet die tekst
opnieuw door de hele pipeline.
```

---

## 35. processText.ts — orchestratie

De orchestratielaag bindt alles samen: profiel-validatie, detector-volgorde, signals opbouwen, risk berekenen, draft maken, draft check.

```ts
import type {
  PrivacyMode, IntendedAction, ProcessResult, PrivacySignals,
  DetectorResult, DetectionSpan, RubricSignal, PipelineProfile,
} from './types';
import { DETECTOR_INSTANCES } from './detectorRegistry';
import { DETECTOR_CATALOG, validateProfile, isRulesOnly } from './pipelineProfile';
import { mergeDetections } from './mergeDetections';
import { calculateRiskScore, toRiskLevel, deriveInteractionFlags } from './risk';
import { anonymizeText } from './anonymize';
import { pseudonymizeText } from './pseudonymize';
import { applyContextualGeneralization } from './contextualGeneralization';
import { runDraftCheckGuard } from './draftCheckGuard';
import { repairAnonymousDraft } from './repairAnonymousDraft';
import { PRIVACY_POLICY_VERSION } from './privacy.config';
import {
  isDirectPiiLabel, isSpecialCategoryLabel, isQuasiIdentifierLabel,
  deriveRareCombinationLevel,
} from './taxonomy';

function buildBaseSignals(mode: PrivacyMode, profile: PipelineProfile): PrivacySignals {
  return {
    directPii: {},
    specialCategories: {},
    quasiIdentifiers: {},
    rubric: {
      signals: [], quasiIdentifierCount: 0,
      interactionFlags: {
        smallGroupWithSpecialCategory: false,
        uniqueRoleWithParentalRole: false,
        safeguardingWithExport: false,
        behavioralWithTemporal: false,
      },
    },
    outputState: {
      containsRawPersonalData: false,
      containsPseudonymTokens: false,
      containsMapping: false,
      anonymizationMode: mode,
      riskScore: 0,
      riskLevel: 'low',
    },
    modelState: { nerVerified: false, contextVerified: false, rewriteVerified: false },
    pipelineState: {
      profileId: profile.id,
      rulesOnlyMode: isRulesOnly(profile),
      activeDetectorIds: [...profile.activeDetectorIds],
    },
    mappingState: 'none',
  };
}

async function runDetector(detectorId: string, input: any): Promise<DetectorResult> {
  const det = DETECTOR_INSTANCES[detectorId];
  if (!det) {
    return { detectorId, detections: [], rubricSignals: [], uncertain: true,
             failed: true, failReason: 'detector_instance_missing' };
  }
  try {
    return await det.detect(input);
  } catch {
    return { detectorId, detections: [], rubricSignals: [], uncertain: true,
             failed: true, failReason: 'detector_threw' };
  }
}

export async function processText(params: {
  rawText: string;
  mode: PrivacyMode;
  intendedAction: IntendedAction;
  profile: PipelineProfile;
}): Promise<ProcessResult> {
  const { rawText, mode, intendedAction, profile } = params;

  if (!rawText.trim()) throw new Error('input_empty');

  const validation = validateProfile(profile);
  if (!validation.valid) throw new Error(`invalid_profile:${validation.reason}`);

  const signals = buildBaseSignals(mode, profile);
  const allDetections: DetectionSpan[] = [];
  const allRubricSignals: RubricSignal[] = [];
  let slmUncertain = false;

  // Bepaal detector-volgorde: code eerst, dan slm, dan llm.
  const ordered = [...profile.activeDetectorIds].sort((a, b) => {
    const order = { code: 0, slm: 1, llm: 2 } as const;
    return order[DETECTOR_CATALOG[a].runtime] - order[DETECTOR_CATALOG[b].runtime];
  });

  // Eerst alle direct-pii- en rubric-detectoren; rewrite gebeurt later.
  for (const id of ordered) {
    const cat = DETECTOR_CATALOG[id];
    if (cat.purpose === 'rewrite') continue;

    const det = DETECTOR_INSTANCES[id];
    if (!det) continue;

    const result = await runDetector(id, {
      text: rawText, mode, intendedAction,
      language: cat.language,
      priorDetections: allDetections,
    });

    if (result.failed && det.failPolicy === 'fail-closed') {
      slmUncertain = true;
      if (cat.purpose === 'direct-pii' && cat.runtime === 'slm') signals.modelState.nerVerified = false;
      if (cat.purpose === 'rubric') signals.modelState.contextVerified = false;
      continue;
    }
    if (result.uncertain) slmUncertain = true;

    if (cat.purpose === 'direct-pii' && cat.runtime === 'slm') signals.modelState.nerVerified = true;
    if (cat.purpose === 'rubric') signals.modelState.contextVerified = true;

    allDetections.push(...result.detections);
    allRubricSignals.push(...result.rubricSignals);
  }

  // Merge en classificeer.
  const detections = mergeDetections(allDetections);
  for (const d of detections) {
    if (isDirectPiiLabel(d.label)) signals.directPii[d.label] = true;
    else if (isSpecialCategoryLabel(d.label)) signals.specialCategories[d.label] = true;
    else if (isQuasiIdentifierLabel(d.label)) signals.quasiIdentifiers[d.label] = true;
  }

  // Rubric-signals plus afgeleide rare_combination_risk.
  const quasiCount = Object.keys(signals.quasiIdentifiers).length;
  signals.rubric.signals = [...allRubricSignals];
  signals.rubric.quasiIdentifierCount = quasiCount;
  const rareLevel = deriveRareCombinationLevel(quasiCount);
  if (rareLevel) {
    signals.rubric.signals.push({
      label: 'rare_combination_risk', level: rareLevel,
      confidence: 0.85, evidenceSpans: [],
      rationale: `quasi_identifier_count=${quasiCount}`,
    });
  }

  // Interaction flags.
  signals.rubric.interactionFlags = deriveInteractionFlags({
    rubricSignals: signals.rubric.signals,
    hasSpecialCategory: Object.keys(signals.specialCategories).length > 0,
    hasParentalRole: signals.quasiIdentifiers.parental_role === true,
    intendedAction,
  });

  // Maak draft.
  let draft: string;
  let mappingHandle = undefined;
  let expectedTokens: string[] = [];

  if (mode === 'anonymous') {
    draft = anonymizeText(rawText, detections);
    draft = applyContextualGeneralization(draft, signals);

    // Optionele LLM-rewrite via actief profiel.
    const rewriteId = profile.activeDetectorIds.find(
      id => DETECTOR_CATALOG[id].purpose === 'rewrite'
    );
    if (rewriteId && intendedAction !== 'debug_log') {
      const r = await runDetector(rewriteId, {
        text: draft, mode, intendedAction,
        language: DETECTOR_CATALOG[rewriteId].language,
      });
      if (!r.failed && r.rewrittenText) {
        draft = r.rewrittenText;
        signals.modelState.rewriteVerified = true;
      } else {
        draft = repairAnonymousDraft(draft, signals);
      }
    } else {
      draft = repairAnonymousDraft(draft, signals);
    }
    signals.mappingState = 'none';
  } else {
    const result = pseudonymizeText(rawText, detections);
    draft = result.draft;
    mappingHandle = result.mappingHandle;
    expectedTokens = result.expectedTokens;
    signals.mappingState = 'local_only';
  }

  // Risk.
  const riskScore = calculateRiskScore({ detections, signals, slmUncertain });
  const riskLevel = toRiskLevel(riskScore);
  signals.outputState.riskScore = riskScore;
  signals.outputState.riskLevel = riskLevel;
  signals.outputState.containsPseudonymTokens = /\b[A-Z_]+_\d{3}\b/.test(draft);

  // Draft Check Guard.
  const dc = runDraftCheckGuard({ draft, mode, expectedTokens, riskScore });

  return {
    mode, draft, draftStatus: dc.status,
    riskScore, riskLevel, signals, detections,
    mappingHandle,
    policyVersion: PRIVACY_POLICY_VERSION,
    profileId: profile.id,
  };
}
```

---

## 36. minimalAudit.ts

```ts
import type { PimDecision } from './types';

export interface AuditEntry {
  timestamp: string;
  policyVersion: string;
  profileId: string;
  action: PimDecision['action'];
  mode: PimDecision['mode'];
  decision: PimDecision['decision'];
  ruleId: string;
  reasonCode: string;
  riskLevel: 'low' | 'medium' | 'high' | 'blocked';
  // Geen draft, geen mapping, geen ruwe input, geen embedding.
}

const audit: AuditEntry[] = [];

export function recordAudit(entry: AuditEntry): void {
  audit.push(entry);
  if (audit.length > 1000) audit.shift();
}

export function exportAudit(): AuditEntry[] {
  return [...audit];
}
```

Productieregel:

```txt
Audit bevat alleen metadata.
Audit bevat geen draft, mapping, prompt of embedding.
Audit blijft lokaal tenzij de gebruiker expliciet exporteert; export gaat door PIM.
```

---

## 37. reviewQueue.ts

```ts
import type { ProcessResult, PimDecision } from './types';

export interface ReviewQueueEntry {
  id: string;
  createdAt: string;
  reason: string;
  // Alleen verwijzing naar lokaal opgeslagen draft, niet de inhoud.
  draftRef: string;
  pimDecision: PimDecision;
  riskLevel: ProcessResult['riskLevel'];
}

const queue: ReviewQueueEntry[] = [];

export function enqueueForReview(entry: ReviewQueueEntry): void {
  queue.push(entry);
}

export function listReviewQueue(): ReviewQueueEntry[] {
  return [...queue];
}

export function dequeueAfterReview(id: string): void {
  const i = queue.findIndex(e => e.id === id);
  if (i >= 0) queue.splice(i, 1);
}
```

---

## 38. differentialPrivacy.ts

PiM verwerkt geen aggregaten in v1. Deze module is een placeholder voor toekomstige aggregatie-rapporten met DP-noise. Geen productie-implementatie zonder afzonderlijke DPIA.

```ts
export interface DpAggregate {
  id: string;
  count: number;
  epsilon: number;
}

export function placeholder_addLaplaceNoise(value: number, epsilon: number): number {
  // Productie: gebruik een gevalideerde DP-bibliotheek; deze placeholder
  // is geen veilige implementatie.
  void epsilon;
  return value;
}
```

Productieregel:

```txt
Deze module mag in productie alleen worden geactiveerd na DPIA en
review door een privacy engineer.
```

---

## 39. abuseDetection.ts

```ts
export interface AbuseSignal {
  kind: 'rapid_repeated_input' | 'oversized_input' | 'restore_floods' | 'unknown';
  count: number;
}

const counters = { input: 0, restore: 0, lastReset: Date.now() };

export function noteInput(size: number): AbuseSignal | null {
  const now = Date.now();
  if (now - counters.lastReset > 60_000) {
    counters.input = 0; counters.restore = 0; counters.lastReset = now;
  }
  counters.input++;
  if (size > 50_000) return { kind: 'oversized_input', count: counters.input };
  if (counters.input > 60) return { kind: 'rapid_repeated_input', count: counters.input };
  return null;
}

export function noteRestore(): AbuseSignal | null {
  counters.restore++;
  if (counters.restore > 30) return { kind: 'restore_floods', count: counters.restore };
  return null;
}
```

Productieregel:

```txt
Abuse-signalen leiden tot verzwaarde UI-waarschuwingen, niet tot blokkade
van legitieme gebruikers. PIM is geen rate-limiter.
```

---

## 40. runtimeHardening.ts

```ts
export function hardenRuntime(): void {
  // Verbiedt remote scripts, externe iframes, externe images en eval.
  // Implementeerd via CSP in de hostingomgeving en via runtime-monkeypatching
  // van fetch/XHR/sendBeacon/WebSocket waar passend.
  ensureCsp();
  guardFetch();
  guardXhr();
  guardBeacon();
  guardWebSocket();
}

function ensureCsp(): void {
  // Productie: CSP wordt gezet door de server, niet door de client.
  // Deze functie controleert de aanwezigheid van het meta-element of header
  // en logt een fout (zonder payload) wanneer CSP ontbreekt.
}
function guardFetch(): void { /* monkeypatch met PIM-aanroep voor egress */ }
function guardXhr(): void { /* idem */ }
function guardBeacon(): void { /* idem */ }
function guardWebSocket(): void { /* idem */ }
```

CSP-richtlijn:

```txt
default-src 'self';
script-src 'self';
connect-src 'self' https://models.pim.example;
img-src 'self' data:;
style-src 'self' 'unsafe-inline';
font-src 'self';
worker-src 'self' blob:;
frame-ancestors 'none';
form-action 'self';
base-uri 'self';
upgrade-insecure-requests;
```

---

# DEEL C: UI

## 41. UI-principes

De UI volgt drie regels:

1. **Modus is altijd zichtbaar.** De gebruiker ziet of hij in anonieme of pseudonieme modus werkt.
2. **De niet-100%-claim is altijd zichtbaar.** Niet wegklikbaar; inklapbaar mag.
3. **Geen verborgen state.** Beslissingen, profiel, actieve detectoren, risk en reden zijn zichtbaar in een PIM-paneel.

### 41.1 Anonieme modus — UI-tekst

Label:

```txt
Niet-omkeerbaar anoniem
```

Uitleg, verplicht zichtbaar bij modusselectie en bij egress-acties:

```txt
Deze modus herschrijft tekst zodat terugzetten via een mapping niet mogelijk is.
Anonimisering geeft géén 100%-garantie tegen herleidbaarheid: unieke context
(kleine groep, unieke rol, zeldzame combinatie van kenmerken) kan een persoon
nog identificeerbaar maken. PIM blokkeert egress bij verhoogd risico.
```

### 41.2 Pseudonieme modus — UI-tekst

Label:

```txt
Omkeerbaar pseudoniem (lokaal)
```

Uitleg, verplicht zichtbaar bij modusselectie:

```txt
Deze modus vervangt herkenbare gegevens door tokens. Terugzetten kan alleen
lokaal met de mapping. Deze output mag niet naar externe AI en niet als
exportbestand worden gedeeld.
```

### 41.3 PIM Decision Panel — wat het mag tonen

```txt
allow / allow_with_warning / block
reden in gewone taal
risk level (low / medium / high / blocked)
actie
modus
profiel-id en actieve detectoren
policy version
```

Wat het niet mag tonen:

```txt
mapping
raw input
volledige PIM-input
modelprompt
verborgen guarddetails met inhoud
```

### 41.4 AnonymityClaimNotice — verplicht component

```tsx
// packages/ui/AnonymityClaimNotice.tsx
import React from 'react';

export function AnonymityClaimNotice(): JSX.Element {
  return (
    <aside role="note" aria-label="Beperking van anonimisering"
           className="pim-anonymity-notice">
      <strong>Anonimisering is geen 100%-garantie.</strong>{' '}
      Unieke combinaties van kenmerken — kleine groep, unieke rol, zeldzame
      situatie — kunnen iemand identificeerbaar maken, óók zonder naam.
      PIM blokkeert egress bij verhoogd risico, maar de eindverantwoordelijkheid
      voor delen ligt bij de gebruiker en de verantwoordelijke organisatie.
    </aside>
  );
}
```

UI-regel:

```txt
AnonymityClaimNotice is verplicht zichtbaar in elke view die een anonieme
draft toont. Geen weglatingsoptie. Geen "niet meer tonen" optie.
```

### 41.5 PipelineProfilePicker — UI-component

Toont de actieve profielen. Bij wisseling van profiel:

- toont waarschuwing dat invoer opnieuw wordt verwerkt;
- toont welke detectoren actief worden;
- toont expliciet wanneer rules-only-mode actief is, met een waarschuwing dat detectie beperkt is en egress-drempels strenger zijn.

```tsx
// schets, niet productie
import React from 'react';
import { DEFAULT_PROFILES, isRulesOnly } from '../core/pipelineProfile';

export function PipelineProfilePicker(props: {
  current: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="group" aria-label="Pipeline-profiel">
      {Object.values(DEFAULT_PROFILES).map(p => (
        <label key={p.id}>
          <input type="radio" name="profile"
                 checked={p.id === props.current}
                 onChange={() => props.onChange(p.id)} />
          <span>{p.displayName}</span>
          {isRulesOnly(p) && (
            <em> — beperkte detectie, strengere drempels</em>
          )}
          <small>{p.description}</small>
        </label>
      ))}
    </div>
  );
}
```

---

## 42. React-regels

Verboden patronen:

```txt
const [mapping, setMapping] = useState(...)
const [rawInput, setRawInput] = useState(...) // wel toegestaan, mits niet gepersisteerd
localStorage.setItem('mapping', ...)
sessionStorage.setItem('mapping', ...)
console.log(rawText)
console.log(mapping)
console.log(processResult)
```

Toegestaan:

```txt
const [draft, setDraft] = useState(result.draft);
const [decision, setDecision] = useState(pimDecision);
const mappingHandleRef = useRef(result.mappingHandle);
```

Mappinghandle in een ref mag. Mapping zelf nooit.

---

# DEEL D: Runtime hardening

## 43. Netwerkcontrole

Alle netwerkfuncties moeten centraal worden bewaakt:

```txt
fetch
XMLHttpRequest
navigator.sendBeacon
WebSocket
EventSource
```

Regel:

```txt
Geen payload met raw input, mapping, pseudonieme output of herstelde tekst
mag zonder PIM allow naar buiten. Voor pseudonieme modus bestaat geen PIM
allow voor externe AI of export — die acties worden onafhankelijk van
de risicoberekening geblokkeerd.
```

## 44. Loggingcontrole

Verboden:

```txt
console.log(rawText)
console.log(mapping)
console.log(processResult)
console.error(errorWithPayload)
remoteLogger.capture(payload)
```

Fouten worden gesaneerd voor logging:

```ts
export function sanitizeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message.slice(0, 200) };
  }
  return { name: 'UnknownError', message: 'Unknown error' };
}
```

Wel gebruiken:

```txt
privacy_risk
reidentification_risk
context_specificity
draft_safety
pim_decision
profile_id
```

---

# DEEL E: Tests

## 45. Validatieset

```ts
export const PRIVACY_FIXTURES = [
  { id:'direct_email_phone',
    text:'Mail mij op j.devries@gmail.com of bel 0612345678.',
    expectedLabels:['email_personal','phone_mobile'],
    expectedRubrics:[] },
  { id:'bsn_iban',
    text:'BSN 123456782 en rekening NL91 ABNA 0417 1643 00.',
    expectedLabels:['bsn','iban'],
    expectedRubrics:[] },
  { id:'small_group_support',
    text:'De enige leerling met dyscalculie in groep 7B.',
    expectedLabels:['support_need','class_code'],
    expectedRubrics:['small_group_risk'] },
  { id:'unique_role_parental',
    text:'Het kind van de conciërge schorste gisteren.',
    expectedLabels:['parental_role','behavioral_incident'],
    expectedRubrics:['unique_role_risk','temporal_specificity','behavioral_specificity'] },
  { id:'safeguarding',
    text:'Na de melding bij Veilig Thuis is M. opgevangen door pleegouders.',
    expectedLabels:['safeguarding_signal','foster_care','first_name_only'],
    expectedRubrics:['safeguarding_context'] },
  { id:'rare_combination_migration',
    text:'11-jarige Oekraïense leerling, recent ingestroomd, groep 8, Lochem.',
    expectedLabels:['age_exact','migration_status','grade_level','region_municipality'],
    expectedRubrics:['rare_combination_risk','temporal_specificity'] },
  { id:'sogie',
    text:'De leerling vertelde over zijn coming-out tijdens de mentorles.',
    expectedLabels:['sexual_orientation'],
    expectedRubrics:[] },
  { id:'mental_health_specific',
    text:'Op donderdagochtend is hij bij de psychiater.',
    expectedLabels:['mental_health'],
    expectedRubrics:['temporal_specificity'] },
  { id:'safe_general',
    text:'Een leerling vroeg vandaag iets over de toets.',
    expectedLabels:[],
    expectedRubrics:[] },
  { id:'name_in_context',
    text:'Yusuf uit groep 7 had een goede dag.',
    expectedLabels:['first_name_only','class_code'],
    expectedRubrics:[] },
];
```

---

## 46. PIM unit tests

```ts
import { describe, expect, it } from 'vitest';
import { evaluatePim } from '../src/pimPolicy';

const baseSignals = {
  directPii: {},
  specialCategories: {},
  quasiIdentifiers: {},
  rubric: {
    signals: [], quasiIdentifierCount: 0,
    interactionFlags: {
      smallGroupWithSpecialCategory: false,
      uniqueRoleWithParentalRole: false,
      safeguardingWithExport: false,
      behavioralWithTemporal: false,
    },
  },
  outputState: {
    containsRawPersonalData: false,
    containsPseudonymTokens: false,
    containsMapping: false,
    anonymizationMode: 'anonymous' as const,
    riskScore: 0.1,
    riskLevel: 'low' as const,
  },
  modelState: { nerVerified: true, contextVerified: true, rewriteVerified: true },
  pipelineState: { profileId: 'education-nl-full', rulesOnlyMode: false, activeDetectorIds: [] },
  mappingState: 'none' as const,
};

const okGuard = [{ passed:true, guard:'DraftCheckGuard', ruleId:'pass', reasonCode:'pass', severity:'info' as const }];

describe('PIM policy', () => {
  it('blocks debug_log in any mode', () => {
    const d = evaluatePim({
      mode:'anonymous', action:'debug_log',
      draftStatus:'draft_certified_anonymous',
      guardResults: okGuard,
      modelIntegrityPassed: true,
      profileId: 'education-nl-full',
      signals: baseSignals,
    });
    expect(d.decision).toBe('block');
    expect(d.ruleId).toBe('PIM_DEBUG_LOG_BLOCK');
  });

  it('blocks pseudonymous send_external_ai unconditionally', () => {
    const d = evaluatePim({
      mode:'pseudonymous', action:'send_external_ai',
      draftStatus:'draft_certified_pseudonymous',
      guardResults: okGuard,
      modelIntegrityPassed: true,
      profileId: 'education-nl-full',
      signals: { ...baseSignals,
        outputState: { ...baseSignals.outputState, anonymizationMode: 'pseudonymous', containsPseudonymTokens: true },
        mappingState: 'local_only' },
    });
    expect(d.decision).toBe('block');
  });

  it('allows anonymous display at low risk', () => {
    const d = evaluatePim({
      mode:'anonymous', action:'display',
      draftStatus:'draft_certified_anonymous',
      guardResults: okGuard,
      modelIntegrityPassed: true,
      profileId: 'education-nl-full',
      signals: baseSignals,
    });
    expect(d.decision).toBe('allow');
  });

  it('blocks egress when hard-review label present', () => {
    const d = evaluatePim({
      mode:'anonymous', action:'send_external_ai',
      draftStatus:'draft_certified_anonymous',
      guardResults: okGuard,
      modelIntegrityPassed: true,
      profileId: 'education-nl-full',
      signals: { ...baseSignals,
        specialCategories: { safeguarding_signal: true } },
    });
    expect(d.decision).toBe('block');
    expect(d.ruleId).toBe('PIM_HARD_REVIEW_EGRESS_BLOCK');
  });

  it('uses stricter export threshold in rules-only mode', () => {
    const d = evaluatePim({
      mode:'anonymous', action:'export_file',
      draftStatus:'draft_certified_anonymous',
      guardResults: okGuard,
      modelIntegrityPassed: true,
      profileId: 'education-nl-rules-only',
      signals: { ...baseSignals,
        pipelineState: { ...baseSignals.pipelineState, profileId: 'education-nl-rules-only', rulesOnlyMode: true },
        outputState: { ...baseSignals.outputState, riskScore: 0.20 } },
    });
    expect(d.decision).toBe('block');
  });
});
```

---

## 47. Property-based tests

```ts
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { evaluatePim } from '../src/pimPolicy';

function makeSignals(score: number, mode: 'anonymous'|'pseudonymous') {
  return {
    directPii: {}, specialCategories: {}, quasiIdentifiers: {},
    rubric: {
      signals: [], quasiIdentifierCount: 0,
      interactionFlags: {
        smallGroupWithSpecialCategory: false,
        uniqueRoleWithParentalRole: false,
        safeguardingWithExport: false,
        behavioralWithTemporal: false,
      },
    },
    outputState: {
      containsRawPersonalData: false,
      containsPseudonymTokens: mode === 'pseudonymous',
      containsMapping: false,
      anonymizationMode: mode,
      riskScore: score,
      riskLevel: score >= 0.7 ? 'blocked' as const :
                 score >= 0.45 ? 'high' as const :
                 score >= 0.25 ? 'medium' as const : 'low' as const,
    },
    modelState: { nerVerified: true, contextVerified: true, rewriteVerified: true },
    pipelineState: { profileId: 'p', rulesOnlyMode: false, activeDetectorIds: [] },
    mappingState: mode === 'pseudonymous' ? 'local_only' as const : 'none' as const,
  };
}

const okGuard = [{ passed:true, guard:'g', ruleId:'p', reasonCode:'p', severity:'info' as const }];

describe('PIM properties', () => {
  it('always blocks pseudonymous external AI', () => {
    fc.assert(fc.property(fc.float({ min: 0, max: 1, noNaN: true }), score => {
      const d = evaluatePim({
        mode:'pseudonymous', action:'send_external_ai',
        draftStatus:'draft_certified_pseudonymous',
        guardResults: okGuard,
        modelIntegrityPassed: true,
        profileId: 'p',
        signals: makeSignals(score, 'pseudonymous'),
      });
      expect(d.decision).toBe('block');
    }));
  });

  it('always blocks pseudonymous export_file', () => {
    fc.assert(fc.property(fc.float({ min: 0, max: 1, noNaN: true }), score => {
      const d = evaluatePim({
        mode:'pseudonymous', action:'export_file',
        draftStatus:'draft_certified_pseudonymous',
        guardResults: okGuard,
        modelIntegrityPassed: true,
        profileId: 'p',
        signals: makeSignals(score, 'pseudonymous'),
      });
      expect(d.decision).toBe('block');
    }));
  });
});
```

---

## 48. Invariant-suite

Aparte testmodule. Een falende invariant blokkeert release. Nooit waiver.

```ts
import { describe, expect, it } from 'vitest';
import { evaluatePim } from '../src/pimPolicy';
import { rulesDetector } from '../src/detectors/rulesDetector';
import { FORBIDDEN_DETECTOR_FIELDS } from '../src/detectors/detectorContract';
import { processText } from '../src/processText';
import { DEFAULT_PROFILES } from '../src/pipelineProfile';

function minimalSignals(score: number, mode: 'anonymous'|'pseudonymous') {
  return {
    directPii: {}, specialCategories: {}, quasiIdentifiers: {},
    rubric: {
      signals: [], quasiIdentifierCount: 0,
      interactionFlags: {
        smallGroupWithSpecialCategory: false,
        uniqueRoleWithParentalRole: false,
        safeguardingWithExport: false,
        behavioralWithTemporal: false,
      },
    },
    outputState: {
      containsRawPersonalData: false,
      containsPseudonymTokens: mode === 'pseudonymous',
      containsMapping: false,
      anonymizationMode: mode,
      riskScore: score,
      riskLevel: score >= 0.7 ? 'blocked' as const :
                 score >= 0.45 ? 'high' as const :
                 score >= 0.25 ? 'medium' as const : 'low' as const,
    },
    modelState: { nerVerified: true, contextVerified: true, rewriteVerified: true },
    pipelineState: { profileId: 'p', rulesOnlyMode: false, activeDetectorIds: [] },
    mappingState: 'none' as const,
  };
}

const okGuard = [{ passed:true, guard:'g', ruleId:'p', reasonCode:'p', severity:'info' as const }];

describe('PIM invariants', () => {
  it('I1: ProcessResult never contains MappingEntry array', async () => {
    const r = await processText({
      rawText: 'Test met j.devries@gmail.com',
      mode: 'pseudonymous', intendedAction: 'display',
      profile: DEFAULT_PROFILES['education-nl-rules-only'],
    });
    expect((r as any).mapping).toBeUndefined();
    expect((r as any).mappingEntries).toBeUndefined();
    expect(r.mappingHandle).toBeDefined();
  });

  it('I2: anonymous draft does not echo raw original PII', async () => {
    const r = await processText({
      rawText: 'Test met j.devries@gmail.com',
      mode: 'anonymous', intendedAction: 'display',
      profile: DEFAULT_PROFILES['education-nl-rules-only'],
    });
    expect(r.draft).not.toContain('j.devries@gmail.com');
  });

  it('I3: pseudonymous + send_external_ai is always block', () => {
    for (let s = 0; s <= 1; s += 0.1) {
      const d = evaluatePim({
        mode:'pseudonymous', action:'send_external_ai',
        draftStatus:'draft_certified_pseudonymous',
        guardResults: okGuard, modelIntegrityPassed: true, profileId: 'p',
        signals: minimalSignals(s, 'pseudonymous'),
      });
      expect(d.decision).toBe('block');
    }
  });

  it('I4: pseudonymous + egress is always block', () => {
    for (const a of ['export_file','copy','print','share'] as const) {
      const d = evaluatePim({
        mode:'pseudonymous', action: a,
        draftStatus:'draft_certified_pseudonymous',
        guardResults: okGuard, modelIntegrityPassed: true, profileId: 'p',
        signals: minimalSignals(0.1, 'pseudonymous'),
      });
      expect(d.decision).toBe('block');
    }
  });

  it('I5: anonymous + token in output is always block', () => {
    const sig = minimalSignals(0.1, 'anonymous');
    sig.outputState.containsPseudonymTokens = true;
    const d = evaluatePim({
      mode:'anonymous', action:'copy',
      draftStatus:'draft_certified_anonymous',
      guardResults: okGuard, modelIntegrityPassed: true, profileId: 'p',
      signals: sig,
    });
    expect(d.decision).toBe('block');
  });

  it('I6: hard-review label + egress is always block', () => {
    for (const label of ['safeguarding_signal','biometric_reference','genetic_reference','sexual_orientation','gender_identity','mental_health'] as const) {
      const sig = minimalSignals(0.1, 'anonymous');
      (sig.specialCategories as any)[label] = true;
      const d = evaluatePim({
        mode:'anonymous', action:'send_external_ai',
        draftStatus:'draft_certified_anonymous',
        guardResults: okGuard, modelIntegrityPassed: true, profileId: 'p',
        signals: sig,
      });
      expect(d.decision).toBe('block');
    }
  });

  it('I7: model integrity failure blocks every non-display action', () => {
    for (const a of ['copy','export_file','send_external_ai','share','print','save_local'] as const) {
      const d = evaluatePim({
        mode:'anonymous', action: a,
        draftStatus:'draft_certified_anonymous',
        guardResults: okGuard, modelIntegrityPassed: false, profileId: 'p',
        signals: minimalSignals(0.1, 'anonymous'),
      });
      expect(d.decision).toBe('block');
    }
  });

  it('I8: any failed guard blocks every action', () => {
    const failed = [{ passed:false, guard:'DraftCheckGuard', ruleId:'fail', reasonCode:'fail', severity:'critical' as const }];
    const d = evaluatePim({
      mode:'anonymous', action:'display',
      draftStatus:'draft_certified_anonymous',
      guardResults: failed, modelIntegrityPassed: true, profileId: 'p',
      signals: minimalSignals(0.1, 'anonymous'),
    });
    expect(d.decision).toBe('block');
  });

  it('I9: containsMapping in output blocks every action', () => {
    const sig = minimalSignals(0.1, 'pseudonymous');
    sig.outputState.containsMapping = true;
    const d = evaluatePim({
      mode:'pseudonymous', action:'display',
      draftStatus:'draft_certified_pseudonymous',
      guardResults: okGuard, modelIntegrityPassed: true, profileId: 'p',
      signals: sig,
    });
    expect(d.decision).toBe('block');
  });

  it('I10: detector results never contain forbidden fields', async () => {
    const r = await rulesDetector.detect({
      text: 'Test met BSN 123456782 en mail j@x.nl',
      mode: 'anonymous', intendedAction: 'display',
      language: 'language-agnostic',
    });
    for (const field of FORBIDDEN_DETECTOR_FIELDS) {
      expect(Object.prototype.hasOwnProperty.call(r, field)).toBe(false);
    }
  });

  it('I11: invalid pipeline profile is rejected by orchestrator', async () => {
    const badProfile = {
      id:'bad', displayName:'bad', description:'',
      domain:'education-nl', activeDetectorIds: ['ner-slm-nl'],
      parameters: {},
    };
    await expect(processText({
      rawText:'x', mode:'anonymous', intendedAction:'display',
      profile: badProfile as any,
    })).rejects.toThrow(/invalid_profile/);
  });

  it('I12: rules-only profile uses stricter egress threshold', () => {
    const sig = minimalSignals(0.18, 'anonymous');
    sig.pipelineState = { profileId:'education-nl-rules-only', rulesOnlyMode: true, activeDetectorIds:[] };
    const d = evaluatePim({
      mode:'anonymous', action:'send_external_ai',
      draftStatus:'draft_certified_anonymous',
      guardResults: okGuard, modelIntegrityPassed: true, profileId: 'education-nl-rules-only',
      signals: sig,
    });
    expect(d.decision).toBe('block');
  });
});
```

CI-regel:

```txt
Een falende invariant blokkeert release. Geen waiver.
```

---

## 49. Detector contract tests

```ts
import { describe, expect, it } from 'vitest';
import { rulesDetector } from '../src/detectors/rulesDetector';
import { specialCategoryLexiconNl } from '../src/detectors/specialCategoryLexicon';
import { FORBIDDEN_DETECTOR_FIELDS } from '../src/detectors/detectorContract';

const detectors = [rulesDetector, specialCategoryLexiconNl];

describe('Detector contract', () => {
  for (const det of detectors) {
    it(`${det.id} respects forbidden fields`, async () => {
      const r = await det.detect({
        text: 'Mail mij op j@x.nl. Diabetes komt voor.',
        mode: 'anonymous', intendedAction: 'display',
        language: det.language,
      });
      for (const f of FORBIDDEN_DETECTOR_FIELDS) {
        expect(Object.prototype.hasOwnProperty.call(r, f)).toBe(false);
      }
    });

    it(`${det.id} returns failed result instead of throwing`, async () => {
      const r = await det.detect({
        text: '', mode: 'anonymous', intendedAction: 'display',
        language: det.language,
      });
      expect(r).toBeDefined();
    });
  }
});
```

---

## 50. Browser integration tests

```txt
geen mapping in React state of localStorage
geen raw input in console
geen payload via fetch zonder PIM allow
sendBeacon geblokkeerd
WebSocket payload geblokkeerd
copy-action vraagt PIM
export-action vraagt PIM
restore-action blijft lokaal
profielwissel triggert herverwerking
AnonymityClaimNotice altijd zichtbaar in anonieme draft-views
```

---

## 51. CI-gates

```yaml
name: ci

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r typecheck
      - run: pnpm -r test
      - run: pnpm -r build

  privacy-policy-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter project-pim-core test -- --run pimPolicy
      - run: pnpm --filter project-pim-core test -- --run privacyProperties
      - run: pnpm --filter project-pim-core test -- --run invariants
      - run: pnpm --filter project-pim-core test -- --run detectorContract
      - run: pnpm --filter project-pim-core test -- --run pipelineProfile
      - run: pnpm --filter project-pim-core test -- --run rubricScoring
```

Release blokkeert bij:

```txt
ontbrekende lockfile
falende typecheck of build
falende invariant-suite
falende detector-contract-test
falende pipeline-profile-test
falende egress-test
ontbrekende modelhash voor een actief profiel
```

---

# DEEL F: Integratie, productieregels en acceptatie

## 52. Integratie met externe AI-routes

PiM bedient organisaties die soms externe AI-diensten willen aanroepen. PiM stuurt zelf nooit invoer naar externe diensten, maar levert een **wrapper** die elke uitgaande AI-call door PIM laat valideren.

```ts
import type { ProcessResult, PimDecision } from './types';
import { enforcePimDecision, EgressBlockedError } from './productionEgressGuard';

export interface ExternalAiCall {
  url: string;
  body: { prompt: string };
  decision: PimDecision;
  processResult: ProcessResult;
}

export async function guardedExternalAiCall(call: ExternalAiCall): Promise<Response> {
  // Stap 1 — payloadkind bepalen.
  const payload = call.body.prompt;
  const looksLikeMapping = /\b[A-Z_]+_\d{3}\b/.test(payload);
  const looksLikeRaw =
    call.processResult.signals.outputState.containsRawPersonalData ||
    payload === call.processResult.detections.map(d => d).toString();

  // Stap 2 — Egress Guard handhaaft PIM-besluit.
  enforcePimDecision({
    channel: 'fetch',
    payloadKind: looksLikeMapping ? 'mapping'
              : looksLikeRaw    ? 'raw_input'
              : call.processResult.mode === 'anonymous' ? 'draft' : 'restored',
    decision: call.decision,
  });

  // Stap 3 — extra check: pseudonieme draft mag nooit, ook niet bij allow.
  if (call.processResult.mode === 'pseudonymous') {
    throw new EgressBlockedError({
      channel: 'fetch', payloadKind: 'draft', decision: call.decision,
    });
  }

  // Stap 4 — extra check: tokens mogen niet in een anonieme payload zitten.
  if (call.processResult.mode === 'anonymous' && /\b[A-Z_]+_\d{3}\b/.test(payload)) {
    throw new EgressBlockedError({
      channel: 'fetch', payloadKind: 'unknown', decision: call.decision,
    });
  }

  // Stap 5 — daadwerkelijke aanroep.
  return fetch(call.url, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(call.body),
  });
}
```

Productieregels voor externe AI:

```txt
Geen externe AI-route mag bestaan zonder guardedExternalAiCall.
Alleen anonieme drafts gaan eventueel naar buiten — pseudonieme drafts nooit.
Mapping-data en ruwe invoer worden onafhankelijk van PIM hard geblokkeerd.
URL en model van de externe AI-route worden gepind in een organisatie-config,
niet door de gebruiker gekozen op runtime.
```

---

## 53. Audit-cleanup en data-minimalisatie

Audit en logging mogen geen inhoudsignalen bevatten. De volgende velden zijn **expliciet verboden** in audit, logs, telemetry of analytics:

```txt
sentiment
emotion
tone
mood
psychological_state
content_summary
content_excerpt
prompt
input_text
draft_text
mapping
raw_input
embeddings
similarity_scores
detection_evidence
```

Wel toegestaan in audit:

```txt
timestamp                — wanneer
policyVersion            — welke regelset
profileId                — welk profiel actief
mode                     — anonymous | pseudonymous
action                   — welke actie geprobeerd
decision                 — allow | allow_with_warning | block
ruleId                   — welke PIM-regel
reasonCode               — gestructureerde reden
riskLevel                — low | medium | high | blocked
modelVersion             — gepinde versie zonder hash
```

Periode-bewaring:

```txt
audit-bewaring lokaal: maximaal 30 dagen tenzij organisatie korter instelt.
audit-export gaat door PIM, niet automatisch.
audit bevat nooit invoer of output.
```

Productieregel:

```txt
Een audit-record dat in code een inhoudsveld bevat (zelfs leeg) faalt
de detector-contract-test en blokkeert release.
```

---

## 54. README — verplichte structuur

Het uitgeleverde README-bestand begint **altijd** met dezelfde paragraaf, woord voor woord, voor er iets anders staat:

```txt
# Project PiM

**Anonimisering is geen 100%-garantie.**
PiM is een browser-first privacytool die persoonsgegevens lokaal detecteert,
herschrijft of pseudonimiseert voordat tekst wordt getoond, opgeslagen,
gedeeld of naar een externe AI-route gaat. PiM beperkt risico, maar kan
niet uitsluiten dat een tekst zonder naam toch identificeerbaar blijft
door context, kleine groepen of zeldzame combinaties van kenmerken. De
eindverantwoordelijkheid voor het delen van geanonimiseerde tekst ligt bij
de gebruiker en de verantwoordelijke organisatie.
```

Daarna verplichte secties, in deze volgorde:

```txt
## Installatie
## Modi: anonymous vs pseudonymous
## Pluginmodel — keuze uit een vaste catalogus
## Risico's die PiM niet kan wegnemen
## PIM beslissingsmodel in gewone taal
## Productiegate
## Bijdragen
## Licentie
```

De sectie *Modi* legt uit dat anoniem geen mapping kent en pseudoniem nooit naar externe AI of export gaat.
De sectie *Pluginmodel* legt uit dat de gebruiker kiest uit een vaste, ondertekende catalogus en geen vrije code kan toevoegen.
De sectie *Productiegate* verwijst naar sectie 55 hieronder.

README mag geen marketingclaim bevatten als "PiM garandeert anonimiteit", "100% privacy" of "volledig anoniem". Een lint-test in CI controleert dit.

```ts
// scripts/lintReadme.ts
const FORBIDDEN_README_PHRASES = [
  /100\s*%\s*anoniem/i,
  /100\s*%\s*privacy/i,
  /volledig\s+anoniem/i,
  /garand(?:eert|ie)\s+anonimiteit/i,
  /niet\s+herleidbaar(?!\s+via\s+PiM)/i,
];

import { readFileSync } from 'node:fs';
const text = readFileSync('README.md', 'utf-8');
for (const r of FORBIDDEN_README_PHRASES) {
  if (r.test(text)) {
    console.error('forbidden_marketing_claim_in_readme:', r);
    process.exit(1);
  }
}
```

---

## 55. Productiegate — harde regels

Een release mag pas naar productie wanneer **elk** van deze regels aantoonbaar geldt. Geen waiver, geen "tijdelijke uitzondering", geen "we lossen het volgende sprint op".

```txt
1.  PIM blijft de enige bron van waarheid voor allow/block.
2.  PIM is deterministische TypeScript-code, geen prompt of taalmodel.
3.  PIM-besluit bevat altijd policyVersion, profileId, ruleId, reasonCode,
    timestamp.
4.  Mapping verlaat de browser nooit. Mapping zit nooit in ProcessResult.
    Alleen MappingHandle is toegestaan in de retourwaarde.
5.  Pseudonieme modus blokkeert send_external_ai, export_file, copy, print
    en share — onafhankelijk van risk en profiel.
6.  Anonieme modus blokkeert egress wanneer de output ruwe persoonsgegevens
    of pseudonieme tokens bevat.
7.  Anonieme modus blokkeert egress bij hard-review labels (sectie 12).
8.  Rules-only profielen gebruiken strengere egress-drempels en tonen
    een UI-waarschuwing.
9.  Elk model in de catalogus heeft een gepinde SHA256. Een model met
    REPLACE_-hash mag niet actief zijn in productie.
10. Modelintegriteits-falen blokkeert elke niet-display-actie.
11. Detectoren retourneren geen velden uit FORBIDDEN_DETECTOR_FIELDS.
12. Detectoren leveren nooit een PIM-besluit.
13. Een profiel zonder verplichte baseline (rules + special-category-lexicon)
    wordt door validateProfile geweigerd.
14. Een profiel met onbekende detector-id of conflicterende talen wordt
    geweigerd.
15. AnonymityClaimNotice is verplicht zichtbaar in elke anonieme draft-view.
    Een lint-test in CI controleert de aanwezigheid van het component
    in de relevante views.
16. README begint met de niet-100%-paragraaf uit sectie 54.
17. Geen marketingclaim van absolute anonimiteit in README, documentatie
    of UI.
18. CSP staat in productie volgens sectie 40. connect-src bevat alleen
    de model-mirror, geen externe analytics, geen externe AI-endpoint.
19. Geen externe AI-call zonder guardedExternalAiCall.
20. Audit bevat geen sentiment-, emotie- of inhoudvelden.
21. Falende invariant-suite blokkeert release. Nooit waiver.
22. Falende detector-contract-test blokkeert release.
23. Falende pipeline-profile-test blokkeert release.
24. Lockfile gepind. Geen ^- of ~-versies in dependencies van core.
25. Console-logging in productiebuilds is uitgeschakeld; sanitizeError is
    de enige route voor foutendienst.
```

---

## 56. Acceptatiecriteria

Per release moet de volgende lijst checkbaar zijn voor product owner én privacy engineer:

```txt
[ ] Bestaat het bestand Project-PiM-source.md in docs/?
[ ] Begint README met de niet-100%-paragraaf woord voor woord?
[ ] Bevat README de paragraaf over het pluginmodel?
[ ] Bevat de UI een PrivacyModeToggle met heldere labels?
[ ] Bevat de UI een PipelineProfilePicker met rules-only-waarschuwing?
[ ] Is AnonymityClaimNotice zichtbaar in elke anonieme draft-view?
[ ] Is AnonymityClaimNotice niet wegklikbaar?
[ ] Is een PIM Decision Panel zichtbaar bij elke beslissing?
[ ] Bevat het PIM Decision Panel ruleId, reasonCode, profileId, riskLevel?
[ ] Is de modelcatalogus gepind met SHA256?
[ ] Wordt elk model voor gebruik door loadVerifiedModel gevalideerd?
[ ] Bevat ProcessResult alleen MappingHandle, nooit MappingEntry[]?
[ ] Slaagt de invariant-suite (I1..I12)?
[ ] Slagen de detector-contract-tests voor elke actieve detector?
[ ] Slaagt validateProfile voor elk geactiveerd profiel?
[ ] Heeft elk profiel rules én special-category-lexicon als baseline?
[ ] Wordt een profiel zonder baseline geweigerd?
[ ] Wordt een profiel met conflicterende talen geweigerd?
[ ] Blokkeert PIM elke pseudonieme egress, ongeacht risk?
[ ] Blokkeert PIM elke egress met hard-review label?
[ ] Gebruikt PIM strengere drempels in rules-only profielen?
[ ] Toont UI een waarschuwing bij rules-only profielen?
[ ] Bevat audit alleen metadata (geen inhoud, geen sentiment)?
[ ] Worden console.log-aanroepen op rauwe input/mapping geweigerd in CI?
[ ] Is CSP geconfigureerd volgens sectie 40?
[ ] Bevat connect-src alleen de model-mirror?
[ ] Wordt elke externe AI-call door guardedExternalAiCall geleid?
[ ] Slaagt de README-lint-test (geen verboden marketingfrases)?
[ ] Is de lockfile gepind?
[ ] Bevatten dependencies in core geen ^/~-ranges?
[ ] Is sanitizeError de enige route naar foutendienst?
[ ] Slaagt de browser integration test "no mapping in localStorage"?
[ ] Slaagt de browser integration test "no raw input in console"?
[ ] Slaagt de browser integration test "fetch geblokkeerd zonder PIM allow"?
[ ] Heeft de release-tag een corresponderende invariant-suite-run in CI?
```

---

## 57. Implementatieroadmap

PiM wordt in zes sprints opgeleverd. Latere sprints starten alleen wanneer eerdere zijn afgesloten.

```txt
Sprint 1 — Core types en taxonomie
- types.ts, privacy.config.ts, taxonomy.ts, modelCatalog.ts, hash.ts.
- Eerste validatieset PRIVACY_FIXTURES.
- Detector-contract types vastgelegd.

Sprint 2 — Mapping en modes
- secureMapping.ts (memory + AES-GCM).
- pseudonymize.ts, anonymize.ts.
- contextualGeneralization.ts, repairAnonymousDraft.ts.
- mappingHandle in alle types verwerkt; geen MappingEntry[] in ProcessResult.

Sprint 3 — Guards en PIM
- draftCheckGuard.ts, productionEgressGuard.ts, restoreGuard.ts.
- pimPolicy.ts met alle 9 fasen.
- Eerste invariant-suite (I1..I9).
- Eerste property-tests.

Sprint 4 — Modelruntime en detectors
- modelIntegrity.ts.
- rulesDetector.ts, specialCategoryLexicon.ts (baseline).
- nerSlmDetector.ts, contextSlmDetector.ts, rewriteLlmDetector.ts.
- detectorRegistry.ts en pipelineProfile.ts.
- I10..I12 toegevoegd; detector-contract-tests opgeleverd.

Sprint 5 — UI en hardening
- PrivacyModeToggle, PipelineProfilePicker, DraftSafetyBadge.
- AnonymityClaimNotice (verplicht), PimDecisionPanel.
- BrowserPrivacyLoadingIndicator.
- runtimeHardening.ts en CSP-configuratie.
- Browser integration tests groen.

Sprint 6 — CI en release-gate
- privacy-policy-gate in CI met alle invariant- en propertytests.
- README-lint en marketingclaim-lint actief.
- Productiegate uit sectie 55 punt voor punt afgevinkt.
- Eerste tagged release.
```

Doorontwikkeling na de eerste release volgt een vaste regel: **elke nieuwe detector of model komt eerst in de catalogus terecht onder een nieuwe versie, met SHA256 en taalspecificatie. Plug-inkeuzes voor gebruikers verschijnen pas in de UI zodra de detector of het model door de invariant- en contract-tests is gekomen.**

---

## 58. Beslislogica in gewone taal

Voor wie dit document leest zonder TypeScript-achtergrond. Dezelfde regels als in code, in alledaagse taal. Bij conflict tussen deze beschrijving en de code wint de code.

### 58.1 Wat doet PiM met een tekst?

1. PiM kijkt eerst met regels. Hij zoekt naar **patronen**: BSN, IBAN, e-mailadres, telefoonnummer, postcode, datum, klascode. Dit gebeurt zonder taalmodel en werkt voor elke taal.
2. Daarna kijkt PiM in een **lexicon** voor woorden die op een bijzondere categorie wijzen — gezondheid, religie, etniciteit, jeugdzorg, safeguarding, migratie. Het lexicon is taalspecifiek.
3. Daarna kijkt PiM met een **NER-model** naar namen, plaatsen en organisaties — alleen wanneer het profiel zo'n model toelaat en het model integer is geladen.
4. Daarna kijkt PiM met een **context-model** naar rubrieken: kleine groep, unieke rol, safeguarding-context, tijdspecificiteit, locatiespecificiteit, zeldzame combinatie.
5. PiM kiest een **modus**:
   - anoniem → vervangt gevonden gegevens door generaliseringen ("een leerling", "een datum"). Geen mapping. Eventueel herschrijft een lokaal taalmodel de tekst tot natuurlijker Nederlands.
   - pseudoniem → vervangt gevonden gegevens door tokens (`STUDENT_001`, `EMAIL_002`). Mapping wordt versleuteld lokaal opgeslagen.
6. PiM controleert de draft. Bevat hij ruwe persoonsgegevens of een verkeerd token? Dan wordt de draft geblokkeerd of gerepareerd.
7. PiM berekent een **risicoscore**. Severity, rubrieken, interactie-effecten en — bij rules-only profielen — een opslag voor onzekerheid wegen mee.
8. **PIM** beslist, op basis van modus, actie, draft-status, risicoscore en signalen, of de actie mag.

### 58.2 Wanneer blokkeert PIM altijd?

```txt
- bij debug-logging van inhoud;
- wanneer een vereist model niet integer is geladen (alle acties behalve display);
- wanneer een guard faalt;
- wanneer mapping in de output zit;
- wanneer ruwe persoonsgegevens in de output zitten;
- wanneer draft niet gecertificeerd is;
- wanneer modus en draft-status niet bij elkaar passen;
- wanneer modus pseudoniem is en de actie copy, print, share, export of
  external_ai is;
- wanneer modus anoniem is en de output toch tokens bevat;
- wanneer een hard-review label aanwezig is en de actie egress is;
- wanneer de risk te hoog is voor de gevraagde actie;
- wanneer het profiel ongeldig is.
```

### 58.3 Wanneer staat PIM toe?

```txt
- anonieme draft, lage risk, lokale actie (display, save_local) → allow.
- anonieme draft, lage risk, egress zonder hard-review label → allow.
- anonieme draft, lage risk, egress in rules-only profiel → allow_with_warning.
- pseudonieme draft, display of restore → allow_with_warning.
- pseudonieme draft, save_local met versleutelde mapping → allow_with_warning.
```

### 58.4 Wat ziet de gebruiker?

- de modus die actief is;
- het profiel dat actief is, en welke detectoren erin zitten;
- de niet-100%-claim, altijd zichtbaar;
- de risk-level (low / medium / high / blocked);
- het PIM-besluit met reden in gewone taal;
- bij rules-only: een waarschuwing dat detectie beperkt is.

### 58.5 Wat ziet de gebruiker bewust níet?

- de mapping;
- de ruwe invoer als tweede kopie;
- de prompt naar een lokaal taalmodel;
- de inhoud van een audit-record (dat bevat geen inhoud).

### 58.6 Eindwoord

PiM is opzettelijk **streng**. Het uitgangspunt is dat een privacytool die af en toe te veel toelaat, geen privacytool is — alleen een gebruiksinterface die comfort biedt. De enige verdedigbare positie is: bij twijfel blokkeren. Modellen kunnen falen, mensen kunnen verkeerd kiezen, contexten kunnen meer onthullen dan ze lijken te onthullen. PIM is daarom niet onderhandelbaar, niet configureerbaar, niet door te overrulen door een prompt.

De vrijheid die PiM aan gebruikers geeft, zit niet in de beslislaag, maar in de **pijplijn**: welke taal, welk domein, welke detectoren actief zijn, en of er met of zonder lokale taalmodellen wordt gewerkt. Die vrijheid is bedoeld om PiM bruikbaar te houden in verschillende organisaties, in verschillende talen, voor verschillende doelen — zonder dat het oordeel over wat veilig genoeg is, ergens onderweg verdwijnt.

Anonimisering is een risicobeperkende maatregel. Geen 100%-garantie. Wie dat begrijpt, gebruikt PiM zoals het bedoeld is.

— einde document —

---

## Appendix v3 — samenvatting van toegepaste correcties

Deze versie is gemaakt op basis van `Project-PiM-source.md` en verwerkt deze correcties:

1. `Project PiM` is vastgezet als productnaam; `PIM` is alleen de deterministische policy engine.
2. `Project-PiM-source-v3.md` is gemarkeerd als source of truth.
3. Eerste release is beperkt tot `education-nl`.
4. `education-nl-full` en `education-nl-rules-only` zijn de enige release-1 profielen.
5. Zorg en generic-profielen blijven ontwerpvoorbereiding.
6. De modelcatalogus bevat nu concrete default modelkeuzes uit de eerdere PIM v2-specificatie.
7. Het onderwijscontextmodel is opgehoogd naar `context-nl-education-v2`.
8. Pseudonymous external AI, export, copy, print en share blijven altijd hard geblokkeerd.
9. Productie vereist gepinde hashes of eigen mirror. Placeholderhashes blokkeren release.
10. De productiegate is aangescherpt op profielscope, invarianten en externe-AI-wrapper.
