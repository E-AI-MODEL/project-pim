// §11.3 1.41-1.42 — modelgate gedrag.
import { beforeEach, describe, expect, it } from "vitest";
import { modelGateFor } from "../modelGate";
import { _resetIntegrityRegistry, verifyModel, type ModelIntegrityRecord } from "../modelIntegrity";

const rec = (status: ModelIntegrityRecord["status"]): ModelIntegrityRecord => ({
  key: "ner_multilingual", modelId: "x", status,
  expected: "e", actual: "a", message: "", timestamp: new Date().toISOString(),
});

beforeEach(() => {
  _resetIntegrityRegistry();
  localStorage.clear();
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

describe("browser-local model pins", () => {
  it("pint een modelconfig lokaal bij eerste verificatie", async () => {
    const first = await verifyModel("ner_multilingual", "{\"model\":\"v1\"}", {
      modelId: "test/model",
      expected: "LOCAL_PIN:test/model@abc/config.json",
    });

    expect(first.status).toBe("verified");
    expect(first.actual).toMatch(/^[a-f0-9]{64}$/);
    expect(localStorage.length).toBe(1);
  });

  it("blokkeert als een lokaal gepinde modelconfig verandert", async () => {
    await verifyModel("ner_multilingual", "{\"model\":\"v1\"}", {
      modelId: "test/model",
      expected: "LOCAL_PIN:test/model@abc/config.json",
    });

    const second = await verifyModel("ner_multilingual", "{\"model\":\"v2\"}", {
      modelId: "test/model",
      expected: "LOCAL_PIN:test/model@abc/config.json",
    });

    expect(second.status).toBe("mismatch");
    expect(modelGateFor("education-nl-full", "copy", [second]).verified).toBe(false);
  });
});
