# 06, Tests, Verificatie En Acceptatie

## Altijd draaien

```bash
npm run typecheck
npm run test
npm run build
```

## Gericht voor Blok 1

```bash
npx vitest run src/components/pim/product/__tests__/ProductModesNer.test.tsx src/components/pim/product/__tests__/WriterNerSource.test.tsx
```

## Gericht voor engine/policy

```bash
npx vitest run src/lib/pim/__tests__ src/lib/pim/engine/__tests__ src/hooks/__tests__/usePimEngine.test.tsx
```

## Lint scoped

```bash
npx eslint src/components/pim/product src/components/pim/writer src/lib/pim
```

Let op: de Lovable-export kan bestaande route/testfile- of Fast Refresh-waarschuwingen hebben. Los errors op; waarschuwingen apart beoordelen.

## Handmatige previewacceptatie

### Quick

1. Open `/app?mode=quick`.
2. Open Expert.
3. Zet BERT 100 MB aan.
4. Klik `Laden en testen`.
5. Plak tekst met naam/school/plaats.
6. Controleer dat verdict extra BERT-hits kan tonen.

### Start

1. Wissel naar `/app?mode=start`.
2. Zelfde tekst.
3. Controleer dat stappen en bevindingen dezelfde NER-spans gebruiken.

### Write

1. Wissel naar `/app?mode=write`.
2. Analyseer de editorinhoud.
3. Controleer dat writer geen tweede modeldownload vraagt als BERT al werkt.
4. Controleer dat writer-tekst de NER-bron is.

### Terug naar Quick

1. Wissel terug naar Quick.
2. Controleer dat Quick-tekst weer de NER-bron is.

## Release-acceptatie

- Quick, Start en Write delen een NER-runtime.
- Writer draait geen lokale NER-hook meer.
- BERT 100/180 MB wissel reset en herlaadt juiste variant.
- Egress onmogelijk zonder certified anonymous payload.
- Productie-egress vereist statisch geverifieerde modelconfig.
- Build bevat benodigde ONNX WASM assets of CSP staat gepinde CDN toe.

