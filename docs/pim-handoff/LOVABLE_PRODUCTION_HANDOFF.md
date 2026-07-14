# Lovable Production Handoff, Project PiM

Doel: maak van de Lovable-export een productiegeschikte PiM-versie. Dit document is bedoeld om 1-op-1 in Lovable of een engineering ticket te gebruiken. De eerste stap, NER/BERT-centralisatie, is in deze workspace al geimplementeerd en geverifieerd.

## Status

| Blok | Status in deze workspace | Productiedoel |
| --- | --- | --- |
| 1. NER/BERT centraliseren | Geimplementeerd | Een runtime, een tekstbron, alle modi delen dezelfde NER-spans |
| 2. Modelintegriteit hard maken | Uit te voeren | Geen `main`/trust-on-first-use voor productie-egress |
| 3. Egress/policy sluiten | Uit te voeren | Alle uitgaande acties door dezelfde async hercontrole en gate |
| 4. Runtime/browser hardening | Uit te voeren | CSP/WASM/WebGPU/headers geschikt voor deployment |
| 5. UX/status consistent maken | Uit te voeren | Overal dezelfde modelstatus en herstelactie |

## Blok 1, NER/BERT Centraliseren

### Doel

NER/BERT-detectie leeft centraal in `ProductShell`: een runtime voor status, startknop, variant, enabled-state en een modus-bewuste tekstbron. Quick, Start & Go en Schrijven gebruiken dezelfde `nerSpans`.

### Bestanden

- `src/components/pim/product/ProductShellContext.tsx`
- `src/components/pim/product/ProductShell.tsx`
- `src/components/pim/product/ExpertPanel.tsx`
- `src/components/pim/product/modes/QuickMode.tsx`
- `src/components/pim/product/modes/StartMode.tsx`
- `src/components/pim/writer/WriterWorkspace.tsx`
- `src/components/pim/product/__tests__/ProductModesNer.test.tsx`
- `src/components/pim/product/__tests__/WriterNerSource.test.tsx`
- `src/components/pim/product/__tests__/sliceC.test.tsx`

### Vereiste code

`ProductShellContext.tsx` moet deze velden bevatten:

```ts
usesNerSlm: boolean;
nerEnabled: boolean;
nerSpans: PiiSpan[];
nerStatus: NerStatus | null;
startNer: () => void;
nerSourceText: string;
setNerSourceText: (v: string) => void;
```

`ProductShell.tsx` moet de centrale runtime beheren:

```ts
const [nerEnabled, setNerEnabled] = useState(false);
const [nerSourceText, setNerSourceText] = useState("");
const usesNerSlm = usesBert(settings.detectionSettings);

useEffect(() => {
  const variant = detectionSettingsToNerVariant(settings.detectionSettings);
  if (variant) setNerVariant(variant);
}, [settings.detectionSettings]);

const {
  nerSpans,
  nerStatus,
  startNer: startNerLoad,
} = useNerSpans(mode === "write" ? nerSourceText : text, {
  enabled: usesNerSlm && nerEnabled,
});

useEffect(() => {
  if (!usesNerSlm) setNerEnabled(false);
}, [usesNerSlm]);

useEffect(() => {
  if (usesNerSlm && nerStatus?.working) setNerEnabled(true);
}, [usesNerSlm, nerStatus?.working]);

const startNer = useCallback(() => {
  if (!usesNerSlm) return;
  setNerEnabled(true);
  startNerLoad();
}, [startNerLoad, usesNerSlm]);
```

Reset moet ook NER-state wissen:

```ts
setText("");
setNerSourceText("");
setNerEnabled(false);
setWriterContent(null);
setWriterAutoRedact(new Set(DEFAULT_AUTO_REDACT));
setWriterStrict(false);
reset();
```

`ExpertPanel.tsx` moet NER doorgeven:

```tsx
<AdvancedPanel
  {...props}
  writer={writerProps}
  ner={{ status: nerStatus, onStart: startNer, available: usesNerSlm }}
/>
```

`QuickMode.tsx`:

```ts
const { nerSpans, ... } = useProductShell();

useEffect(() => {
  if (!text.trim()) return;
  evaluate({ text, mode, extraSpans: nerSpans, autoRepair: false });
}, [evaluate, text, mode, nerSpans]);
```

`StartMode.tsx`:

```ts
const { nerSpans, ... } = useProductShell();

useEffect(() => {
  if (!text.trim()) return;
  evaluate({ text, mode, extraSpans: nerSpans, autoRepair: true });
}, [evaluate, text, mode, nerSpans]);
```

`WriterWorkspace.tsx`:

- verwijder lokale `useNerSpans`
- gebruik centrale `nerSpans`, `nerStatus`, `startNer`, `setNerSourceText`

```ts
const {
  evaluate,
  settings,
  requestAction,
  writerContent,
  setWriterContent,
  writerAutoRedact: autoRedact,
  setWriterAutoRedact: setAutoRedactRaw,
  writerStrict: strict,
  nerSpans,
  nerStatus,
  startNer,
  setNerSourceText,
} = useProductShell();

useEffect(() => {
  setNerSourceText(plainText);
}, [plainText, setNerSourceText]);

useEffect(() => {
  return () => setNerSourceText("");
}, [setNerSourceText]);
```

Analyse/export gebruikt centrale spans:

```ts
evaluate({ text: plain, mode: "anonymous", extraSpans: nerSpans });
```

### Acceptatiecriteria

- Quick en Start geven `extraSpans: nerSpans` door.
- Writer draait geen eigen `useNerSpans`.
- Writer zet de writer-tekst als centrale NER-bron.
- Wissel Quick -> Write -> Quick gebruikt de juiste bron per modus.
- Expertpaneel toont BERT-status en `Laden en testen`.

### Tests

Run:

```bash
npm run typecheck
npm run test
npm run build
```

Gericht:

```bash
npx vitest run src/components/pim/product/__tests__/ProductModesNer.test.tsx src/components/pim/product/__tests__/WriterNerSource.test.tsx
```

## Blok 2, Modelintegriteit Hard Maken

### Doel

Voor productie mag de app niet vertrouwen op `revision: "main"` of `LOCAL_PIN:*`. Gebruik immutable Hugging Face commit-revisions en vaste SHA-256 hashes van de publieke `config.json`. Als een model niet production-verified is, blokkeert egress maar lokale analyse mag blijven werken.

### Bestanden

- `src/lib/pim/modelCatalog.ts`
- `src/lib/pim/modelIntegrity.ts`
- `src/lib/pim/modelGate.ts`
- `src/lib/pim/__tests__/modelIntegrity.test.ts`

### Uit te voeren wijziging

Vervang in `modelCatalog.ts`:

```ts
revision: "main",
expectedConfigSha256: "LOCAL_PIN:...",
```

door:

```ts
revision: "<immutable-hf-commit>",
expectedConfigSha256: "<sha256-van-config-json>",
```

Huidige Hugging Face commits, vastgesteld via response header:

```ts
// small, Xenova/distilbert-base-multilingual-cased-ner-hrl
revision: "c2a4dbf593c57f47004c5bc2d3770d311aee9c43"

// large, Xenova/bert-base-multilingual-cased-ner-hrl
revision: "263e82c06569c8c2ac46238a7ae5107598934234"
```

Laat Lovable/CI de hashes ophalen met:

```bash
curl -s -L https://huggingface.co/Xenova/distilbert-base-multilingual-cased-ner-hrl/resolve/c2a4dbf593c57f47004c5bc2d3770d311aee9c43/config.json | shasum -a 256
curl -s -L https://huggingface.co/Xenova/bert-base-multilingual-cased-ner-hrl/resolve/263e82c06569c8c2ac46238a7ae5107598934234/config.json | shasum -a 256
```

Pas `NER_VARIANTS` aan, niet alleen `MODEL_CATALOG.ner_multilingual`.

### Productie-regel

`verifyModel()` mag `LOCAL_PIN` blijven ondersteunen voor demo/dev, maar productie-egress mag alleen `status === "verified"` accepteren.

Aanbevolen helper in `modelIntegrity.ts`:

```ts
export function hasStaticProductionHash(expected: string): boolean {
  return !expected.startsWith("LOCAL_PIN:") && !expected.startsWith("PLACEHOLDER:");
}
```

Aanbevolen tests:

```ts
it("release NER variants use immutable revisions and static hashes", () => {
  for (const variant of Object.values(NER_VARIANTS)) {
    expect(variant.revision).not.toBe("main");
    expect(variant.expectedConfigSha256).not.toMatch(/^LOCAL_PIN:/);
    expect(variant.expectedConfigSha256).not.toMatch(/^PLACEHOLDER:/);
  }
});
```

## Blok 3, Egress En Policy Sluiten

### Doel

Alle uitgaande acties (`copy`, `export_file`, `print`, `share`, `send_external_ai`) gaan door dezelfde payload-type check, modelgate en async re-consult. Geen enkel pad mag ruwe of pseudonieme tekst per ongeluk naar buiten laten.

### Bestanden

- `src/lib/pim/egressGuard.ts`
- `src/lib/pim/policy.ts`
- `src/lib/pim/engine/engine.ts`
- `src/lib/pim/__tests__/egressPipeline.e2e.test.ts`
- `src/lib/pim/__tests__/policy.strict.test.ts`
- `src/lib/pim/engine/__tests__/engine.test.ts`

### Vereiste regels

1. Egress accepteert alleen:

```ts
payload.payloadType === "draft_anonymous_certified"
```

2. Egress draait altijd:

```ts
const reconsult = await reconsultPayload(payload);
if (!reconsult.ok) return { executed: false, reason: reconsult.reason };
```

3. `modelGateFor()` moet per actie worden berekend in de engine, niet hardcoded.

4. Niet-strikt:

- BERT uit + `send_external_ai`/`export_file` = `ALLOW_WITH_WARNING`
- copy/print/share mogen door als payload certified is en re-consult pass is

5. Strikt:

- BERT uit + `send_external_ai`/`export_file` = `BLOCK`

### Tests

Toevoegen of controleren:

```ts
it("blocks every egress action for non-certified payloads", async () => {
  for (const action of ["copy", "export_file", "print", "share", "send_external_ai"] as const) {
    const result = await executeAction(allowDecision(action), {
      text: "Jan Jansen",
      mode: "anonymous",
      payloadType: "unknown",
      guardStatus: "fail",
    });
    expect(result.executed).toBe(false);
  }
});
```

## Blok 4, Runtime En Browser Hardening

### Doel

De browser mag alleen laden wat nodig is voor lokale inference. CSP moet Hugging Face modelbestanden, ONNX WASM en workers toestaan, maar geen brede externe scripts.

### Bestanden

- `vite.config.ts`
- `public/_headers`
- `wrangler.jsonc`
- `src/lib/pim/nerSlm.ts`

### CSP baseline

Gebruik minimaal:

```ts
"default-src 'self'",
"base-uri 'self'",
"object-src 'none'",
"frame-ancestors 'none'",
"img-src 'self' data: blob:",
"font-src 'self' data:",
"style-src 'self' 'unsafe-inline'",
"script-src 'self' 'wasm-unsafe-eval' blob:",
"worker-src 'self' blob:",
"connect-src 'self' https://huggingface.co https://*.huggingface.co https://cdn-lfs.huggingface.co https://cdn.jsdelivr.net https://unpkg.com",
"form-action 'self'",
```

Aanbevolen productieverbetering: host ONNX WASM lokaal of pin CDN-versies expliciet. Controleer in build-output dat `ort-wasm-simd-threaded.asyncify*.wasm` wordt meegebundeld.

### Runtime tests

Handmatige preview:

1. Open `/app?mode=quick`.
2. Open Expert.
3. Klik `Laden en testen`.
4. Verwacht status `BERT werkt`.
5. Plak tekst met onbekende naam + plaats.
6. Verwacht extra `slm.ner.*` hits.

## Blok 5, UX En Status Consistent Maken

### Doel

Gebruiker moet altijd hetzelfde statusmodel zien:

- BERT uit
- BERT gekozen maar niet geladen
- BERT laden/testen
- BERT werkt
- BERT fout
- BERT niet production-verified voor egress

### Bestanden

- `src/components/pim/start-go/AdvancedPanel.tsx`
- `src/components/pim/product/StatusFooter.tsx`
- `src/components/pim/start-go/DetailsDrawer.tsx`
- `src/components/pim/start-go/LiveTechMonitor.tsx`
- `src/lib/pim/modelGate.ts`

### UI-regel

Gebruik dezelfde bron voor labels:

```ts
nerStatus.loading
nerStatus.working
nerStatus.error ?? nerStatus.healthError
modelGateFor(action, detectionSettings, integrity)
```

Geen losse hardcoded claims zoals `modelVerified: true` in UI of resultpanels.

## Eindverificatie

Voor een release moet dit groen zijn:

```bash
npm run typecheck
npm run test
npm run build
npx eslint src/components/pim/product src/components/pim/writer src/lib/pim
```

Bekende bestaande waarschuwingen in deze Lovable-export:

- route generator waarschuwt over testbestanden onder `src/routes/__tests__`
- sommige bestaande bestanden hebben Prettier/Fast Refresh waarschuwingen als de hele repo wordt gelint

Release-acceptatie:

- Quick, Start en Write delen een NER-runtime.
- Writer draait geen lokale NER-hook meer.
- BERT 100/180 MB wissel reset en herlaadt de juiste variant.
- Egress is onmogelijk zonder certified anonymous payload.
- Productie-egress vereist statisch geverifieerde modelconfig.
- Build bevat benodigde ONNX WASM assets of CSP staat de gepinde CDN toe.
