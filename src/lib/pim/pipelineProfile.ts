// PipelineProfile, spec hfst 15 / v3-2.
// Release 1 scope: alleen education-nl. Twee profielen: full en rules-only.
// Andere profielen blijven ontwerpvoorbereiding (zichtbaar maar niet selecteerbaar).

export type PipelineProfileId =
  | "education-nl-full"
  | "education-nl-rules-only"
  | "healthcare-nl" // design-only
  | "generic-nl" // design-only
  | "generic-en"; // design-only

export interface PipelineProfile {
  id: PipelineProfileId;
  domain: "education-nl" | "healthcare-nl" | "generic-nl" | "generic-en";
  label: string;
  description: string;
  detectors: {
    rules: boolean;
    specialLexicon: boolean;
    nerSlm: boolean;
    contextSlm: boolean;
    rewriteLlm: boolean;
  };
  egressPolicy: "full" | "degrade_no_export" | "design_only";
  releaseStatus: "release-1" | "design-only";
}

export const PIPELINE_PROFILES: Record<PipelineProfileId, PipelineProfile> = {
  "education-nl-full": {
    id: "education-nl-full",
    domain: "education-nl",
    label: "Education NL, Full",
    description:
      "Regels + special lexicon + NER SLM + onderwijscontext-detector. Volledige egress alleen na alle gates groen.",
    detectors: {
      rules: true,
      specialLexicon: true,
      nerSlm: true,
      contextSlm: true,
      rewriteLlm: false,
    },
    egressPolicy: "full",
    releaseStatus: "release-1",
  },
  "education-nl-rules-only": {
    id: "education-nl-rules-only",
    domain: "education-nl",
    label: "Education NL, Rules-only",
    description:
      "Alleen regex + special lexicon. Geen modelafhankelijkheid, dus geen modelintegriteit-blokkade. Egress is gedegradeerd: geen export of externe AI.",
    detectors: {
      rules: true,
      specialLexicon: true,
      nerSlm: false,
      contextSlm: false,
      rewriteLlm: false,
    },
    egressPolicy: "degrade_no_export",
    releaseStatus: "release-1",
  },
  "healthcare-nl": {
    id: "healthcare-nl",
    domain: "healthcare-nl",
    label: "Healthcare NL",
    description: "Ontwerpvoorbereiding. Niet vrijgegeven in release 1.",
    detectors: {
      rules: true,
      specialLexicon: true,
      nerSlm: true,
      contextSlm: false,
      rewriteLlm: false,
    },
    egressPolicy: "design_only",
    releaseStatus: "design-only",
  },
  "generic-nl": {
    id: "generic-nl",
    domain: "generic-nl",
    label: "Generic NL",
    description: "Ontwerpvoorbereiding. Niet vrijgegeven in release 1.",
    detectors: {
      rules: true,
      specialLexicon: false,
      nerSlm: true,
      contextSlm: false,
      rewriteLlm: false,
    },
    egressPolicy: "design_only",
    releaseStatus: "design-only",
  },
  "generic-en": {
    id: "generic-en",
    domain: "generic-en",
    label: "Generic EN",
    description: "Ontwerpvoorbereiding. Niet vrijgegeven in release 1.",
    detectors: {
      rules: true,
      specialLexicon: false,
      nerSlm: true,
      contextSlm: false,
      rewriteLlm: false,
    },
    egressPolicy: "design_only",
    releaseStatus: "design-only",
  },
};

export const RELEASE_1_PROFILES: PipelineProfileId[] = [
  "education-nl-full",
  "education-nl-rules-only",
];

export const DEFAULT_PROFILE: PipelineProfileId = "education-nl-full";

export function isReleaseProfile(id: PipelineProfileId): boolean {
  return RELEASE_1_PROFILES.includes(id);
}
