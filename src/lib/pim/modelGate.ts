// Model integrity gate for profile-free detection layers.

import type { Action } from "./types";
import { coerceDetectionSettings, usesBert, type DetectionLayerSettings } from "./detectionSettings";
import type { ModelIntegrityRecord } from "./modelIntegrity";

const EGRESS_ACTIONS: ReadonlySet<Action> = new Set([
  "copy", "export_file", "print", "share", "send_external_ai",
]);

export type ModelGateReason =
  | "no-model-needed"
  | "local-action-model-not-required"
  | "bert-required-and-verified"
  | "bert-required-but-placeholder"
  | "bert-required-but-mismatch"
  | "bert-required-but-missing"
  | "bert-required-but-unverified";

export interface ModelGateResult {
  verified: boolean;
  reason: ModelGateReason;
  detail: string;
}

function isAction(v: unknown): v is Action {
  return typeof v === "string" && ["display", "copy", "save_local", "restore", "export_file", "send_external_ai", "print", "share"].includes(v);
}

export function modelGateFor(
  actionOrLegacyProfile: Action | string,
  settingsOrAction: DetectionLayerSettings | string | Action,
  integrity: ModelIntegrityRecord[],
): ModelGateResult {
  const action = isAction(actionOrLegacyProfile) ? actionOrLegacyProfile : (settingsOrAction as Action);
  const settingsInput = isAction(actionOrLegacyProfile) ? settingsOrAction : undefined;
  const settings = coerceDetectionSettings(settingsInput as DetectionLayerSettings | string | undefined);
  const isLocal = !EGRESS_ACTIONS.has(action);

  if (!usesBert(settings)) {
    return {
      verified: true,
      reason: "no-model-needed",
      detail: "BERT staat uit — Regex, Lexicon en Context blijven werken.",
    };
  }

  const ner = integrity.find((r) => r.key === "ner_multilingual");

  if (!ner) {
    return isLocal
      ? { verified: true, reason: "local-action-model-not-required", detail: "BERT is nog niet geverifieerd — lokale actie toegestaan." }
      : { verified: false, reason: "bert-required-but-missing", detail: "BERT is gekozen voor deze controle, maar nog niet geladen of geverifieerd." };
  }

  if (ner.status === "verified") return { verified: true, reason: "bert-required-and-verified", detail: "BERT-integriteit is geverifieerd." };
  if (ner.status === "mismatch") return { verified: false, reason: "bert-required-but-mismatch", detail: "BERT-integriteit klopt niet. Uitgaande acties blijven geblokkeerd." };
  if (ner.status === "missing") {
    return isLocal
      ? { verified: true, reason: "local-action-model-not-required", detail: "BERT ontbreekt — lokale actie toegestaan." }
      : { verified: false, reason: "bert-required-but-missing", detail: "BERT ontbreekt — uitgaande actie geblokkeerd." };
  }
  if (ner.status === "placeholder") {
    return isLocal
      ? { verified: true, reason: "local-action-model-not-required", detail: "BERT heeft alleen lokale pin/config — lokale actie toegestaan." }
      : { verified: false, reason: "bert-required-but-placeholder", detail: "BERT is niet productie-verified voor uitgaande actie." };
  }
  return isLocal
    ? { verified: true, reason: "local-action-model-not-required", detail: "BERT nog niet geverifieerd — lokale actie toegestaan." }
    : { verified: false, reason: "bert-required-but-unverified", detail: "BERT nog niet geverifieerd — uitgaande actie geblokkeerd." };
}
