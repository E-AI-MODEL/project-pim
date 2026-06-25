// Model Catalog — spec hfst 9 / 14 / v3-2.
//
// Dit bestand bevat alleen catalogusdata en types. Runtime-integriteit,
// browser-local pins en registry-state staan in modelIntegrity.ts.

export type ModelTask = "token-classification" | "text-classification" | "text-generation";
export type ModelDevice = "webgpu" | "wasm";

export interface CatalogEntry {
  id: string;
  modelId: string;
  revision: string;
  task: ModelTask;
  preferredDevice: ModelDevice;
  fallbackDevice: ModelDevice | null;
  /** Concrete SHA-256, PLACEHOLDER:* or LOCAL_PIN:* */
  expectedConfigSha256: string;
  releaseStatus: "release-1" | "design-only";
  notes: string;
}

export const MODEL_CATALOG = {
  ner_multilingual: {
    id: "ner_multilingual",
    modelId: "Xenova/distilbert-base-multilingual-cased-ner-hrl",
    revision: "main",
    task: "token-classification",
    preferredDevice: "webgpu",
    fallbackDevice: "wasm",
    expectedConfigSha256: "LOCAL_PIN:Xenova/distilbert-base-multilingual-cased-ner-hrl@main/config.json",
    releaseStatus: "release-1",
    notes: "Multilingual DistilBERT NER (PER/ORG/LOC). Browser-local config pin, ~100 MB.",
  },
  context_education: {
    id: "context_education",
    modelId: "pim-education/context-nl-education-v2",
    revision: "v2.0.0",
    task: "text-classification",
    preferredDevice: "wasm",
    fallbackDevice: null,
    expectedConfigSha256: "PLACEHOLDER:context-nl-education-v2-not-yet-published",
    releaseStatus: "design-only",
    notes: "Onderwijs-contextdetector. Vereist mirror voor productie.",
  },
  rewrite_qwen: {
    id: "rewrite_qwen",
    modelId: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    revision: "main",
    task: "text-generation",
    preferredDevice: "webgpu",
    fallbackDevice: null,
    expectedConfigSha256: "PLACEHOLDER:qwen2-5-0-5b-instruct-q4f16",
    releaseStatus: "design-only",
    notes: "Browser-LLM rewrite via @mlc-ai/web-llm (~400MB, on-demand).",
  },
} as const satisfies Record<string, CatalogEntry>;

export type CatalogKey = keyof typeof MODEL_CATALOG;

export type NerVariantKey = "small" | "large";

export interface NerVariant {
  key: NerVariantKey;
  modelId: string;
  revision: string;
  expectedConfigSha256: string;
  label: string;
  sizeLabel: string;
  notes: string;
}

export const NER_VARIANTS: Record<NerVariantKey, NerVariant> = {
  small: {
    key: "small",
    modelId: "Xenova/distilbert-base-multilingual-cased-ner-hrl",
    revision: "main",
    expectedConfigSha256: "LOCAL_PIN:Xenova/distilbert-base-multilingual-cased-ner-hrl@main/config.json",
    label: "Compact (DistilBERT)",
    sizeLabel: "~100 MB",
    notes: "Lichter en sneller; iets lagere recall. Standaard.",
  },
  large: {
    key: "large",
    modelId: "Xenova/bert-base-multilingual-cased-ner-hrl",
    revision: "main",
    expectedConfigSha256: "LOCAL_PIN:Xenova/bert-base-multilingual-cased-ner-hrl@main/config.json",
    label: "Volledig (mBERT)",
    sizeLabel: "~180 MB",
    notes: "Zwaarder maar hogere recall; vindt meer namen/organisaties.",
  },
};

export const DEFAULT_NER_VARIANT: NerVariantKey = "small";
