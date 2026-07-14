# Project PIM

**Definitief bronbestand voor een browser-first privacytool voor onderwijsdata met lokale SLM/LLM, deterministische PIM-besluitvorming, niet-omkeerbare anonimisering en omkeerbare pseudonimisering.**

Specificatieversie: v2.0  
Datum: 2026-04-24  
Bestandsnaam: `Project-PIM-bronbestand-v2.md`  
Status: zelfstandig brondocument  
Doelgroep: ontwikkelaar, privacy engineer, security reviewer, architect, product owner, onderwijsorganisatie.

---

## 0. Wat dit document is

Dit document beschrijft **Project PIM** als zelfstandig product. De lezer hoeft geen ander brondocument of technische voorgeschiedenis te kennen.

Project PIM betekent:

```txt
Privacy Integrity Monitor
```

Project PIM is een browser-first privacytool voor onderwijsdata. De centrale beslislaag heet PIM. PIM is geen prompt, geen SLM, geen LLM en geen leergeheugen. PIM is deterministische applicatiecode die per concrete actie beslist of de actie mag doorgaan.

Dit document bevat:

- productclaim en afbakening;
- juridisch onderscheid tussen anonimiseren en pseudonimiseren;
- threat model;
- totale verwerkingsflow;
- rollen van code, SLM, LLM, guards, PIM en egress;
- PII-taxonomie en PII-contexttaxonomie;
- Model Registry;
- modelintegriteit en fail-closed loading;
- TypeScript-types;
- detectieregels;
- browser-SLM-signalen;
- detectiemerge;
- veilige mapping;
- anonieme en pseudonieme verwerking;
- Draft Check Guard;
- PIM-policy engine in code;
- Production Egress Guard;
- Restore Guard;
- externe-AI-beleid;
- minimale audit;
- review queue;
- differential privacy voor aggregaten;
- abuse detection;
- UI-regels;
- repositorystructuur;
- teststrategie;
- CI-gates;
- acceptatiecriteria;
- implementatieroadmap.

De toon van dit document is bewust streng. Het doel is niet om schijnanonimisering te verkopen, maar om die technisch te voorkomen.

---

## 1. Managementsamenvatting

Project PIM is een lokale privacytool voor onderwijsdata. De tool verwerkt tekst en bijbehorende privacyrisico's in de browser voordat tekst zichtbaar wordt gemaakt, lokaal wordt opgeslagen, wordt hersteld, wordt gekopieerd, wordt geëxporteerd of naar een externe AI-route gaat.

De tool heeft twee hoofdmodi:

1. **niet-omkeerbaar anoniem**;
2. **omkeerbaar pseudoniem**.

De twee modi mogen technisch nooit door elkaar lopen.

### 1.1 Niet-omkeerbaar anoniem

Deze modus is bedoeld voor delen, export, rapportage, onderzoek, interne analyse en eventueel externe AI-verwerking.

Eigenschappen:

```txt
geen mapping
geen restore
geen herleidbare tokens
geen pseudonieme export
contextuele generalisatie verplicht
Draft Check Guard verplicht
PIM-besluit verplicht
Production Egress Guard verplicht
export alleen bij lage herleidbaarheid
externe AI alleen na PIM allow
```

### 1.2 Omkeerbaar pseudoniem

Deze modus is bedoeld voor lokaal eigen gebruik door een bevoegde gebruiker.

Eigenschappen:

```txt
lokale tokenisatie
mapping alleen lokaal
mapping versleuteld met AES-GCM indien persistentie nodig is
restore alleen lokaal
mapping nooit naar server
mapping nooit naar externe AI
mapping nooit naar PIM-eventlog
pseudonieme output nooit als anonieme export behandelen
pseudonieme output niet naar externe AI
```

### 1.3 Ontwerpkeuze: PIM als productkern

Project PIM splitst privacybescherming in duidelijke rollen:

```txt
Guards = gespecialiseerde controles per stap
SLM/LLM = detectie, classificatie en herschrijving
PIM = centrale policybeslisser in code
Egress Guard = technische handhaving van PIM-besluit
Audit = minimale beslismetadata zonder inhoud
```

PIM is bewust geen geheugenlaag. De tool bouwt geen leerprofielen op, bewaart geen contextvectors en gebruikt geen prompt om het eindbesluit te nemen. Daardoor is het ontwerp beter testbaar, strenger en makkelijker te reviewen.

---

## 2. Productclaim

Niet claimen:

```txt
Wij garanderen dat elke onderwijscontext altijd juridisch volledig anoniem is.
```

Wel claimen:

```txt
Project PIM dwingt een technische scheiding af tussen ruwe input, pseudonieme verwerking, anonieme verwerking, mapping, lokale opslag, netwerkverkeer en export.
```

Verder:

```txt
In anonieme modus bestaat er geen mapping en kan de tool originele gegevens niet terugzetten.

In pseudonieme modus kan terugzetten alleen lokaal via een afgeschermde mapping.

Ruwe input en mapping verlaten de browser niet.

SLM/LLM-modellen mogen signalen leveren of tekst herschrijven, maar nemen nooit het definitieve allow/block-besluit.

PIM beslist per concrete actie in deterministische code.

Bij twijfel wordt geblokkeerd.
```

---

## 3. Juridische afbakening

### 3.1 Pseudonimiseren

Pseudonimiseren betekent dat persoonsgegevens worden vervangen door tokens of andere aanduidingen, terwijl herleiding mogelijk blijft met aanvullende informatie.

Als mapping, sleutel of herstelroute bestaat, blijft de informatie in beginsel persoonsgegeven.

Voor deze tool betekent dat:

```txt
pseudonieme output mag nooit automatisch als anoniem gelden
pseudonieme output mag niet naar externe AI
pseudonieme output mag niet als exportbestand worden vrijgegeven
restore mag alleen lokaal
mapping mag nooit buiten de lokale beveiligde container komen
```

### 3.2 Anonimiseren

Anonimiseren betekent dat herleiding redelijkerwijs niet meer mogelijk is. In onderwijs is dat moeilijk door contextuele herkenbaarheid. Ook zonder naam kan een leerling herkenbaar zijn door combinatie van details.

Voorbeelden:

```txt
kleine klas
specifieke zorgbehoefte
pleegzorg
unieke verhuizing
zeldzame thuissituatie
incident op een datum
schoolnaam plus plaats
functie van ouder binnen school
```

Daarom is anonieme modus in deze tool streng:

```txt
geen mapping
geen tokens die herstel suggereren
contextuele generalisatie
risicoscore
Draft Check Guard
PIM-besluit
Production Egress Guard
human review bij twijfel
```

### 3.3 AI Act en verboden productclaims

De tool mag niet worden gebruikt voor:

```txt
emotieherkenning in onderwijs
stressdetectie
engagement scoring
attention scoring
gedragsprofilering van leerlingen
risicoprofilering voor disciplinaire beslissingen
automatische beslissingen over leerlingen
```

Wel toegestaan als technische focus:

```txt
privacy_risk
reidentification_risk
draft_safety
generalization_quality
export_allowed
human_review_required
policy_decision
```

### 3.4 Menselijke verantwoordelijkheid

De tool ondersteunt privacybescherming, maar vervangt geen juridisch oordeel. Bij gevoelige dossiers, kleine populaties of twijfelgevallen moet export worden geblokkeerd of handmatig worden beoordeeld.

### 3.5 Bronnen voor juridische review

Gebruik bij juridische review minimaal deze actuele primaire bronnen:

- EDPB Guidelines 01/2025 on Pseudonymisation
  https://www.edpb.europa.eu/our-work-tools/documents/public-consultations/2025/guidelines-012025-pseudonymisation
- Autoriteit Persoonsgegevens, Handleiding Algemene verordening gegevensbescherming, onderdeel pseudonimisering en anonimisering
  https://www.autoriteitpersoonsgegevens.nl/uploads/imported/handleidingalgemeneverordeninggegevensbescherming.pdf
- Regulation (EU) 2024/1689, Artificial Intelligence Act
  https://eur-lex.europa.eu/eli/reg/2024/1689/oj


---

## 4. Threat model

### 4.1 Te beschermen data

De tool beschermt minimaal:

```txt
raw input
originele persoonsgegevens
mapping tussen token en origineel
pseudonieme output
anonieme draft vóór certificering
herstelde tekst
modelprompts met gevoelige inhoud
netwerkpayloads
logs
browserstate
localStorage
IndexedDB
clipboard
exportbestanden
print-output
debug-events
analytics-events
```

### 4.2 Aanvallers en fouten

De tool gaat uit van deze risico's:

```txt
ontwikkelaar logt per ongeluk raw input
UI zet mapping in React state
browserextensie leest zichtbare tekst
gebruiker exporteert pseudonieme tekst als anoniem
externe AI-route ontvangt tokens of raw fragmenten
modelhallucinatie voegt token of naam toe
SLM mist contextueel risico
LLM herschrijft te specifiek
cache of storage bewaart gevoelige payload
analytics of session replay leest tekst
WebSocket of beacon stuurt payload weg
debugmodus lekt inhoud
```

### 4.3 Verdedigingslijnen

De verdedigingslijnen zijn:

```txt
runtime hardening
Input Privacy Guard
rule-based detectie
browser-SLM-detectie
Signal Merger
anonieme of pseudonieme verwerking
Secure Mapping Container
Risk Scoring
Draft Check Guard
Repair Loop
PIM-policy engine
Production Egress Guard
Restore Guard
Minimal Audit
CI-testgate
```

### 4.4 Fail-closed uitgangspunt

Deze situaties blokkeren altijd export, externe AI, copy naar buiten en delen:

```txt
PIM ontbreekt
PIM-besluit ontbreekt
modelstatus onzeker
verplicht model ontbreekt
hash onbekend of mismatch
Draft Check Guard faalt
mapping gedetecteerd in output
raw persoonsgegevens gedetecteerd in output
pseudonieme tokens in anonieme output
pseudonieme output naar externe AI
risicoscore boven drempel
```

---

## 5. Architectuur

### 5.1 Hoofdflow

```txt
Raw onderwijsinput
  ↓
Runtime Hardening
  ↓
Input Privacy Guard
  ↓
Code Detectors
  ↓
Browser SLM Detectors
  ↓
Signal Merger
  ↓
Mode Selection
  ├─ Anonymous Path
  │    ↓
  │  Irreversible Generalization
  │    ↓
  │  Optional Browser LLM Rewrite
  │
  └─ Pseudonymous Path
       ↓
     Local Tokenization
       ↓
     Secure Mapping Container
  ↓
Risk Scoring
  ↓
Draft Creation
  ↓
Draft Check Guard
  ↓
Repair Loop or Block
  ↓
PIM Decision Gate
  ↓
Production Egress Guard
  ↓
Display, Restore, Save, Export, Review or Block
```

### 5.2 Rollen

| Laag | Rol | Mag finale toestemming geven? |
|---|---|---:|
| Code detectors | Herkennen harde PII-patronen | Nee |
| Browser SLM | Herkennen contextueel risico | Nee |
| Browser LLM | Herschrijven en repareren | Nee |
| Guards | Controleren per stap | Nee |
| PIM | Beslist per actie | Ja |
| Egress Guard | Handhaaft PIM-besluit | Nee |
| Audit | Legt minimale metadata vast | Nee |

### 5.3 PIM is geen guard

PIM is geen extra guard naast de andere guards.

```txt
Guards leveren signalen en lokale blokkades.
PIM neemt het centrale besluit.
Egress Guard voert dat besluit technisch uit.
```

Een guard mag nooit zeggen:

```txt
export toegestaan
externe AI toegestaan
copy toegestaan
```

Een guard mag wel zeggen:

```txt
draft bevat raw leak
mapping gevonden
modelstatus onvoldoende
output bevat pseudonieme tokens
```

PIM vertaalt die signalen naar een actiebesluit.

---

## 6. Verwerkingsmodi

### 6.1 Mode: anonymous

Doel:

```txt
niet-omkeerbare anonimisering voor veilige uitvoer
```

Regels:

```txt
geen mapping maken
geen tokenherstel toestaan
geen originele waarden bewaren
unieke details generaliseren
kleine groepen generaliseren
zorgcontext alleen algemeen beschrijven
incidenten ontdoen van datum, locatie en unieke combinatie
```

Mogelijke acties na PIM:

| Actie | Mogelijk? | Voorwaarde |
|---|---:|---|
| display | Ja | Draft Check Guard passed |
| copy | Ja | PIM allow, lage risk |
| save_local | Ja | PIM allow, geen raw/mapping |
| export_file | Ja | PIM allow, lage risk, modellen verified |
| send_external_ai | Ja | PIM allow, lage risk, geen gevoelige context |
| print | Ja | PIM allow, lage risk |
| share | Ja | PIM allow, lage risk |
| restore | Nee | Geen mapping beschikbaar |
| debug_log | Nee | Inhoud nooit loggen |

### 6.2 Mode: pseudonymous

Doel:

```txt
lokaal werken met herstelbare tokens
```

Regels:

```txt
mapping alleen lokaal
mapping niet in React state
mapping niet in gewone return-objecten
mapping niet in logs
mapping niet in localStorage zonder AES-GCM
mapping niet naar server
mapping niet naar externe AI
pseudonieme output niet exporteren in deze specificatie
```

Mogelijke acties na PIM:

| Actie | Mogelijk? | Voorwaarde |
|---|---:|---|
| display | Ja | Draft Check Guard passed |
| restore | Ja | Alleen lokaal, bevoegde sessie, mapping beschikbaar |
| copy | Nee | Te groot risico op egress |
| save_local | Alleen encrypted session package | Geen plain text opslag |
| export_file | Nee | Pseudoniem blijft persoonsgegevens |
| send_external_ai | Nee | Altijd block |
| print | Nee | Egress-risico |
| share | Nee | Egress-risico |
| debug_log | Nee | Inhoud nooit loggen |

### 6.3 Geen stille mode-switch

De tool mag nooit automatisch van pseudonymous naar anonymous switchen zonder nieuwe verwerking.

Verboden:

```txt
pseudonieme tekst nemen
tokens verwijderen
claimen dat dit anoniem is
```

Vereist:

```txt
raw input opnieuw door anonymous path
geen mapping gebruiken
Draft Check Guard opnieuw
PIM opnieuw
```

---

## 7. PII-taxonomie

### 7.1 Directe PII

Directe PII is informatie die op zichzelf of bijna op zichzelf identificeert.

Minimaal te detecteren in code:

```txt
naamachtige patronen
e-mailadressen
telefoonnummers
adressen
postcode plus huisnummer
BSN-achtige nummers
leerlingnummer
studentnummer
medewerkernummer
gebruikersnaam
IBAN
IP-adres
URL met persoonlijke ID
geboortedatum
exacte datum in gevoelige context
schoolnaam
klascode
plaatsnaam in combinatie met schoolcontext
```

### 7.2 Bijzondere of gevoelige gegevens

Minimaal als risicocategorie:

```txt
gezondheid
beperking
zorgbehoefte
jeugdzorg
pleegzorg
Veilig Thuis
religie
etniciteit
migratieachtergrond
thuistaal
financiële problemen
straf of discipline
gedragsincident
verzuim
psychologisch welzijn
```

Deze categorieën mogen niet als leerlingprofiel worden gebruikt. Ze zijn alleen signalen voor herleidbaarheidsrisico en blokkadebeleid.

### 7.3 Onderwijscontext als PII-context

Context kan herleidbaar zijn zonder directe PII.

Voorbeelden:

```txt
de enige leerling met dyscalculie in groep 7B
het kind van de conciërge
de leerling die vorige week is geschorst
het meisje dat net uit Oekraïne is ingestroomd
de leerling met diabetes in de plusklas
de enige havoleerling die op donderdag naar therapie gaat
```

### 7.4 Contextuele PII-signalen

PIM kent deze signalen als vaste codecategorieën:

```txt
smallGroupRisk
uniqueRoleRisk
specialNeedsContext
healthContext
familyContext
migrationContext
behavioralIncident
safeguardingContext
performanceContext
temporalSpecificity
locationSpecificity
schoolSpecificity
rareCombinationRisk
```

De SLM mag deze signalen vullen. PIM beslist in code wat ermee gebeurt.

---

## 8. Verdeling tussen code en SLM
### 8.0 Waarom Project PIM twee detectielagen gebruikt

Regex en NER vangen de gestructureerde PII. Denk aan namen, e-mailadressen, telefoonnummers, leerlingnummers, BSN-achtige nummers, geboortedatums, adressen, klascodes en schoolnamen. Dit is de relatief makkelijke laag. Een lokale browsertool kan deze laag goed uitvoeren met vaste patronen, woordenlijsten en lokale NER.

De moeilijkste privacyproblemen zitten in contextuele PII. Een zin kan herleidbaar zijn zonder naam, e-mail of nummer. Voorbeelden:

```txt
de teamleider inkoop in Zwolle die vorig jaar met pensioen ging
de enige leerling met dyscalculie in groep 7B
het kind van de conciërge dat vorige week is geschorst
de leerling uit de plusklas die op donderdag naar therapie gaat
```

Een regex-only aanpak mist dit structureel. Daarom gebruikt Project PIM naast vaste codepatronen ook een lokale semantische detectielaag. Een lokaal taalmodel uit de Gemma- of Qwen 2.5-klasse kan signalen geven over kleine groepen, unieke rollen, zeldzame combinaties, tijd, locatie, zorgcontext en schoolcontext. Dat is niet perfect, maar het is duidelijk sterker dan alleen pattern matching.

De taakverdeling blijft strikt:

```txt
Regex en NER: directe PII vinden.
Lokale SLM: contextuele PII signaleren.
PIM-code: per actie allow, allow_with_warning of block beslissen.
```

De SLM mag nooit beslissen of export, copy, share, print, restore of externe AI is toegestaan. De SLM levert alleen labels en confidence. PIM beslist deterministisch in code.


### 8.1 Code detecteert harde patronen

Code moet alle betrouwbare patronen zelf detecteren. Dat geldt voor e-mail, telefoon, leerlingnummers, datums, adressen, URLs, schooltermen, klascodes en bekende zorgtermen.

### 8.2 SLM detecteert semantische context

De browser-SLM vult aanvullende labels, bijvoorbeeld:

```json
{
  "smallGroupRisk": true,
  "healthContext": true,
  "temporalSpecificity": "high",
  "locationSpecificity": "medium",
  "confidence": 0.86
}
```

### 8.3 SLM beslist nooit

Verboden modeloutput:

```json
{
  "exportAllowed": true
}
```

Toegestane modeloutput:

```json
{
  "labels": ["smallGroupRisk", "specialNeedsContext"],
  "confidence": 0.82,
  "evidenceSpans": []
}
```

`evidenceSpans` mogen in productie geen raw tekst bevatten. Ze mogen alleen offsets, lengtes en type-labels bevatten.

### 8.4 Conflictregel

Bij conflict geldt de strengste uitkomst:

```txt
code zegt risico, SLM zegt veilig -> risico
SLM zegt risico, code zegt veilig -> risico
SLM onzeker -> risico verhogen
model ontbreekt -> geen export of externe AI
```

---

## 9. Modelkeuze

### 9.1 SLM voor NER

Definitieve primaire route:

```txt
Primary SLM NER:
jdp8/wikineural-multilingual-ner

Base model:
Babelscape/wikineural-multilingual-ner

Runtime:
@huggingface/transformers

Task:
token-classification

Device:
webgpu, daarna wasm

Fail policy:
fail_closed voor export, save, share, print en externe AI
```

### 9.2 SLM voor onderwijscontext

NER is niet genoeg. Daarom is een tweede SLM nodig.

```txt
Education Privacy Context Classifier:
pim-education-privacy-context-v2

Runtime:
@huggingface/transformers

Task:
text-classification

Status:
zelf trainen of fine-tunen

Labels:
small_group_risk
unique_role_risk
support_need_context
health_context
family_context
migration_context
performance_context
behavioral_incident
safeguarding_context
temporal_specificity
location_specificity
school_specificity
safe_general_text
```

Tot dit model verified beschikbaar is:

```txt
geen export
geen share
geen print
geen externe AI
alleen lokale draftweergave met waarschuwing
```

### 9.3 Browser LLM voor herschrijving

Definitieve primaire keuze:

```txt
Primary browser LLM:
mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC

Runtime:
@mlc-ai/web-llm

Task:
contextual_generalization
draft_repair

Device:
webgpu

Fail policy:
fallback_to_rule_generalization
```

De browser LLM mag alleen werken op:

```txt
reeds geschoonde tekst
anonieme kandidaattekst
pseudonieme tekst zonder mapping
```

De browser LLM mag nooit raw input of mapping ontvangen als prompt.

### 9.4 Modelgrootte en UX

UI en README vermelden:

```txt
NER SLM kan honderden MB's downloaden.
Browser LLM kan ongeveer 1 tot 2 GB downloaden.
De eerste laadtijd kan lang zijn.
WebGPU is aanbevolen.
WASM fallback is vooral voor SLM, niet voor LLM.
Offline gebruik werkt alleen na succesvolle cache.
Cache kan door de browser worden gewist.
```

---

## 10. Model Registry

### 10.1 TypeScript registry

```ts
export type ModelPurpose =
  | 'ner_detection'
  | 'education_context_detection'
  | 'contextual_generalization'
  | 'draft_repair';

export type ModelRuntime = 'transformers.js' | 'webllm';

export type ModelFailPolicy =
  | 'fail_closed'
  | 'degrade_no_export'
  | 'fallback_to_rule_generalization';

export interface PrivacyModelRegistryEntry {
  id: string;
  version: string;
  runtime: ModelRuntime;
  task: string;
  purpose: ModelPurpose;
  requiredForActions: IntendedAction[];
  devicePreference: Array<'webgpu' | 'wasm'>;
  failPolicy: ModelFailPolicy;
  source: 'huggingface' | 'mlc' | 'internal_mirror';
  expectedSha256: string;
  expectedSizeBytes?: number;
  modelCardUrl?: string;
  notes?: string;
}

export const PRIVACY_MODEL_REGISTRY: Record<string, PrivacyModelRegistryEntry> = {
  slmNer: {
    id: 'jdp8/wikineural-multilingual-ner',
    version: 'pinned-v2',
    runtime: 'transformers.js',
    task: 'token-classification',
    purpose: 'ner_detection',
    requiredForActions: [
      'copy',
      'save_local',
      'export_file',
      'print',
      'share',
      'send_external_ai',
    ],
    devicePreference: ['webgpu', 'wasm'],
    failPolicy: 'fail_closed',
    source: 'huggingface',
    expectedSha256: 'REPLACE_WITH_PINNED_SHA256_BEFORE_PRODUCTION',
    notes: 'Productie vereist hashcontrole of eigen mirror.',
  },

  educationContext: {
    id: 'pim-education-privacy-context-v2',
    version: 'v2.0.0',
    runtime: 'transformers.js',
    task: 'text-classification',
    purpose: 'education_context_detection',
    requiredForActions: [
      'copy',
      'save_local',
      'export_file',
      'print',
      'share',
      'send_external_ai',
    ],
    devicePreference: ['webgpu', 'wasm'],
    failPolicy: 'degrade_no_export',
    source: 'internal_mirror',
    expectedSha256: 'REPLACE_WITH_PINNED_SHA256_BEFORE_PRODUCTION',
  },

  contextualRewrite: {
    id: 'mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    version: 'pinned-v2',
    runtime: 'webllm',
    task: 'text-generation',
    purpose: 'contextual_generalization',
    requiredForActions: [],
    devicePreference: ['webgpu'],
    failPolicy: 'fallback_to_rule_generalization',
    source: 'mlc',
    expectedSha256: 'REPLACE_WITH_PINNED_SHA256_BEFORE_PRODUCTION',
  },
};
```

### 10.2 Registry-regel

Voor productie geldt:

```txt
Geen lege expectedSha256.
Geen wildcard modelversie.
Geen onbekende bron.
Geen export bij registry mismatch.
Geen externe AI bij registry mismatch.
```

---

## 11. Modelintegriteit

### 11.1 Statusmodel

```ts
export type ModelLoadStatus =
  | 'not_loaded'
  | 'loading'
  | 'loaded'
  | 'failed'
  | 'degraded'
  | 'hash_mismatch'
  | 'unverified';

export interface ModelIntegrityRecord {
  modelKey: string;
  modelId: string;
  version: string;
  runtime: ModelRuntime;
  task: string;
  device: 'webgpu' | 'wasm' | 'cpu' | 'unknown';
  status: ModelLoadStatus;
  expectedSha256: string;
  actualSha256?: string;
  source: string;
  loadedAt?: string;
  requiredForActions: IntendedAction[];
  failPolicy: ModelFailPolicy;
  error?: string;
}
```

### 11.2 Model Gate

```ts
export function assertModelGate(params: {
  records: ModelIntegrityRecord[];
  intendedAction: IntendedAction;
}): void {
  const { records, intendedAction } = params;

  for (const record of records) {
    if (!record.requiredForActions.includes(intendedAction)) continue;

    const hashConfigured =
      record.expectedSha256 &&
      !record.expectedSha256.includes('REPLACE_WITH_PINNED_SHA256');

    if (!hashConfigured) {
      throw new Error(`Model gate blocked ${intendedAction}: missing pinned hash for ${record.modelId}.`);
    }

    if (record.status !== 'loaded') {
      throw new Error(`Model gate blocked ${intendedAction}: ${record.modelId} is ${record.status}.`);
    }

    if (record.actualSha256 && record.actualSha256 !== record.expectedSha256) {
      throw new Error(`Model gate blocked ${intendedAction}: hash mismatch for ${record.modelId}.`);
    }
  }
}
```

### 11.3 Gedegradeerde modus

Als het onderwijscontextmodel ontbreekt:

```txt
anonymous display: toegestaan met waarschuwing
anonymous copy: block
anonymous export_file: block
anonymous send_external_ai: block
pseudonymous display: toegestaan met waarschuwing
pseudonymous restore: lokaal toegestaan als mapping klopt
pseudonymous export_file: block
pseudonymous send_external_ai: block
```

---

## 12. Model fetch, cache en CSP

### 12.1 Fetch-strategie

Productievolgorde:

```txt
1. eigen mirror met pinned artifacts
2. hashcontrole
3. browsercache
4. offline hergebruik na verificatie
```

Niet toegestaan in productie:

```txt
model downloaden zonder hashcontrole
model laden vanaf willekeurige URL
wildcard connect-src
fallback naar extern model zonder PIM-beleid
```

### 12.2 CSP

Minimale CSP:

```txt
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  connect-src 'self' https://models.example.edu;
  img-src 'self' data:;
  style-src 'self' 'unsafe-inline';
  worker-src 'self';
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'none';
  form-action 'self';
```

Voor development mogen Hugging Face en MLC tijdelijk worden toegevoegd. Productie gebruikt bij voorkeur een eigen mirror.

### 12.3 Runtime hardening

In productie:

```txt
geen analytics op tekstvelden
geen session replay
geen remote console logging
geen crash reports met payload
geen WebSocket voor tekstpayload
geen navigator.sendBeacon met payload
geen onbewaakte fetch/XHR-routes
```

---

## 13. Repositorystructuur

```txt
eai-oai-privacy/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   ├── privacy.config.ts
│   │   │   ├── modelRegistry.ts
│   │   │   ├── modelIntegrity.ts
│   │   │   ├── detectRules.ts
│   │   │   ├── browserSlmDetector.ts
│   │   │   ├── mergeDetections.ts
│   │   │   ├── anonymize.ts
│   │   │   ├── pseudonymize.ts
│   │   │   ├── secureMapping.ts
│   │   │   ├── risk.ts
│   │   │   ├── contextualGeneralization.ts
│   │   │   ├── browserLlmRewrite.ts
│   │   │   ├── draftCheckGuard.ts
│   │   │   ├── repairAnonymousDraft.ts
│   │   │   ├── pimPolicy.ts
│   │   │   ├── productionEgressGuard.ts
│   │   │   ├── restoreGuard.ts
│   │   │   ├── abuseDetection.ts
│   │   │   ├── reviewQueue.ts
│   │   │   ├── differentialPrivacy.ts
│   │   │   ├── minimalAudit.ts
│   │   │   ├── runtimeHardening.ts
│   │   │   ├── hash.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   │   ├── pimPolicy.test.ts
│   │   │   ├── draftGuard.test.ts
│   │   │   ├── egressGuard.test.ts
│   │   │   ├── mapping.test.ts
│   │   │   ├── modelGate.test.ts
│   │   │   ├── privacyProperties.test.ts
│   │   │   └── fixtures.ts
│   │   └── package.json
│   ├── ui/
│   │   ├── PrivacyModeToggle.tsx
│   │   ├── BrowserPrivacyLoadingIndicator.tsx
│   │   ├── DraftSafetyBadge.tsx
│   │   └── PimDecisionPanel.tsx
│   └── browser-workbench/
│       ├── index.html
│       ├── src/
│       │   ├── App.tsx
│       │   └── main.tsx
│       └── package.json
├── docs/
│   └── Project-PIM-bronbestand-v2.md
├── .github/
│   └── workflows/
│       └── ci.yml
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── README.md
└── LICENSE
```

Belangrijk:

```txt
Geen geheugenpackage als privacylaag.
PIM zit in core als TypeScript-code.
```

---

# DEEL A: TypeScript core

## 14. types.ts

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

export type DraftStatus =
  | 'draft_unchecked'
  | 'draft_blocked'
  | 'draft_repair_needed'
  | 'draft_certified_anonymous'
  | 'draft_certified_pseudonymous';

export type DetectionSource = 'rule' | 'slm_ner' | 'slm_education_context' | 'draft_guard';

export type DirectPiiType =
  | 'name_like'
  | 'email'
  | 'phone'
  | 'address'
  | 'postal_address'
  | 'student_id'
  | 'staff_id'
  | 'national_id_like'
  | 'iban'
  | 'ip_address'
  | 'personal_url'
  | 'date_of_birth'
  | 'exact_date'
  | 'school_name'
  | 'class_code'
  | 'location';

export type ContextualPiiType =
  | 'small_group_risk'
  | 'unique_role_risk'
  | 'support_need_context'
  | 'health_context'
  | 'family_context'
  | 'migration_context'
  | 'performance_context'
  | 'behavioral_incident'
  | 'safeguarding_context'
  | 'temporal_specificity'
  | 'location_specificity'
  | 'school_specificity'
  | 'rare_combination_risk';

export interface DetectionSpan {
  start: number;
  end: number;
  label: DirectPiiType | ContextualPiiType;
  source: DetectionSource;
  confidence: number;
  replacementHint?: string;
}

export interface PrivacySignals {
  directPii: Partial<Record<DirectPiiType, boolean>>;
  contextualPii: Partial<Record<ContextualPiiType, boolean | 'low' | 'medium' | 'high'>>;
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
    educationContextVerified: boolean;
    rewriteModelVerified: boolean;
  };
  mappingState: 'none' | 'local_only' | 'encrypted_local' | 'unsafe_present';
}

export interface MappingEntry {
  token: string;
  original: string;
  piiType: DirectPiiType | ContextualPiiType;
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
}

export type PimDecisionValue = 'allow' | 'allow_with_warning' | 'block';

export interface PimDecision {
  decision: PimDecisionValue;
  action: IntendedAction;
  mode: PrivacyMode;
  ruleId: string;
  reasonCode: string;
  severity: 'info' | 'warning' | 'critical';
  policyVersion: string;
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

Belangrijke wijziging:

```txt
ProcessResult bevat nooit MappingEntry[].
Alleen een MappingHandle mag terugkomen.
```

---

## 15. privacy.config.ts

```ts
export const PRIVACY_POLICY_VERSION = 'project-pim-v2.0.0';

export const PRIVACY_THRESHOLDS = {
  anonymousExportMaxRisk: 0.25,
  anonymousExternalAiMaxRisk: 0.18,
  anonymousCopyMaxRisk: 0.3,
  reviewRequiredRisk: 0.45,
  blockRisk: 0.7,
  slmUncertaintyRiskBoost: 0.15,
  smallGroupRiskBoost: 0.2,
  specialCategoryRiskBoost: 0.25,
  rareCombinationRiskBoost: 0.25,
} as const;

export const TOKEN_PREFIXES = [
  'STUDENT',
  'TEACHER',
  'PARENT',
  'SCHOOL',
  'CLASS',
  'LOCATION',
  'DATE',
  'SUPPORT_NEED',
  'INCIDENT',
] as const;

export const BLOCKED_ACTIONS_ALWAYS = ['debug_log'] as const;

export const PSEUDONYMOUS_BLOCKED_EGRESS_ACTIONS = [
  'copy',
  'export_file',
  'print',
  'share',
  'send_external_ai',
] as const;
```

---

## 16. detectRules.ts

```ts
import type { DetectionSpan, DirectPiiType, ContextualPiiType } from './types';

interface RulePattern {
  label: DirectPiiType | ContextualPiiType;
  regex: RegExp;
  confidence: number;
  replacementHint?: string;
}

const DIRECT_PII_PATTERNS: RulePattern[] = [
  {
    label: 'email',
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    confidence: 0.99,
    replacementHint: 'EMAIL',
  },
  {
    label: 'phone',
    regex: /\b(?:\+31|0031|0)\s?6[\s-]?\d{8}\b|\b(?:\+31|0031|0)\s?\d{2,3}[\s-]?\d{6,7}\b/g,
    confidence: 0.95,
    replacementHint: 'PHONE',
  },
  {
    label: 'postal_address',
    regex: /\b[1-9][0-9]{3}\s?[A-Z]{2}\s*(?:\d+[A-Z]?)?\b/g,
    confidence: 0.9,
    replacementHint: 'ADDRESS',
  },
  {
    label: 'iban',
    regex: /\bNL\d{2}\s?[A-Z]{4}\s?\d{4}\s?\d{4}\s?\d{2}\b/gi,
    confidence: 0.99,
    replacementHint: 'IBAN',
  },
  {
    label: 'ip_address',
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    confidence: 0.8,
    replacementHint: 'IP',
  },
  {
    label: 'student_id',
    regex: /\b(?:leerlingnummer|studentnummer|lnr|sid)[:\s-]*[A-Z0-9-]{4,}\b/gi,
    confidence: 0.95,
    replacementHint: 'STUDENT_ID',
  },
  {
    label: 'national_id_like',
    regex: /\b(?:bsn|burgerservicenummer|persoonsnummer)[:\s-]*(?:\d[\s-]?){8,9}\b/gi,
    confidence: 0.95,
    replacementHint: 'NATIONAL_ID',
  },
  {
    label: 'date_of_birth',
    regex: /\b(?:geboren op|geboortedatum|dob)[:\s-]*(?:\d{1,2}[-/ ]\d{1,2}[-/ ]\d{2,4}|\d{1,2}\s+(?:januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+\d{4})\b/gi,
    confidence: 0.95,
    replacementHint: 'DATE_OF_BIRTH',
  },
  {
    label: 'class_code',
    regex: /\b(?:groep|klas|leerjaar)\s?[1-8][A-Z]?\b|\b[1-6]\s?(?:havo|vwo|vmbo|mavo|atheneum|gymnasium)[A-Z]?\b/gi,
    confidence: 0.75,
    replacementHint: 'CLASS',
  },
  {
    label: 'exact_date',
    regex: /\b(?:\d{1,2}[-/ ]\d{1,2}[-/ ]\d{2,4}|\d{1,2}\s+(?:januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)\s+\d{4})\b/gi,
    confidence: 0.8,
    replacementHint: 'DATE',
  },
];

const EDUCATION_CONTEXT_PATTERNS: RulePattern[] = [
  {
    label: 'support_need_context',
    regex: /\b(?:dyslexie|dyscalculie|adhd|autisme|ASS|hoogbegaafd|arrangement|extra ondersteuning|ondersteuningsbehoefte|iep|opp)\b/gi,
    confidence: 0.85,
    replacementHint: 'SUPPORT_NEED',
  },
  {
    label: 'health_context',
    regex: /\b(?:diabetes|epilepsie|medicatie|therapie|diagnose|angststoornis|depressie|ziekenhuis|psycholoog)\b/gi,
    confidence: 0.85,
    replacementHint: 'HEALTH_CONTEXT',
  },
  {
    label: 'family_context',
    regex: /\b(?:pleegzorg|voogd|scheiding|thuisloos|oudergesprek|vader|moeder|stiefouder|gezinssituatie)\b/gi,
    confidence: 0.75,
    replacementHint: 'FAMILY_CONTEXT',
  },
  {
    label: 'safeguarding_context',
    regex: /\b(?:veilig thuis|meldcode|jeugdzorg|raad voor de kinderbescherming|ondertoezichtstelling|uithuisplaatsing)\b/gi,
    confidence: 0.95,
    replacementHint: 'SAFEGUARDING_CONTEXT',
  },
  {
    label: 'behavioral_incident',
    regex: /\b(?:geschorst|schorsing|incident|vechtpartij|pesten|grensoverschrijdend|time-out|verwijdering)\b/gi,
    confidence: 0.8,
    replacementHint: 'INCIDENT',
  },
  {
    label: 'migration_context',
    regex: /\b(?:nieuwkomer|oekraïne|vluchteling|asiel|statushouder|inburgering|anderstalig|ISK)\b/gi,
    confidence: 0.75,
    replacementHint: 'MIGRATION_CONTEXT',
  },
];

export function detectWithRules(text: string): DetectionSpan[] {
  const spans: DetectionSpan[] = [];

  for (const pattern of [...DIRECT_PII_PATTERNS, ...EDUCATION_CONTEXT_PATTERNS]) {
    for (const match of text.matchAll(pattern.regex)) {
      if (match.index === undefined) continue;
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        label: pattern.label,
        source: 'rule',
        confidence: pattern.confidence,
        replacementHint: pattern.replacementHint,
      });
    }
  }

  return spans.sort((a, b) => a.start - b.start || b.end - a.end);
}
```

---

## 17. browserSlmDetector.ts

```ts
import type { DetectionSpan, PrivacySignals } from './types';

export interface SlmContextOutput {
  labels: Array<{
    label:
      | 'small_group_risk'
      | 'unique_role_risk'
      | 'support_need_context'
      | 'health_context'
      | 'family_context'
      | 'migration_context'
      | 'performance_context'
      | 'behavioral_incident'
      | 'safeguarding_context'
      | 'temporal_specificity'
      | 'location_specificity'
      | 'school_specificity'
      | 'rare_combination_risk'
      | 'safe_general_text';
    confidence: number;
    level?: 'low' | 'medium' | 'high';
  }>;
  modelId: string;
  modelVersion: string;
}

export async function detectWithBrowserSlm(text: string): Promise<{
  spans: DetectionSpan[];
  context: SlmContextOutput;
}> {
  // Implementatie gebruikt @huggingface/transformers in de browser.
  // Productieregel: geen raw tekst loggen, geen raw evidence opslaan.
  // De output bestaat uit labels, confidence en optioneel offsets.
  throw new Error('Implement browser SLM runtime.');
}

export function slmOutputToSignals(output: SlmContextOutput): Partial<PrivacySignals['contextualPii']> {
  const result: Partial<PrivacySignals['contextualPii']> = {};

  for (const item of output.labels) {
    if (item.label === 'safe_general_text') continue;
    result[item.label] = item.level ?? true;
  }

  return result;
}
```

Productieregel:

```txt
SLM-output mag geen besluitvelden bevatten.
SLM-output mag geen raw tekst in audit opnemen.
SLM-onzekerheid verhoogt risico.
```

---

## 18. mergeDetections.ts

```ts
import type { DetectionSpan } from './types';

function overlaps(a: DetectionSpan, b: DetectionSpan): boolean {
  return a.start < b.end && b.start < a.end;
}

export function mergeDetections(spans: DetectionSpan[]): DetectionSpan[] {
  const sorted = [...spans].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    if (a.end !== b.end) return b.end - a.end;
    return b.confidence - a.confidence;
  });

  const merged: DetectionSpan[] = [];

  for (const span of sorted) {
    const existing = merged.find(item => overlaps(item, span));
    if (!existing) {
      merged.push(span);
      continue;
    }

    const existingLength = existing.end - existing.start;
    const spanLength = span.end - span.start;
    const replace = span.confidence > existing.confidence || spanLength > existingLength;

    if (replace) {
      const index = merged.indexOf(existing);
      merged[index] = span;
    }
  }

  return merged.sort((a, b) => a.start - b.start);
}
```

---

## 19. risk.ts

```ts
import { PRIVACY_THRESHOLDS } from './privacy.config';
import type { DetectionSpan, PrivacySignals, RiskLevel } from './types';

const SPECIAL_CONTEXT_LABELS = new Set([
  'support_need_context',
  'health_context',
  'family_context',
  'migration_context',
  'behavioral_incident',
  'safeguarding_context',
]);

export function calculateRiskScore(params: {
  detections: DetectionSpan[];
  signals: PrivacySignals;
  slmUncertain?: boolean;
}): number {
  const { detections, signals, slmUncertain } = params;

  let score = 0;

  score += Math.min(0.35, detections.length * 0.04);

  for (const detection of detections) {
    if (SPECIAL_CONTEXT_LABELS.has(detection.label)) {
      score += PRIVACY_THRESHOLDS.specialCategoryRiskBoost;
    }
    if (detection.confidence > 0.9) score += 0.04;
  }

  if (signals.contextualPii.small_group_risk) score += PRIVACY_THRESHOLDS.smallGroupRiskBoost;
  if (signals.contextualPii.rare_combination_risk) score += PRIVACY_THRESHOLDS.rareCombinationRiskBoost;
  if (signals.contextualPii.school_specificity === 'high') score += 0.15;
  if (signals.contextualPii.location_specificity === 'high') score += 0.12;
  if (signals.contextualPii.temporal_specificity === 'high') score += 0.12;
  if (slmUncertain) score += PRIVACY_THRESHOLDS.slmUncertaintyRiskBoost;

  if (signals.outputState.containsRawPersonalData) score = Math.max(score, 0.8);
  if (signals.outputState.containsMapping) score = 1;

  return Math.max(0, Math.min(1, score));
}

export function toRiskLevel(score: number): RiskLevel {
  if (score >= PRIVACY_THRESHOLDS.blockRisk) return 'blocked';
  if (score >= PRIVACY_THRESHOLDS.reviewRequiredRisk) return 'high';
  if (score >= PRIVACY_THRESHOLDS.anonymousExportMaxRisk) return 'medium';
  return 'low';
}
```

---

## 20. secureMapping.ts

### 20.1 Mapping mag niet in gewone state

Verboden:

```txt
mapping in React useState
mapping in Redux/Zustand/plain store
mapping in localStorage als JSON
mapping in ProcessResult
mapping in PIM event
mapping in console.log
mapping in error report
```

Toegestaan:

```txt
mapping in afgesloten in-memory container
mapping persistent alleen AES-GCM encrypted
key niet naast mapping opslaan
alleen MappingHandle naar UI
```

### 20.2 TypeScript API

```ts
import type { MappingEntry, MappingHandle } from './types';

const memoryMappingStore = new Map<string, MappingEntry[]>();

export function createMappingHandle(entries: MappingEntry[]): MappingHandle {
  const id = crypto.randomUUID();
  memoryMappingStore.set(id, structuredClone(entries));
  return { id, mode: 'memory_only' };
}

export function resolveMappingHandle(handle: MappingHandle): MappingEntry[] {
  if (handle.mode !== 'memory_only') {
    throw new Error('Encrypted mapping must be decrypted through secure flow.');
  }

  const entries = memoryMappingStore.get(handle.id);
  if (!entries) throw new Error('Mapping not found or expired.');

  return structuredClone(entries);
}

export function destroyMappingHandle(handle: MappingHandle): void {
  memoryMappingStore.delete(handle.id);
}
```

### 20.3 AES-GCM persistentie

```ts
export async function encryptMapping(entries: MappingEntry[], key: CryptoKey): Promise<{
  iv: string;
  ciphertext: string;
  algorithm: 'AES-GCM';
}> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(entries));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    algorithm: 'AES-GCM',
  };
}

export async function decryptMapping(payload: {
  iv: string;
  ciphertext: string;
  algorithm: 'AES-GCM';
}, key: CryptoKey): Promise<MappingEntry[]> {
  const iv = Uint8Array.from(atob(payload.iv), char => char.charCodeAt(0));
  const data = Uint8Array.from(atob(payload.ciphertext), char => char.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return JSON.parse(new TextDecoder().decode(decrypted)) as MappingEntry[];
}
```

Productieregel:

```txt
Base64 is geen encryptie.
Hash plus base64 is geen encryptie.
Alle persistent mapping vereist AES-GCM of wordt verboden.
```

---

## 21. pseudonymize.ts

```ts
import type { DetectionSpan, MappingEntry, MappingHandle } from './types';
import { createMappingHandle } from './secureMapping';

const TOKEN_LABEL_MAP: Record<string, string> = {
  name_like: 'STUDENT',
  email: 'EMAIL',
  phone: 'PHONE',
  address: 'ADDRESS',
  postal_address: 'ADDRESS',
  student_id: 'STUDENT_ID',
  staff_id: 'STAFF_ID',
  national_id_like: 'ID',
  iban: 'IBAN',
  ip_address: 'IP',
  personal_url: 'URL',
  date_of_birth: 'DATE',
  exact_date: 'DATE',
  school_name: 'SCHOOL',
  class_code: 'CLASS',
  location: 'LOCATION',
};

export function pseudonymizeText(text: string, detections: DetectionSpan[]): {
  draft: string;
  mappingHandle: MappingHandle;
  expectedTokens: string[];
} {
  const sorted = [...detections].sort((a, b) => a.start - b.start);
  const counters = new Map<string, number>();
  const mapping: MappingEntry[] = [];
  const expectedTokens: string[] = [];
  let cursor = 0;
  let output = '';

  for (const detection of sorted) {
    if (detection.start < cursor) continue;

    const original = text.slice(detection.start, detection.end);
    const prefix = TOKEN_LABEL_MAP[detection.label] ?? detection.replacementHint ?? 'ENTITY';
    const next = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, next);
    const token = `${prefix}_${String(next).padStart(3, '0')}`;

    output += text.slice(cursor, detection.start);
    output += token;
    cursor = detection.end;

    expectedTokens.push(token);
    mapping.push({ token, original, piiType: detection.label });
  }

  output += text.slice(cursor);

  return {
    draft: output,
    mappingHandle: createMappingHandle(mapping),
    expectedTokens,
  };
}
```

Belangrijk:

```txt
Deze functie retourneert nooit mapping zelf. Een tokenlijst mag wel terugkomen, omdat die nodig is om hallucinated tokens te detecteren.
```

---

## 22. anonymize.ts

```ts
import type { DetectionSpan } from './types';

const GENERALIZATION_MAP: Record<string, string> = {
  name_like: 'een leerling',
  email: 'een contactgegeven',
  phone: 'een contactgegeven',
  address: 'een adresgegeven',
  postal_address: 'een regio',
  student_id: 'een leerlingnummer',
  staff_id: 'een medewerkerkenmerk',
  national_id_like: 'een identificatiegegeven',
  iban: 'een betalingsgegeven',
  ip_address: 'een technisch identificatiegegeven',
  personal_url: 'een persoonlijke link',
  date_of_birth: 'een geboortedatum',
  exact_date: 'een periode',
  school_name: 'een school',
  class_code: 'een klas of groep',
  location: 'een plaats',
  support_need_context: 'een ondersteuningsbehoefte',
  health_context: 'een gezondheidscontext',
  family_context: 'een thuissituatie',
  migration_context: 'een achtergrondcontext',
  behavioral_incident: 'een incident',
  safeguarding_context: 'een beschermingscontext',
};

export function anonymizeText(text: string, detections: DetectionSpan[]): string {
  const sorted = [...detections].sort((a, b) => a.start - b.start);
  let cursor = 0;
  let output = '';

  for (const detection of sorted) {
    if (detection.start < cursor) continue;
    output += text.slice(cursor, detection.start);
    output += GENERALIZATION_MAP[detection.label] ?? 'een algemeen kenmerk';
    cursor = detection.end;
  }

  output += text.slice(cursor);
  return output;
}
```

---

## 23. contextualGeneralization.ts

```ts
import type { PrivacySignals } from './types';

export function applyContextualGeneralization(text: string, signals: PrivacySignals): string {
  let output = text;

  if (signals.contextualPii.small_group_risk) {
    output = output.replace(/\b(?:groep|klas)\s?[1-8][A-Z]?\b/gi, 'een kleine groep');
    output = output.replace(/\b[1-6]\s?(?:havo|vwo|vmbo|mavo)[A-Z]?\b/gi, 'een onderwijsniveau');
  }

  if (signals.contextualPii.temporal_specificity === 'high') {
    output = output.replace(/\b(?:gisteren|vandaag|vorige week|afgelopen maandag|afgelopen dinsdag)\b/gi, 'in een recente periode');
  }

  if (signals.contextualPii.location_specificity === 'high') {
    output = output.replace(/\bin\s+[A-Z][a-z]+\b/g, 'in een regio');
  }

  if (signals.contextualPii.safeguarding_context || signals.contextualPii.health_context) {
    output = output.replace(/\b(?:hij|zij|hem|haar)\b/gi, 'de leerling');
  }

  return output;
}
```

---

## 24. browserLlmRewrite.ts

```ts
export async function rewriteAnonymousDraftLocally(params: {
  sanitizedDraft: string;
  language?: 'nl' | 'en';
}): Promise<string> {
  const { sanitizedDraft } = params;

  // Productieregels:
  // - Alleen geschoonde tekst naar browser-LLM.
  // - Geen raw input.
  // - Geen mapping.
  // - Geen externe call.
  // - Output altijd opnieuw door Draft Check Guard.

  const prompt = [
    'Herschrijf de tekst in helder Nederlands.',
    'Behoud onderwijsbetekenis.',
    'Voeg geen namen, datums, plaatsen, schoolnamen of tokens toe.',
    'Maak specifieke context algemener als dat nodig is.',
    '',
    sanitizedDraft,
  ].join('\n');

  void prompt;
  throw new Error('Implement WebLLM local rewrite.');
}
```

---

## 25. draftCheckGuard.ts

### 25.1 Doel

Draft Check Guard controleert of een concept veilig genoeg is om aan PIM voor te leggen.

Draft Check Guard beslist niet over export. De guard geeft alleen een controleresultaat.

### 25.2 Checks

Draft Check Guard controleert minimaal:

```txt
raw persoonsgegevens
mappingfragmenten
JSON mappingstructuren
tokens in anonieme modus
ontbrekende tokens in pseudonieme modus
hallucinated tokens
te specifieke schoolcontext
exacte datums in gevoelige context
kleine groep plus zorgcontext
locatie plus incident
model-output die verboden advies bevat
mode-mix
```

### 25.3 TypeScript

```ts
import type { DraftStatus, GuardResult, PrivacyMode } from './types';

const TOKEN_PATTERN = /\b(?:STUDENT|TEACHER|PARENT|SCHOOL|CLASS|LOCATION|DATE|SUPPORT_NEED|INCIDENT|EMAIL|PHONE|ADDRESS|IBAN|IP|URL)_\d{3}\b/g;
const MAPPING_PATTERN = /\b(?:original|mapping|token|ciphertext|plaintext|student_id|leerlingnummer)\b\s*[:=]/i;
const RAW_EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const RAW_PHONE_PATTERN = /\b(?:\+31|0031|0)\s?6[\s-]?\d{8}\b/;

export function runDraftCheckGuard(params: {
  draft: string;
  mode: PrivacyMode;
  expectedTokens?: string[];
  riskScore: number;
}): {
  status: DraftStatus;
  guardResults: GuardResult[];
} {
  const { draft, mode, expectedTokens = [], riskScore } = params;
  const guardResults: GuardResult[] = [];

  function block(ruleId: string, reasonCode: string): void {
    guardResults.push({
      passed: false,
      guard: 'DraftCheckGuard',
      ruleId,
      reasonCode,
      severity: 'critical',
    });
  }

  if (RAW_EMAIL_PATTERN.test(draft)) block('DCG_RAW_EMAIL', 'raw_email_detected');
  if (RAW_PHONE_PATTERN.test(draft)) block('DCG_RAW_PHONE', 'raw_phone_detected');
  if (MAPPING_PATTERN.test(draft)) block('DCG_MAPPING_PATTERN', 'mapping_like_content_detected');

  const tokens = [...draft.matchAll(TOKEN_PATTERN)].map(match => match[0]);

  if (mode === 'anonymous' && tokens.length > 0) {
    block('DCG_TOKEN_IN_ANONYMOUS', 'pseudonym_token_in_anonymous_output');
  }

  if (mode === 'pseudonymous') {
    const unknownTokens = tokens.filter(token => !expectedTokens.includes(token));
    if (unknownTokens.length > 0) {
      block('DCG_HALLUCINATED_TOKEN', 'unknown_pseudonym_token_detected');
    }
  }

  if (riskScore >= 0.7) {
    block('DCG_RISK_BLOCK', 'risk_score_too_high');
  }

  if (guardResults.some(result => !result.passed)) {
    return { status: 'draft_blocked', guardResults };
  }

  guardResults.push({
    passed: true,
    guard: 'DraftCheckGuard',
    ruleId: 'DCG_PASS',
    reasonCode: 'draft_passed',
    severity: 'info',
  });

  return {
    status: mode === 'anonymous' ? 'draft_certified_anonymous' : 'draft_certified_pseudonymous',
    guardResults,
  };
}
```

---

## 26. repairAnonymousDraft.ts

```ts
import { runDraftCheckGuard } from './draftCheckGuard';

export async function repairAnonymousDraft(params: {
  draft: string;
  riskScore: number;
  maxAttempts?: number;
  repair: (draft: string) => Promise<string>;
}): Promise<{ draft: string; repaired: boolean; blocked: boolean }> {
  const maxAttempts = params.maxAttempts ?? 2;
  let draft = params.draft;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const check = runDraftCheckGuard({
      draft,
      mode: 'anonymous',
      riskScore: params.riskScore,
    });

    if (check.status === 'draft_certified_anonymous') {
      return { draft, repaired: attempt > 0, blocked: false };
    }

    draft = await params.repair(draft);
  }

  return { draft, repaired: true, blocked: true };
}
```

---

## 27. pimPolicy.ts

### 27.1 PIM-definitie

PIM is de verplichte lokale privacybeslisser.

```txt
PIM is deterministische applicatiecode.
PIM is geen SLM-prompt.
PIM is geen LLM-prompt.
PIM slaat geen inhoud op.
PIM neemt per concrete actie een allow/block-besluit.
```

### 27.2 PIM-input

```ts
import { PRIVACY_POLICY_VERSION, PRIVACY_THRESHOLDS } from './privacy.config';
import type {
  DraftStatus,
  GuardResult,
  IntendedAction,
  PimDecision,
  PrivacyMode,
  PrivacySignals,
} from './types';

export interface PimInput {
  mode: PrivacyMode;
  action: IntendedAction;
  draftStatus: DraftStatus;
  guardResults: GuardResult[];
  signals: PrivacySignals;
  modelIntegrityPassed: boolean;
  policyVersion?: string;
}

function decision(params: {
  value: PimDecision['decision'];
  mode: PrivacyMode;
  action: IntendedAction;
  ruleId: string;
  reasonCode: string;
  severity: PimDecision['severity'];
  policyVersion?: string;
}): PimDecision {
  return {
    decision: params.value,
    mode: params.mode,
    action: params.action,
    ruleId: params.ruleId,
    reasonCode: params.reasonCode,
    severity: params.severity,
    policyVersion: params.policyVersion ?? PRIVACY_POLICY_VERSION,
    timestamp: new Date().toISOString(),
  };
}

export function evaluatePim(input: PimInput): PimDecision {
  const { mode, action, draftStatus, guardResults, signals, modelIntegrityPassed } = input;

  if (action === 'debug_log') {
    return decision({ value: 'block', mode, action, ruleId: 'PIM_DEBUG_LOG_BLOCK', reasonCode: 'content_debug_logging_forbidden', severity: 'critical' });
  }

  if (!modelIntegrityPassed && action !== 'display') {
    return decision({ value: 'block', mode, action, ruleId: 'PIM_MODEL_INTEGRITY_BLOCK', reasonCode: 'model_integrity_not_verified', severity: 'critical' });
  }

  if (guardResults.some(result => !result.passed)) {
    return decision({ value: 'block', mode, action, ruleId: 'PIM_GUARD_FAILURE_BLOCK', reasonCode: 'guard_result_failed', severity: 'critical' });
  }

  if (signals.outputState.containsMapping || signals.mappingState === 'unsafe_present') {
    return decision({ value: 'block', mode, action, ruleId: 'PIM_MAPPING_BLOCK', reasonCode: 'mapping_present_or_exposed', severity: 'critical' });
  }

  if (signals.outputState.containsRawPersonalData) {
    return decision({ value: 'block', mode, action, ruleId: 'PIM_RAW_PII_BLOCK', reasonCode: 'raw_personal_data_detected', severity: 'critical' });
  }

  if (draftStatus === 'draft_unchecked' || draftStatus === 'draft_repair_needed' || draftStatus === 'draft_blocked') {
    return decision({ value: 'block', mode, action, ruleId: 'PIM_DRAFT_NOT_CERTIFIED', reasonCode: 'draft_not_certified', severity: 'critical' });
  }

  if (mode === 'anonymous' && draftStatus !== 'draft_certified_anonymous') {
    return decision({ value: 'block', mode, action, ruleId: 'PIM_MODE_STATUS_MISMATCH', reasonCode: 'anonymous_mode_requires_anonymous_certification', severity: 'critical' });
  }

  if (mode === 'pseudonymous' && draftStatus !== 'draft_certified_pseudonymous') {
    return decision({ value: 'block', mode, action, ruleId: 'PIM_MODE_STATUS_MISMATCH', reasonCode: 'pseudonymous_mode_requires_pseudonymous_certification', severity: 'critical' });
  }

  if (mode === 'pseudonymous') {
    if (action === 'send_external_ai') {
      return decision({ value: 'block', mode, action, ruleId: 'PIM_PSEUDONYM_EXTERNAL_AI_BLOCK', reasonCode: 'pseudonymous_external_ai_forbidden', severity: 'critical' });
    }

    if (action === 'export_file' || action === 'copy' || action === 'print' || action === 'share') {
      return decision({ value: 'block', mode, action, ruleId: 'PIM_PSEUDONYM_EGRESS_BLOCK', reasonCode: 'pseudonymous_egress_forbidden', severity: 'critical' });
    }

    if (action === 'save_local') {
      if (signals.mappingState !== 'encrypted_local') {
        return decision({ value: 'block', mode, action, ruleId: 'PIM_PSEUDONYM_SAVE_REQUIRES_ENCRYPTION', reasonCode: 'encrypted_local_mapping_required', severity: 'critical' });
      }
      return decision({ value: 'allow_with_warning', mode, action, ruleId: 'PIM_PSEUDONYM_SAVE_LOCAL_ONLY', reasonCode: 'encrypted_local_save_only', severity: 'warning' });
    }

    if (action === 'display' || action === 'restore') {
      return decision({ value: 'allow_with_warning', mode, action, ruleId: 'PIM_PSEUDONYM_LOCAL_ALLOW', reasonCode: 'local_pseudonymous_action_only', severity: 'warning' });
    }
  }

  if (mode === 'anonymous') {
    if (signals.outputState.containsPseudonymTokens) {
      return decision({ value: 'block', mode, action, ruleId: 'PIM_TOKEN_IN_ANONYMOUS_BLOCK', reasonCode: 'pseudonym_token_in_anonymous_output', severity: 'critical' });
    }

    if (action === 'restore') {
      return decision({ value: 'block', mode, action, ruleId: 'PIM_ANONYMOUS_RESTORE_BLOCK', reasonCode: 'anonymous_mode_has_no_mapping', severity: 'critical' });
    }

    if (action === 'send_external_ai' && signals.outputState.riskScore > PRIVACY_THRESHOLDS.anonymousExternalAiMaxRisk) {
      return decision({ value: 'block', mode, action, ruleId: 'PIM_EXTERNAL_AI_RISK_BLOCK', reasonCode: 'anonymous_external_ai_risk_too_high', severity: 'critical' });
    }

    if (action === 'export_file' && signals.outputState.riskScore > PRIVACY_THRESHOLDS.anonymousExportMaxRisk) {
      return decision({ value: 'block', mode, action, ruleId: 'PIM_EXPORT_RISK_BLOCK', reasonCode: 'anonymous_export_risk_too_high', severity: 'critical' });
    }

    if ((action === 'copy' || action === 'print' || action === 'share') && signals.outputState.riskScore > PRIVACY_THRESHOLDS.anonymousCopyMaxRisk) {
      return decision({ value: 'block', mode, action, ruleId: 'PIM_COPY_SHARE_RISK_BLOCK', reasonCode: 'anonymous_copy_share_risk_too_high', severity: 'critical' });
    }

    if (signals.contextualPii.safeguarding_context || signals.contextualPii.health_context) {
      if (action !== 'display' && action !== 'save_local') {
        return decision({ value: 'block', mode, action, ruleId: 'PIM_SPECIAL_CONTEXT_EGRESS_BLOCK', reasonCode: 'special_context_requires_review', severity: 'critical' });
      }
      return decision({ value: 'allow_with_warning', mode, action, ruleId: 'PIM_SPECIAL_CONTEXT_LOCAL_WARNING', reasonCode: 'special_context_local_only_warning', severity: 'warning' });
    }

    return decision({ value: 'allow', mode, action, ruleId: 'PIM_ANONYMOUS_ALLOW', reasonCode: 'anonymous_action_allowed', severity: 'info' });
  }

  return decision({ value: 'block', mode, action, ruleId: 'PIM_DEFAULT_BLOCK', reasonCode: 'no_allow_rule_matched', severity: 'critical' });
}
```

### 27.3 PIM-regel

Geen enkele uitvoeractie mag doorgaan zonder PIM-besluit.

```txt
Geen PIM-besluit = block.
PIM-error = block.
PIM-timeout = block.
PIM-onbekende action = block.
PIM-onbekende mode = block.
```

---

## 28. productionEgressGuard.ts

### 28.1 Doel

Production Egress Guard is de technische uitvoerpoort. Deze guard beslist niet zelfstandig. Hij handhaaft het PIM-besluit.

### 28.2 TypeScript

```ts
import type { IntendedAction, PimDecision } from './types';

export function enforceProductionEgress(params: {
  action: IntendedAction;
  pimDecision: PimDecision;
  payload: string;
}): string {
  const { action, pimDecision, payload } = params;

  if (pimDecision.action !== action) {
    throw new Error(`Egress blocked: PIM decision action mismatch. Expected ${action}, got ${pimDecision.action}.`);
  }

  if (pimDecision.decision === 'block') {
    throw new Error(`Egress blocked by PIM: ${pimDecision.ruleId} ${pimDecision.reasonCode}`);
  }

  if (action === 'debug_log') {
    throw new Error('Egress blocked: debug logging content is forbidden.');
  }

  if (/\b(?:original|mapping|token)\b\s*[:=]/i.test(payload)) {
    throw new Error('Egress blocked: mapping-like payload detected.');
  }

  return payload;
}
```

### 28.3 Externe AI

Voor `send_external_ai` gelden extra regels:

```txt
alleen anonymous mode
alleen draft_certified_anonymous
geen tokens
geen raw PII
geen mapping
riskScore onder anonymousExternalAiMaxRisk
modelintegriteit verified
PIM allow
```

---

## 29. restoreGuard.ts

```ts
import type { MappingHandle, PimDecision } from './types';
import { resolveMappingHandle } from './secureMapping';

export function restorePseudonyms(params: {
  pseudonymousDraft: string;
  mappingHandle: MappingHandle;
  pimDecision: PimDecision;
}): string {
  if (params.pimDecision.action !== 'restore' || params.pimDecision.decision === 'block') {
    throw new Error('Restore blocked: missing PIM allow.');
  }

  const mapping = resolveMappingHandle(params.mappingHandle);
  let output = params.pseudonymousDraft;

  for (const entry of mapping) {
    output = output.replaceAll(entry.token, entry.original);
  }

  return output;
}
```

Regels:

```txt
restore alleen lokaal
restore nooit exporteren zonder nieuwe PIM-actie
restore nooit naar externe AI
herstelde tekst nooit loggen
herstelde tekst nooit in audit
```

---

## 30. processEducationalText.ts

```ts
import type { PrivacyMode, ProcessResult, PrivacySignals } from './types';
import { detectWithRules } from './detectRules';
import { detectWithBrowserSlm, slmOutputToSignals } from './browserSlmDetector';
import { mergeDetections } from './mergeDetections';
import { anonymizeText } from './anonymize';
import { pseudonymizeText } from './pseudonymize';
import { applyContextualGeneralization } from './contextualGeneralization';
import { calculateRiskScore, toRiskLevel } from './risk';
import { runDraftCheckGuard } from './draftCheckGuard';
import { PRIVACY_POLICY_VERSION } from './privacy.config';

function buildBaseSignals(mode: PrivacyMode): PrivacySignals {
  return {
    directPii: {},
    contextualPii: {},
    outputState: {
      containsRawPersonalData: false,
      containsPseudonymTokens: false,
      containsMapping: false,
      anonymizationMode: mode,
      riskScore: 0,
      riskLevel: 'low',
    },
    modelState: {
      nerVerified: false,
      educationContextVerified: false,
      rewriteModelVerified: false,
    },
    mappingState: 'none',
  };
}

export async function processEducationalText(params: {
  rawText: string;
  mode: PrivacyMode;
}): Promise<ProcessResult> {
  const { rawText, mode } = params;

  if (!rawText.trim()) {
    throw new Error('Input is empty.');
  }

  const ruleDetections = detectWithRules(rawText);

  let slmDetections = [] as Awaited<ReturnType<typeof detectWithBrowserSlm>>['spans'];
  let slmContext: Awaited<ReturnType<typeof detectWithBrowserSlm>>['context'] | undefined;

  try {
    const slm = await detectWithBrowserSlm(rawText);
    slmDetections = slm.spans;
    slmContext = slm.context;
  } catch {
    // Fail closed wordt later via modelState en PIM afgedwongen.
  }

  const detections = mergeDetections([...ruleDetections, ...slmDetections]);
  const signals = buildBaseSignals(mode);

  const directLabels = new Set([
    'name_like',
    'email',
    'phone',
    'address',
    'postal_address',
    'student_id',
    'staff_id',
    'national_id_like',
    'iban',
    'ip_address',
    'personal_url',
    'date_of_birth',
    'exact_date',
    'school_name',
    'class_code',
    'location',
  ]);

  for (const detection of detections) {
    if (directLabels.has(detection.label)) {
      signals.directPii[detection.label as keyof typeof signals.directPii] = true;
    } else {
      signals.contextualPii[detection.label as keyof typeof signals.contextualPii] = true;
    }
  }

  if (slmContext) {
    Object.assign(signals.contextualPii, slmOutputToSignals(slmContext));
    signals.modelState.educationContextVerified = true;
  }

  let draft: string;
  let mappingHandle = undefined;
  let expectedTokens: string[] = [];

  if (mode === 'anonymous') {
    draft = anonymizeText(rawText, detections);
    draft = applyContextualGeneralization(draft, signals);
    signals.mappingState = 'none';
  } else {
    const result = pseudonymizeText(rawText, detections);
    draft = result.draft;
    mappingHandle = result.mappingHandle;
    expectedTokens = result.expectedTokens;
    signals.mappingState = 'local_only';
  }

  const riskScore = calculateRiskScore({ detections, signals, slmUncertain: !slmContext });
  const riskLevel = toRiskLevel(riskScore);
  signals.outputState.riskScore = riskScore;
  signals.outputState.riskLevel = riskLevel;
  signals.outputState.containsPseudonymTokens = /\b[A-Z_]+_\d{3}\b/.test(draft);

  const draftCheck = runDraftCheckGuard({
    draft,
    mode,
    expectedTokens,
    riskScore,
  });

  return {
    mode,
    draft,
    draftStatus: draftCheck.status,
    riskScore,
    riskLevel,
    signals,
    detections,
    mappingHandle,
    policyVersion: PRIVACY_POLICY_VERSION,
  };
}
```

Productie-opmerking:

```txt
Deze orchestratie toont de contracten. Implementatie moet model integrity en tokenverwachtingen correct koppelen.
```

---

## 31. minimalAudit.ts

```ts
import type { PimDecision } from './types';

export interface MinimalAuditEvent {
  eventType: 'pim_decision' | 'guard_result' | 'model_gate' | 'egress_attempt';
  action?: string;
  mode?: string;
  decision?: string;
  ruleId?: string;
  reasonCode?: string;
  severity?: string;
  riskLevel?: string;
  policyVersion: string;
  modelVersion?: string;
  timestamp: string;
}

export function pimDecisionToAuditEvent(decision: PimDecision): MinimalAuditEvent {
  return {
    eventType: 'pim_decision',
    action: decision.action,
    mode: decision.mode,
    decision: decision.decision,
    ruleId: decision.ruleId,
    reasonCode: decision.reasonCode,
    severity: decision.severity,
    policyVersion: decision.policyVersion,
    modelVersion: decision.modelVersion,
    timestamp: decision.timestamp,
  };
}
```

Audit mag nooit bevatten:

```txt
raw input
volledige draft
mapping
tokens met herleidbare betekenis
prompt
herstelde tekst
embedding
semantische vector
screenshot
clipboardinhoud
```

---

## 32. abuseDetection.ts

```ts
export function detectAbuseAttempt(text: string): boolean {
  const patterns = [
    /toon\s+(de\s+)?mapping/i,
    /geef\s+(de\s+)?originele\s+namen/i,
    /zet\s+privacy\s+uit/i,
    /negeer\s+(de\s+)?guard/i,
    /exporteer\s+toch/i,
    /stuur\s+naar\s+chatgpt/i,
    /log\s+(de\s+)?ruwe\s+tekst/i,
    /debug\s+met\s+input/i,
  ];

  return patterns.some(pattern => pattern.test(text));
}
```

Bij abuse:

```txt
PIM verhoogt naar block voor egress
alleen veilige waarschuwing tonen
geen inhoud loggen
```

---

## 33. reviewQueue.ts

```ts
import type { RiskLevel } from './types';

export interface ReviewQueueItem {
  id: string;
  mode: 'anonymous' | 'pseudonymous';
  riskLevel: RiskLevel;
  reasonCodes: string[];
  createdAt: string;
  nonIdentifyingSummary: string;
}

export function createReviewQueueItem(params: Omit<ReviewQueueItem, 'id' | 'createdAt'>): ReviewQueueItem {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...params,
  };
}
```

Review queue bevat geen raw tekst en geen mapping.

---

## 34. differentialPrivacy.ts

Differential privacy is alleen bedoeld voor aggregaten.

Niet gebruiken voor individuele tekst:

```txt
geen DP claim op één leerlingtekst
geen DP claim op één casus
geen DP als vervanging voor anonimisering
```

Wel gebruiken voor:

```txt
aantal geblokkeerde exports per maand
aantal risico-categorieën per schoolbestuur
gemiddelde risicoscore per grote groep
```

```ts
export function laplaceNoise(scale: number): number {
  const u = Math.random() - 0.5;
  return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

export function differentiallyPrivateCount(count: number, epsilon: number): number {
  if (epsilon <= 0) throw new Error('epsilon must be positive');
  return count + laplaceNoise(1 / epsilon);
}
```

---

# DEEL B: PIM-beleid

## 35. Waarom PIM geen leergeheugen is

Project PIM kiest bewust voor privacybewaking in plaats van profielopbouw. In onderwijssoftware bestaan ook geheugenlagen die analyses, redeneringen, vectors, adviezen of leerprofielen bewaren. Dat kan nuttig zijn voor leeranalyse, maar het past niet bij een privacy-first anonymizer.

PIM is smaller en strenger:

```txt
Een leergeheugen onthoudt.
PIM beslist.

Een leergeheugen bouwt profielen.
PIM bouwt geen profielen.

Een leergeheugen kan context, redenering, vectoren en advies bevatten.
PIM bevat alleen policyregels en geeft beslismetadata terug.

Een leergeheugen is geschikt voor analyse en opvolging.
PIM is geschikt voor privacy-egresscontrole.
```

PIM gebruikt wel sterke controlepatronen:

```txt
flags
severity
rule IDs
fallback
blokkade bij kritieke risico's
transparante reden voor blokkade
scheiding tussen interne controle en gebruikersweergave
```

PIM neemt niet over:

```txt
langdurige profielen
contextopslag
CoT-opslag
semantische vectoren
embeddings
lim_id reconnect
centrale vectorstore
pseudonimisering via naam, score en timestamp
```

## 36. PIM action matrix

| Mode | Action | Default | Reden |
|---|---|---:|---|
| anonymous | display | allow | Alleen na certified draft |
| anonymous | copy | allow bij laag risico | Egress, dus drempel |
| anonymous | save_local | allow bij laag/middel risico | Geen raw of mapping |
| anonymous | export_file | allow bij laag risico | Productiegate vereist |
| anonymous | send_external_ai | allow bij zeer laag risico | Strengste drempel |
| anonymous | print | allow bij laag risico | Egress |
| anonymous | share | allow bij laag risico | Egress |
| anonymous | restore | block | Geen mapping |
| anonymous | debug_log | block | Geen inhoud loggen |
| pseudonymous | display | allow_with_warning | Lokaal |
| pseudonymous | restore | allow_with_warning | Alleen lokaal |
| pseudonymous | save_local | allow_with_warning | Alleen encrypted package |
| pseudonymous | copy | block | Egress |
| pseudonymous | export_file | block | Pseudoniem blijft persoonsgegevens |
| pseudonymous | send_external_ai | block | Altijd verboden |
| pseudonymous | print | block | Egress |
| pseudonymous | share | block | Egress |
| pseudonymous | debug_log | block | Geen inhoud loggen |

## 37. PIM flags

PIM kent minimaal:

```txt
PIM_DEBUG_LOG_BLOCK
PIM_MODEL_INTEGRITY_BLOCK
PIM_GUARD_FAILURE_BLOCK
PIM_MAPPING_BLOCK
PIM_RAW_PII_BLOCK
PIM_DRAFT_NOT_CERTIFIED
PIM_MODE_STATUS_MISMATCH
PIM_PSEUDONYM_EXTERNAL_AI_BLOCK
PIM_PSEUDONYM_EGRESS_BLOCK
PIM_PSEUDONYM_SAVE_REQUIRES_ENCRYPTION
PIM_TOKEN_IN_ANONYMOUS_BLOCK
PIM_ANONYMOUS_RESTORE_BLOCK
PIM_EXTERNAL_AI_RISK_BLOCK
PIM_EXPORT_RISK_BLOCK
PIM_COPY_SHARE_RISK_BLOCK
PIM_SPECIAL_CONTEXT_EGRESS_BLOCK
PIM_DEFAULT_BLOCK
```

Elke flag heeft:

```txt
ruleId
reasonCode
severity
mode
action
policyVersion
timestamp
```

Geen enkele flag bevat inhoud.

---

# DEEL C: UI en UX

## 38. UI-principes

De UI moet de twee modi duidelijk scheiden.

### 38.1 Anonieme modus

Label:

```txt
Niet-omkeerbaar anoniem
```

Uitleg:

```txt
Deze modus probeert tekst zo te herschrijven dat terugzetten niet mogelijk is. Unieke onderwijscontext kan nog steeds risico geven. Export kan worden geblokkeerd.
```

### 38.2 Pseudonieme modus

Label:

```txt
Omkeerbaar pseudoniem, lokaal
```

Uitleg:

```txt
Deze modus vervangt herkenbare gegevens door tokens. Terugzetten kan alleen lokaal met de mapping. Deze output mag niet naar externe AI en niet als exportbestand worden gedeeld.
```

### 38.3 PIM Decision Panel

UI mag tonen:

```txt
allow/block
reden in gewone taal
risk level
actie
mode
policy version
```

UI mag niet tonen:

```txt
mapping
raw input in foutmelding
volledige PIM-input
modelprompt
verborgen guarddetails met inhoud
```

---

## 39. React-regels

Verboden:

```txt
const [mapping, setMapping] = useState(...)
console.log(result)
JSON.stringify(result) in UI als debug
localStorage.setItem('result', JSON.stringify(result))
```

Toegestaan:

```txt
const [draft, setDraft] = useState(result.draft)
const [decision, setDecision] = useState(pimDecision)
const mappingHandleRef = useRef(result.mappingHandle)
```

Mappinghandle mag in een ref, maar mapping zelf niet.

---

# DEEL D: Runtime hardening

## 40. Netwerkcontrole

Alle netwerkfuncties moeten centraal bewaakt worden:

```txt
fetch
XMLHttpRequest
navigator.sendBeacon
WebSocket
EventSource
```

Regel:

```txt
Geen payload met raw input, mapping, pseudonieme output of herstelde tekst mag zonder PIM allow naar buiten.
```

Er is geen PIM allow voor pseudonieme externe AI of pseudonieme export.

## 41. Loggingcontrole

Verboden:

```txt
console.log(rawText)
console.log(mapping)
console.log(ProcessResult)
console.error(errorWithPayload)
remoteLogger.capture(payload)
```

Fouten worden gesaneerd:

```ts
export function sanitizeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message.slice(0, 200) };
  }
  return { name: 'UnknownError', message: 'Unknown error' };
}
```

---

# DEEL E: Tests en bewijs

## 42. Validatieset

Minimale validatieset:

```ts
export const PRIVACY_FIXTURES = [
  {
    id: 'direct_email_phone',
    text: 'Mail Lisa op lisa.jansen@example.nl of bel 0612345678.',
    expected: ['email', 'phone'],
  },
  {
    id: 'small_group_support',
    text: 'De enige leerling met dyscalculie in groep 7B had vorige week een incident.',
    expected: ['support_need_context', 'class_code', 'behavioral_incident'],
  },
  {
    id: 'family_unique_role',
    text: 'De zoon van de conciërge uit klas 2 havo heeft extra begeleiding nodig.',
    expected: ['family_context', 'unique_role_risk', 'class_code'],
  },
  {
    id: 'safeguarding',
    text: 'Er is contact geweest met Veilig Thuis rond een leerling uit groep 6.',
    expected: ['safeguarding_context', 'class_code'],
  },
  {
    id: 'migration_context',
    text: 'Een nieuwkomer uit Oekraïne is vorige maand gestart in de klas.',
    expected: ['migration_context', 'temporal_specificity'],
  },
];
```

## 43. PIM unit tests

```ts
import { describe, expect, it } from 'vitest';
import { evaluatePim } from '../src/pimPolicy';

const baseSignals = {
  directPii: {},
  contextualPii: {},
  outputState: {
    containsRawPersonalData: false,
    containsPseudonymTokens: false,
    containsMapping: false,
    anonymizationMode: 'anonymous' as const,
    riskScore: 0.1,
    riskLevel: 'low' as const,
  },
  modelState: {
    nerVerified: true,
    educationContextVerified: true,
    rewriteModelVerified: true,
  },
  mappingState: 'none' as const,
};

const passGuard = [{ passed: true, guard: 'DraftCheckGuard', ruleId: 'DCG_PASS', reasonCode: 'draft_passed', severity: 'info' as const }];

describe('PIM policy', () => {
  it('blocks pseudonymous external AI', () => {
    const decision = evaluatePim({
      mode: 'pseudonymous',
      action: 'send_external_ai',
      draftStatus: 'draft_certified_pseudonymous',
      guardResults: passGuard,
      modelIntegrityPassed: true,
      signals: {
        ...baseSignals,
        outputState: { ...baseSignals.outputState, anonymizationMode: 'pseudonymous', containsPseudonymTokens: true },
        mappingState: 'local_only',
      },
    });

    expect(decision.decision).toBe('block');
    expect(decision.ruleId).toBe('PIM_PSEUDONYM_EXTERNAL_AI_BLOCK');
  });

  it('blocks mapping presence', () => {
    const decision = evaluatePim({
      mode: 'anonymous',
      action: 'export_file',
      draftStatus: 'draft_certified_anonymous',
      guardResults: passGuard,
      modelIntegrityPassed: true,
      signals: {
        ...baseSignals,
        outputState: { ...baseSignals.outputState, containsMapping: true },
        mappingState: 'unsafe_present',
      },
    });

    expect(decision.decision).toBe('block');
    expect(decision.ruleId).toBe('PIM_MAPPING_BLOCK');
  });
});
```

## 44. Property-based tests

Invarianten:

```txt
mapping komt nooit voor in ProcessResult
mapping komt nooit voor in PIM event
raw input komt nooit voor in audit
pseudonymous + send_external_ai is altijd block
pseudonymous + export_file is altijd block
anonymous + containsMapping is altijd block
anonymous + containsRawPersonalData is altijd block
PIM ontbreekt betekent block
Draft Check Guard failure betekent block
model hash mismatch betekent block voor egress
```

Voorbeeld:

```ts
import fc from 'fast-check';
import { evaluatePim } from '../src/pimPolicy';

it('always blocks pseudonymous external AI', () => {
  fc.assert(
    fc.property(fc.float({ min: 0, max: 1 }), riskScore => {
      const decision = evaluatePim({
        mode: 'pseudonymous',
        action: 'send_external_ai',
        draftStatus: 'draft_certified_pseudonymous',
        guardResults: [{ passed: true, guard: 'DraftCheckGuard', ruleId: 'pass', reasonCode: 'pass', severity: 'info' }],
        modelIntegrityPassed: true,
        signals: {
          directPii: {},
          contextualPii: {},
          outputState: {
            containsRawPersonalData: false,
            containsPseudonymTokens: true,
            containsMapping: false,
            anonymizationMode: 'pseudonymous',
            riskScore,
            riskLevel: riskScore > 0.7 ? 'blocked' : 'low',
          },
          modelState: { nerVerified: true, educationContextVerified: true, rewriteModelVerified: true },
          mappingState: 'local_only',
        },
      });

      expect(decision.decision).toBe('block');
    })
  );
});
```

## 45. Browser integration tests

Moet testen:

```txt
geen mapping in React state
geen mapping in localStorage
geen raw input in console
geen payload via fetch zonder PIM allow
sendBeacon geblokkeerd
WebSocket payload geblokkeerd
copy-action vraagt PIM
export-action vraagt PIM
restore-action blijft lokaal
```

---

## 46. GitHub Actions CI

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
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm -r typecheck
      - run: pnpm -r test
      - run: pnpm -r build

  privacy-policy-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @eai-oai/privacy-core test -- --run pimPolicy
      - run: pnpm --filter @eai-oai/privacy-core test -- --run privacyProperties
```

Release mag niet door bij:

```txt
frozen lockfile uit
ontbrekende test voor PIM
ontbrekende modelhash
failing typecheck
failing build
failing browser egress test
```

---

# DEEL F: Integratie met bestaande EAI-code

## 47. Externe modelroutes vervangen

Elke externe route krijgt een wrapper:

```ts
export async function guardedExternalAiCall(params: {
  text: string;
  pimDecision: PimDecision;
  send: (text: string) => Promise<unknown>;
}) {
  if (params.pimDecision.action !== 'send_external_ai') {
    throw new Error('External AI blocked: wrong PIM action.');
  }

  if (params.pimDecision.decision !== 'allow') {
    throw new Error(`External AI blocked by PIM: ${params.pimDecision.ruleId}`);
  }

  return params.send(params.text);
}
```

Geen directe calls naar externe AI met onderwijsinput.

## 48. Audit aanpassen

Oude auditvelden verwijderen:

```txt
raw_text
input_text
mapping
prompt
completion
full_draft
restored_text
embedding
semantic_vector
```

Nieuwe auditvelden:

```txt
eventType
action
mode
decision
ruleId
reasonCode
severity
riskLevel
policyVersion
modelVersion
timestamp
```

## 49. Sentimentvelden verwijderen

Niet gebruiken:

```txt
emotion
stress
engagement
attention
anger
sadness
boredom
motivation_profile
student_behavior_profile
```

Wel gebruiken:

```txt
privacy_risk
reidentification_risk
context_specificity
draft_safety
pim_decision
```

---

# DEEL G: README-starttekst

## 50. README

```md
# Project PIM

Browser-first privacytool voor onderwijsdata.

## Modi

### Niet-omkeerbaar anoniem

Maakt tekst algemener zonder mapping. Geschikt voor gecontroleerde export als PIM dit toestaat.

### Omkeerbaar pseudoniem

Vervangt herkenbare gegevens door tokens. Mapping blijft lokaal. Pseudonieme output mag niet naar externe AI en niet als exportbestand worden gedeeld.

## PIM

PIM staat voor Privacy Integrity Monitor. PIM is deterministische TypeScript-code. Modellen mogen signalen leveren, maar PIM neemt het definitieve allow/block-besluit.

## Belangrijke beperking

De tool claimt geen absolute juridische anonimiteit. Onderwijscontext kan ook zonder namen herkenbaar zijn.

## Productiegate

Productie vereist:

- pinned modelversies;
- hashes;
- Draft Check Guard;
- PIM-tests;
- egress-tests;
- geen mapping in state, logs of export;
- geen pseudonieme externe AI;
- CI green.
```

---

# DEEL H: Productiegate

## 51. Harde productieregels

Productie is verboden als een van deze punten niet klopt:

```txt
PIM ontbreekt
PIM is prompt-based
PIM-tests ontbreken
pseudonymous + send_external_ai is niet hard geblokkeerd
pseudonymous + export_file is niet hard geblokkeerd
mapping komt terug in ProcessResult
mapping komt in React state
mapping komt in localStorage zonder AES-GCM
mapping komt in audit
Draft Check Guard ontbreekt
Production Egress Guard ontbreekt
modelhashes ontbreken
modelintegriteit faalt open
education context model ontbreekt maar export blijft mogelijk
raw input kan netwerk bereiken
console/debug kan raw input tonen
analytics/session replay kan tekst lezen
CI dekt policy-invarianten niet
```

## 52. Acceptatiecriteria

1. Raw input verlaat de browser niet.
2. Mapping verlaat de browser niet.
3. Mapping staat nooit in `ProcessResult`.
4. Mapping staat nooit in React state of gewone UI-store.
5. Persistente mapping gebruikt AES-GCM.
6. Base64 wordt nergens als encryptie beschreven.
7. Anonymous mode maakt geen mapping.
8. Anonymous export vereist Draft Check Guard pass.
9. Anonymous export vereist PIM allow.
10. Anonymous external AI vereist PIM allow en zeer lage risk.
11. Pseudonymous external AI is altijd block.
12. Pseudonymous export_file is altijd block.
13. Debug logging van inhoud is altijd block.
14. Modelhash ontbreekt betekent geen export.
15. Onderwijscontextmodel ontbreekt betekent geen export.
16. SLM/LLM neemt nooit allow/block-besluit.
17. PIM is deterministische code.
18. Egress Guard handhaaft PIM-besluit.
19. Draft Check Guard detecteert raw leak, mapping leak en token-mix.
20. Speciale onderwijscontext verhoogt risico.
21. Kleine groep plus zorgcontext blokkeert egress of vraagt review.
22. Audit bevat alleen metadata.
23. Audit bevat geen draft, mapping, prompt of embedding.
24. CI bevat PIM unit tests.
25. CI bevat property-based privacytests.
26. Browser-integratietests controleren fetch, XHR, beacon en WebSocket.
27. Clipboard-copy vraagt PIM.
28. Print vraagt PIM.
29. Share vraagt PIM.
30. Restore blijft lokaal.
31. Herstelde tekst wordt niet geëxporteerd zonder nieuwe anonieme verwerking.
32. Geen AI Act verboden leerlingprofilering.
33. README noemt de beperking rond juridische anonimiteit.
34. UI onderscheidt anoniem en pseudoniem duidelijk.
35. Release faalt bij ontbrekende lockfile.

---

# DEEL I: Implementatieroadmap

## Sprint 1: Core en types

Doel:

```txt
types.ts
privacy.config.ts
detectRules.ts
mergeDetections.ts
risk.ts
basis-tests
```

Definition of done:

```txt
unit tests groen
geen mapping in ProcessResult
privacy fixtures werken
```

## Sprint 2: Mapping en modes

Doel:

```txt
anonymize.ts
pseudonymize.ts
secureMapping.ts
contextualGeneralization.ts
```

Definition of done:

```txt
anonymous maakt geen mapping
pseudonymous geeft alleen MappingHandle terug
AES-GCM test groen
```

## Sprint 3: Guards en PIM

Doel:

```txt
draftCheckGuard.ts
pimPolicy.ts
productionEgressGuard.ts
restoreGuard.ts
minimalAudit.ts
```

Definition of done:

```txt
pseudonymous external AI block
pseudonymous export block
mapping block
raw PII block
PIM property tests groen
```

## Sprint 4: Model runtime

Doel:

```txt
modelRegistry.ts
modelIntegrity.ts
browserSlmDetector.ts
browserLlmRewrite.ts
hash.ts
```

Definition of done:

```txt
hash verplicht voor productie
model gate fail-closed
education context missing -> no export
```

## Sprint 5: UI en runtime hardening

Doel:

```txt
PrivacyModeToggle
DraftSafetyBadge
PimDecisionPanel
network wrappers
logging sanitizer
clipboard/export wrappers
```

Definition of done:

```txt
geen mapping in state
copy/export/print/share via PIM
browser egress tests groen
```

## Sprint 6: CI en release gate

Doel:

```txt
pnpm-lock.yaml
GitHub Actions
property-based tests
browser integration tests
release checklist
```

Definition of done:

```txt
pnpm install --frozen-lockfile
pnpm -r typecheck
pnpm -r test
pnpm -r build
privacy-policy-gate groen
```

---

# DEEL J: Beslislogica in gewone taal

## 53. Wat gebeurt er met anonieme tekst?

1. Directe PII wordt gevonden met code en SLM.
2. Onderwijscontext wordt gevonden met regels en SLM.
3. De tekst wordt gegeneraliseerd.
4. Een browser LLM mag de geschoonde tekst leesbaar maken.
5. Draft Check Guard controleert opnieuw.
6. PIM beslist per actie.
7. Egress Guard voert het besluit uit.

## 54. Wat gebeurt er met pseudonieme tekst?

1. PII wordt gevonden.
2. PII wordt vervangen door tokens.
3. Mapping blijft lokaal in een secure container.
4. UI krijgt alleen een mappinghandle.
5. Draft Check Guard controleert tokens.
6. PIM staat lokale display en restore toe met waarschuwing.
7. PIM blokkeert externe AI, export, print, share en copy.

## 55. Wat gebeurt er als modellen falen?

```txt
NER ontbreekt -> geen egress
onderwijscontextmodel ontbreekt -> geen egress
rewrite LLM ontbreekt -> fallback naar regelgeneralisatie
hash mismatch -> geen egress
modelstatus onbekend -> geen egress
```

---

# DEEL K: Definitieve conclusie

Project PIM is een zelfstandig bronbestand voor een privacy-first onderwijsproduct.

De hoofdkeuze is:

```txt
Geen brede geheugenlaag als privacybeslisser.
Wel PIM als deterministische policy engine.
```

Dat maakt het ontwerp:

```txt
kleiner in opslag
strenger in egress
beter testbaar
makkelijker te auditen
veiliger bij modelonzekerheid
helderder voor ontwikkelaars
```

Project PIM is productierijp als specificatie wanneer de acceptatiecriteria uit dit document als tests en release-gates zijn geïmplementeerd.

De tool mag pas naar productie wanneer:

```txt
PIM in code werkt
alle guards werken
modelintegriteit fail-closed is
mapping nooit buiten de secure container komt
pseudonieme externe AI hard geblokkeerd is
CI alle privacy-invarianten afdwingt
```
