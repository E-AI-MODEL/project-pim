# 02, Modelintegriteit Productie

## Doel

Geen productie-egress op basis van `revision: "main"` of `LOCAL_PIN:*`. Gebruik immutable Hugging Face commits en vaste SHA-256 hashes van publieke modelconfiguratie.

## Bestanden

- `src/lib/pim/modelCatalog.ts`
- `src/lib/pim/modelIntegrity.ts`
- `src/lib/pim/modelGate.ts`
- `src/lib/pim/__tests__/modelIntegrity.test.ts`

## Te wijzigen in modelCatalog.ts

Vervang:

```ts
revision: "main",
expectedConfigSha256: "LOCAL_PIN:...",
```

door:

```ts
revision: "<immutable-hf-commit>",
expectedConfigSha256: "<sha256-van-config-json>",
```

Gebruik dit voor beide NER-varianten:

```ts
// small, Xenova/distilbert-base-multilingual-cased-ner-hrl
revision: "c2a4dbf593c57f47004c5bc2d3770d311aee9c43"

// large, Xenova/bert-base-multilingual-cased-ner-hrl
revision: "263e82c06569c8c2ac46238a7ae5107598934234"
```

Laat CI/Lovable de hashes ophalen:

```bash
curl -s -L https://huggingface.co/Xenova/distilbert-base-multilingual-cased-ner-hrl/resolve/c2a4dbf593c57f47004c5bc2d3770d311aee9c43/config.json | shasum -a 256
curl -s -L https://huggingface.co/Xenova/bert-base-multilingual-cased-ner-hrl/resolve/263e82c06569c8c2ac46238a7ae5107598934234/config.json | shasum -a 256
```

Pas zowel `MODEL_CATALOG.ner_multilingual` als `NER_VARIANTS.small` en `NER_VARIANTS.large` aan.

## modelIntegrity.ts

Laat `LOCAL_PIN` bestaan voor demo/dev, maar productie-egress mag alleen `verified`.

Voeg helper toe:

```ts
export function hasStaticProductionHash(expected: string): boolean {
  return !expected.startsWith("LOCAL_PIN:") && !expected.startsWith("PLACEHOLDER:");
}
```

## modelGate.ts

Regel:

- lokale acties mogen met demo/dev-status door als UX dat vereist;
- egress mag alleen met `status === "verified"`;
- `placeholder`, `missing`, `mismatch`, `unverified` blokkeren egress.

## Test

Voeg toe aan `modelIntegrity.test.ts`:

```ts
it("release NER variants use immutable revisions and static hashes", () => {
  for (const variant of Object.values(NER_VARIANTS)) {
    expect(variant.revision).not.toBe("main");
    expect(variant.expectedConfigSha256).not.toMatch(/^LOCAL_PIN:/);
    expect(variant.expectedConfigSha256).not.toMatch(/^PLACEHOLDER:/);
  }
});
```

## Acceptatiecriteria

- Geen NER-releasevariant gebruikt `main`.
- Geen NER-releasevariant gebruikt `LOCAL_PIN`.
- Egress faalt als modelintegriteit niet `verified` is.

