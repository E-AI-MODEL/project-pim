# Project PiM Golden Path

## Doel

Project PiM is browser-first en fail-closed. Privacygevoelige inhoud blijft in de actieve browsercontext. Alleen een gecertificeerde anonymous draft mag naar uitgaande acties zoals copy, export, print of share.

## Standaardflow

1. De gebruiker voert tekst in.
2. PiM detecteert directe en contextuele privacy-signalen.
3. PiM maakt een anonymous of pseudonymous draft.
4. Draft Check Guard controleert de output.
5. Policy beslist `ALLOW`, `WARN` of `BLOCK`.
6. Alleen `draft_anonymous_certified` mag naar uitgaande acties.
7. EgressGuard controleert vlak voor uitvoering opnieuw de werkelijke payload.
8. De actie wordt alleen uitgevoerd bij een schone tweede controle.
9. Audit logt alleen metadata.
10. Mapping blijft local-only.

## Lokale opslag

Toegestaan:

- browser-cache voor publieke modelbestanden;
- `localStorage` voor SHA-256 hashes van publieke modelconfiguratie;
- in-memory secure mapping container;
- auditmetadata zonder originele tekst.

Niet toegestaan:

- originele invoer in `localStorage`;
- mappingwaarden in `localStorage`;
- review queue met originele tekst;
- drafts of mapping naar een backend;
- inhoudelijke tekst naar modelhosts.

## Uitgaande acties

Een uitgaande actie mag alleen doorgaan als alle voorwaarden waar zijn:

1. De policy geeft geen `BLOCK`.
2. De payload is `draft_anonymous_certified`.
3. Draft Check Guard is `pass`.
4. Modelintegriteit is `verified` wanneer het profiel een model vereist.
5. De tweede controle vindt geen directe PII in de werkelijke payload.
6. De risk-score blijft onder de actie-drempel.

## Nooit doen

- Originele invoer naar copy, export, print, share of backend sturen.
- Mapping loggen, exporteren of in React state zetten.
- Pseudonymous drafts naar uitgaande acties sturen.
- Uitgaande acties toestaan zonder Draft Check pass.
- Uitgaande acties toestaan bij modelintegriteit `missing`, `placeholder` of `mismatch`.
- Modelintegriteit gebruiken om inhoudelijke tekst naar modelhosts te sturen.

## Modeldownload

NER gebruikt publieke modelbestanden van Hugging Face. Alleen publieke modelbestanden en publieke `config.json`-metadata worden opgehaald. De invoer van de gebruiker wordt niet naar Hugging Face gestuurd.

Modelintegriteit gebruikt browser-local config pins:

1. `config.json` wordt opgehaald.
2. De browser berekent lokaal `SHA-256(config.json)`.
3. De eerste hash wordt lokaal gepind.
4. Een latere afwijking wordt `mismatch` en blokkeert uitgaande acties.

## Externe modelactie

`send_external_ai` is in deze build een endpointloze simulatie. Er wordt geen fetch uitgevoerd naar een provider. Als later een echte provider wordt toegevoegd, moet die call achter dezelfde certified payload gate en tweede controle blijven.

## Review checklist

- Verlaat originele tekst de browser?
- Wordt mapping buiten de secure container gebruikt?
- Komt originele tekst in logs, audit, tests of screenshots terecht?
- Kan een pseudonymous payload naar uitgaande acties?
- Is er een tweede controle vlak voor de echte actie?
- Blijft modelintegriteit beperkt tot publieke modelmetadata?
- Zijn nieuwe detectors getest met negatieve voorbeelden?
