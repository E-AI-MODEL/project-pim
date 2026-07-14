# 05, UX En Status Consistentie

## Doel

Gebruiker ziet overal dezelfde BERT/modelstatus en weet wat hij kan doen.

## Bestanden

- `src/components/pim/start-go/AdvancedPanel.tsx`
- `src/components/pim/product/StatusFooter.tsx`
- `src/components/pim/start-go/DetailsDrawer.tsx`
- `src/components/pim/start-go/LiveTechMonitor.tsx`
- `src/lib/pim/modelGate.ts`

## Statussen

Gebruik overal dezelfde states:

- BERT uit
- BERT gekozen maar niet geladen
- BERT laden/testen
- BERT werkt
- BERT fout
- BERT niet production-verified voor egress

## Bronnen

Gebruik geen losse hardcoded claims zoals `modelVerified: true`.

Gebruik:

```ts
nerStatus.loading
nerStatus.working
nerStatus.error ?? nerStatus.healthError
modelGateFor(action, detectionSettings, integrity)
```

## AdvancedPanel

Moet tonen:

- gekozen variant: 100 MB of 180 MB;
- statuslabel;
- knop `Laden en testen`;
- foutmelding als laden/integriteit/test faalt;
- integriteitsstatus in technische sectie.

## StatusFooter

Moet compact tonen:

- lokale modus;
- BERT werkt/niet geladen/fout;
- expertknop;
- diagnostiekknop.

## DetailsDrawer/Diagnostics

Moet tonen:

- detectoren die hit veroorzaakten;
- modelstatus;
- modelgate reason;
- policyregel;
- payloadType;
- laatste re-consult resultaat.

## Acceptatiecriteria

- Status is identiek in Quick/Start/Write.
- Een gebruiker kan vanuit elke modus BERT laden/testen.
- Een BERT-fout is zichtbaar en herstelbaar met `Opnieuw`.
- Egress-blokkade noemt of het door PII, payloadType of modelintegriteit komt.

