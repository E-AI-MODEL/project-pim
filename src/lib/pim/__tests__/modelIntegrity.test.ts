// §11.3 1.41–1.42 — modelgate gedrag.
import { describe, expect, it } from "vitest";
import { modelGateFor } from "../modelGate";
import type { ModelIntegrityRecord } from "../modelCatalog";

const rec = (status: ModelIntegrityRecord["status"]): ModelIntegrityRecord => ({
  key: "ner_multilingual", modelId: "x", status,
  expected: "e", actual: "a", message: "", timestamp: new Date().toISOString(),
});

describe("modelGateFor", () => {
  it("rules-only profiel is altijd verified", () => {
    expect(modelGateFor("education-nl-rules-only", "send_external_ai", []).verified).toBe(true);
  });

  it("full + verified + egress => verified", () => {
    expect(modelGateFor("education-nl-full", "copy", [rec("verified")]).verified).toBe(true);
  });

  it("full + placeholder + egress => false (productieclaim eerlijk)", () => {
    expect(modelGateFor("education-nl-full", "send_external_ai", [rec("placeholder")]).verified).toBe(false);
  });

  it("full + mismatch + egress => false", () => {
    expect(modelGateFor("education-nl-full", "copy", [rec("mismatch")]).verified).toBe(false);
  });

  it("full + missing + egress => false (1.42)", () => {
    expect(modelGateFor("education-nl-full", "copy", []).verified).toBe(false);
  });

  it("full + placeholder + lokale actie => true (demo OK)", () => {
    expect(modelGateFor("education-nl-full", "display", [rec("placeholder")]).verified).toBe(true);
  });
});