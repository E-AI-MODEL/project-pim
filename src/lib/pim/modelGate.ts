// Model integrity gate — spec derde analyse §4.4.
// Vervangt de hardcoded `modelVerified: true` in try.tsx.
//
// Regels:
//  - Rules-only profiel heeft GEEN model nodig → altijd verified.
//  - Lokale acties (display/save_local/restore) mogen bij placeholder/demo.
//  - Uitgaande acties (copy/export/print/share/send_external_ai) vereisen
//    een ECHTE verified status; placeholder of mismatch/missing = false.

import type { Action } from "./types";
import { PIPELINE_PROFILES, type PipelineProfileId } from "./pipelineProfile";
import type { ModelIntegrityRecord } from "./modelIntegrity";

const EGRESS_ACTIONS: ReadonlySet<Action> = new Set([
  "copy", "export_file", "print", "share", "send_external_ai",
]);

export type ModelGateReason =
  | "rules-only-profile-no-model-needed"
  | "local-action-demo-acceptable"
  | "ner-required-and-verified"
  | "ner-required-but-placeholder"
  | "ner-required-but-mismatch"
  | "ner-required-but-missing"
  | "ner-required-but-unverified";

export interface ModelGateResult {
  verified: boolean;
  reason: ModelGateReason;
  detail: string;
}

export function modelGateFor(
  profileId: PipelineProfileId,
  action: Action,
  integrity: ModelIntegrityRecord[],
): ModelGateResult {
  const profile = PIPELINE_PROFILES[profileId];

  // Rules-only — geen modelafhankelijkheid, altijd verified.
  if (!profile.detectors.nerSlm) {
    return {
      verified: true,
      reason: "rules-only-profile-no-model-needed",
      detail: "Profiel gebruikt geen modellen — integriteitsgate niet van toepassing.",
    };
  }

  const ner = integrity.find((r) => r.key === "ner_multilingual");
  const isLocal = !EGRESS_ACTIONS.has(action);

  if (!ner) {
    // Voor lokale acties zonder NER toegestaan; egress blokkeert.
    return isLocal
      ? { verified: true, reason: "local-action-demo-acceptable", detail: "NER nog niet geladen — lokale actie toegestaan." }
      : { verified: false, reason: "ner-required-but-missing", detail: "NER vereist voor uitgaande actie — model nog niet geladen." };
  }

  if (ner.status === "verified") {
    return { verified: true, reason: "ner-required-and-verified", detail: "NER hash match — productiegate groen." };
  }
  if (ner.status === "mismatch") {
    return { verified: false, reason: "ner-required-but-mismatch", detail: "NER hash mismatch — alle uitgaande acties geblokkeerd." };
  }
  if (ner.status === "missing") {
    return isLocal
      ? { verified: true, reason: "local-action-demo-acceptable", detail: "NER missing — lokale actie toegestaan." }
      : { verified: false, reason: "ner-required-but-missing", detail: "NER ontbreekt — uitgaande actie geblokkeerd." };
  }
  if (ner.status === "placeholder") {
    // Demo-hash mag wel lokaal, maar niet productie-egress (§4.8).
    return isLocal
      ? { verified: true, reason: "local-action-demo-acceptable", detail: "Demo-hash (placeholder) — alleen lokale actie." }
      : { verified: false, reason: "ner-required-but-placeholder", detail: "Modelhash is een demo-placeholder — uitgaande acties vereisen productie-verified status." };
  }
  // unverified / unknown
  return isLocal
    ? { verified: true, reason: "local-action-demo-acceptable", detail: "NER nog niet geverifieerd — lokale actie toegestaan." }
    : { verified: false, reason: "ner-required-but-unverified", detail: "NER nog niet geverifieerd — uitgaande actie geblokkeerd." };
}
