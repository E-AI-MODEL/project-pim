// Model Catalog, spec hfst 9 / 14 / v3-2.
//
// Dit bestand bevat catalogusdata en types. Runtime-integriteit,
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
  expectedConfigSha256: string;
  /** Alleen gezet voor modellen waarvan ook het tokenizerbestand gepind is. */
  expectedTokenizerSha256?: string;
  releaseStatus: "release-1" | "design-only";
  notes: string;
}

export const MODEL_CATALOG = {
  ner_multilingual: {
    id: "ner_multilingual",
    modelId: "Xenova/distilbert-base-multilingual-cased-ner-hrl",
    revision: "c2a4dbf593c57f47004c5bc2d3770d311aee9c43",
    task: "token-classification",
    preferredDevice: "webgpu",
    fallbackDevice: "wasm",
    expectedConfigSha256: "38847be4dc6699b1218a749ed69f888c2ccc7b4deba98e3c4a1cac8cb34d54c8",
    expectedTokenizerSha256: "bf1b59b7b11c95f194f51708d918eea378e09d05f84c0e1656dc5180e8117088",
    releaseStatus: "release-1",
    notes:
      "Multilingual DistilBERT NER (PER/ORG/LOC). Immutable revision + vaste config-hash, ~100 MB.",
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
    expectedConfigSha256: "LOCAL_PIN:Qwen2.5-0.5B-Instruct-q4f16_1-MLC@main/web-llm-manifest",
    releaseStatus: "design-only",
    notes:
      "Experimentele generalisatie-LLM via @mlc-ai/web-llm (~400MB, on-demand). Niet productie-gepind (revision main + browser-local pin); alleen demo in Diagnostiek. Productie-egress geblokkeerd totdat een immutable revision + statische hash worden vastgelegd.",
  },
} as const satisfies Record<string, CatalogEntry>;

export type CatalogKey = keyof typeof MODEL_CATALOG;

export type NerVariantKey = "small" | "large";

export interface NerVariant {
  key: NerVariantKey;
  modelId: string;
  revision: string;
  expectedConfigSha256: string;
  expectedTokenizerSha256: string;
  label: string;
  sizeLabel: string;
  notes: string;
}

export const NER_VARIANTS: Record<NerVariantKey, NerVariant> = {
  small: {
    key: "small",
    modelId: "Xenova/distilbert-base-multilingual-cased-ner-hrl",
    revision: "c2a4dbf593c57f47004c5bc2d3770d311aee9c43",
    expectedConfigSha256: "38847be4dc6699b1218a749ed69f888c2ccc7b4deba98e3c4a1cac8cb34d54c8",
    expectedTokenizerSha256: "bf1b59b7b11c95f194f51708d918eea378e09d05f84c0e1656dc5180e8117088",
    label: "Compact (DistilBERT)",
    sizeLabel: "~100 MB",
    notes: "Lichter en sneller. Recall niet extern gevalideerd op een onafhankelijk corpus.",
  },
  large: {
    key: "large",
    modelId: "Xenova/bert-base-multilingual-cased-ner-hrl",
    revision: "263e82c06569c8c2ac46238a7ae5107598934234",
    expectedConfigSha256: "7aa891abae067f95a40f5e2005b3de44824a083f256802934a993d301ec25076",
    expectedTokenizerSha256: "bf1b59b7b11c95f194f51708d918eea378e09d05f84c0e1656dc5180e8117088",
    label: "Volledig (mBERT)",
    sizeLabel: "~180 MB",
    notes:
      "Zwaarder maar vindt doorgaans meer namen/organisaties. Recall niet extern gevalideerd op een onafhankelijk corpus.",
  },
};

export const DEFAULT_NER_VARIANT: NerVariantKey = "small";

export {
  _resetIntegrityRegistry,
  getModelIntegrity,
  isDemoAcceptable,
  isProductionVerified,
  onModelIntegrity,
  sha256Hex,
  verifyModel,
} from "./modelIntegrity";
export type { ModelIntegrityRecord, ModelIntegrityStatus } from "./modelIntegrity";
