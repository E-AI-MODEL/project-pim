# 02 - Middleware-casus onderwijs

Deze casus beschrijft de richting waarin PiM nuttig wordt buiten de demo: als privacylaag in onderwijsapps die leerlingwerk analyseren.

## Casus A - UMDT / misconceptie-tool

Doel: niet alleen bepalen of een antwoord goed of fout is, maar waarom een leerling zo denkt.

Flow:

```txt
docent uploadt toets
leerlingantwoorden worden geupload
OCR haalt tekst uit scans of foto's
PiM verwerkt de tekst
analyse krijgt alleen veilige input
reflectie gaat terug naar de docent
```

PiM-rol:

- detecteert persoonsgegevens en gevoelige context;
- kiest anoniem of pseudoniem op basis van de route;
- bewaakt dat mapping lokaal blijft;
- blokkeert onveilige uitgaande acties;
- geeft per actie een PIM-besluit.

Belangrijke keuze:

```txt
Lokale analyse in browser: pseudoniem kan nuttig zijn.
Analyse via server of externe AI: eerst anoniem maken.
```

## Casus B - Essayfeedback

Doel: docent bouwt een opdracht, leerlingen schrijven essays, het systeem helpt met feedback en reflectie.

Flow:

```txt
docent maakt opdracht
leerling schrijft essay
essay komt binnen in onderwijsapp
PiM verwerkt essay
feedbackmodule gebruikt veilige draft
docent ziet feedback, risk en PIM-besluit
```

Mogelijke feedback:

- schrijfkwaliteit;
- argumentatie;
- begripsfouten;
- rubric-feedback;
- suggesties voor vervolgvragen;
- signalen voor docentreflectie.

PiM doet niet de inhoudelijke beoordeling. PiM zorgt dat de tekst veilig genoeg is voor de gekozen route.

## Casus C - EAI Classroom en EAI Studio

PiM wordt middleware voor bestaande onderwijsflows.

Globaal contract:

```txt
EAI app
  -> levert tekst, bronsoort en gewenste actie
PiM
  -> detecteert, anonimiseert of pseudonimiseert
PIM
  -> beslist per actie
Egress Guard
  -> handhaaft het besluit
Feedbackmodule
  -> gebruikt alleen toegestane draft
```

## Moduskeuze per route

| Route                       | PiM-modus                 | Mag naar externe AI? | Opmerking                                                 |
| --------------------------- | ------------------------- | -------------------: | --------------------------------------------------------- |
| Alleen lokale docentpreview | pseudonymous of anonymous |                  nee | Pseudoniem kan nuttig zijn om later lokaal te herstellen. |
| Lokale browseranalyse       | pseudonymous mogelijk     |                  nee | Alleen als model lokaal draait en mapping lokaal blijft.  |
| Serveranalyse               | anonymous                 |  alleen na PIM allow | Geen mapping of tokens naar server.                       |
| Externe AI-feedback         | anonymous                 |  alleen na PIM allow | Lage risk en alle guards groen.                           |
| Export rapport              | anonymous                 |  alleen na PIM allow | Hard-review labels blokkeren.                             |
| Terugzetten naar origineel  | pseudonymous              |                  nee | Alleen lokaal met mapping.                                |

## Middleware-boundary

PiM moet als vaste grens werken:

```txt
voor PiM: ruwe tekst mogelijk
na PiM: alleen draft + metadata
```

Na PiM mogen onderwijsapps niet meer werken met ruwe tekst, behalve in lokale edit- of herstelroutes die opnieuw door PiM gaan.

## Minimale API voor onderwijsapps

```ts
interface PimMiddlewareRequest {
  sourceKind: "ocr" | "typed_text" | "uploaded_doc" | "lms_submission";
  text: string;
  mode: "anonymous" | "pseudonymous";
  intendedAction:
    | "display"
    | "save_local"
    | "send_external_ai"
    | "export_file"
    | "copy"
    | "print"
    | "share";
  profileId: "education-nl-full" | "education-nl-rules-only";
}

interface PimMiddlewareResponse {
  draft: string;
  draftStatus: string;
  riskScore: number;
  riskLevel: string;
  profileId: string;
  activeDetectorIds: string[];
  decision: {
    decision: "allow" | "allow_with_warning" | "block";
    ruleId: string;
    reasonCode: string;
  };
  mappingHandle?: {
    id: string;
    mode: "memory_only" | "encrypted_local";
  };
}
```

Niet opnemen in response:

- mapping entries;
- ruwe input als tweede kopie;
- OCR-afbeeldingen;
- modelprompt;
- inhoudelijke auditdata.

## OCR-aandachtspunt

OCR is handig, maar voegt risico toe:

- namen kunnen verkeerd gelezen worden;
- handschrift kan ruis geven;
- kolommen en tabellen kunnen door elkaar lopen;
- een foto kan gezichten of context bevatten.

Daarom moet OCR-output altijd door PiM en mag de oorspronkelijke afbeelding niet automatisch naar AI.

## Eerste technische proef

De eerste proef hoeft nog geen volledige feedbackmachine te zijn.

Minimum:

```txt
1. upload tekst of OCR-output
2. PiM draait education-nl-rules-only
3. toon anonieme draft
4. toon PIM-besluit
5. blokkeer externe AI bij te hoge risk
6. log alleen metadata
```

Daarna:

```txt
7. education-nl-full met NER toevoegen
8. contextdetectie toevoegen
9. veilige feedbackmodule koppelen
10. EAI Studio route aansluiten
```
