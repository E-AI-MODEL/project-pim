# 01, NER/BERT Centralisatie

## Doel

NER/BERT-detectie centraliseren in `ProductShell`: een runtime voor status, startknop, variant, enabled-state en een modus-bewuste tekstbron. Quick, Start & Go en Schrijven gebruiken dezelfde `nerSpans`.

## Bestanden

- `src/components/pim/product/ProductShellContext.tsx`
- `src/components/pim/product/ProductShell.tsx`
- `src/components/pim/product/ExpertPanel.tsx`
- `src/components/pim/product/modes/QuickMode.tsx`
- `src/components/pim/product/modes/StartMode.tsx`
- `src/components/pim/writer/WriterWorkspace.tsx`
- `src/components/pim/product/__tests__/ProductModesNer.test.tsx`
- `src/components/pim/product/__tests__/WriterNerSource.test.tsx`
- `src/components/pim/product/__tests__/sliceC.test.tsx`

## ProductShellContext.tsx

Voeg toe aan `ProductShellContextValue`:

```ts
usesNerSlm: boolean;
nerEnabled: boolean;
nerSpans: PiiSpan[];
nerStatus: NerStatus | null;
startNer: () => void;
nerSourceText: string;
setNerSourceText: (v: string) => void;
```

Zorg dat de import deze types bevat:

```ts
import type { Action, Mode, NerStatus, PiiCategory, PiiSpan } from "@/lib/pim";
```

## ProductShell.tsx

Gebruik centrale NER-runtime:

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

Provider geeft mee:

```ts
usesNerSlm,
nerEnabled,
nerSpans,
nerStatus,
startNer,
nerSourceText,
setNerSourceText,
```

## ExpertPanel.tsx

Lees uit context:

```ts
const {
  settings,
  usesNerSlm,
  nerStatus,
  startNer,
  writerAutoRedact,
  setWriterAutoRedact,
  writerStrict,
  setWriterStrict,
} = useProductShell();
```

Geef door:

```tsx
<AdvancedPanel
  {...props}
  writer={writerProps}
  ner={{ status: nerStatus, onStart: startNer, available: usesNerSlm }}
/>
```

## QuickMode.tsx

Lees `nerSpans` uit context en gebruik:

```ts
useEffect(() => {
  if (!text.trim()) return;
  evaluate({ text, mode, extraSpans: nerSpans, autoRepair: false });
}, [evaluate, text, mode, nerSpans]);
```

Voeg `nerSpans` ook toe aan debounce dependencies.

## StartMode.tsx

Lees `nerSpans` uit context en gebruik:

```ts
useEffect(() => {
  if (!text.trim()) return;
  evaluate({ text, mode, extraSpans: nerSpans, autoRepair: true });
}, [evaluate, text, mode, nerSpans]);
```

Startknop:

```tsx
onStart={() =>
  text.trim() && evaluate({ text, mode, extraSpans: nerSpans, autoRepair: true })
}
```

## WriterWorkspace.tsx

Verwijder lokale `useNerSpans`.

Gebruik centrale context:

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
```

Zet writer-tekst als NER-bron:

```ts
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

## Acceptatiecriteria

- Quick en Start geven `extraSpans: nerSpans` door.
- Writer draait geen eigen `useNerSpans`.
- Writer zet de writer-tekst als centrale NER-bron.
- Wissel Quick -> Write -> Quick gebruikt juiste bron per modus.
- Expertpaneel toont BERT-status en laad/testknop.

