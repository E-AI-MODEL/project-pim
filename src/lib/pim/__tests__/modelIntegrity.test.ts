import { beforeEach, describe, expect, it } from "vitest";
import { modelGateFor } from "../modelGate";
import { _resetIntegrityRegistry, verifyModel, type ModelIntegrityRecord } from "../modelIntegrity";
import { DEFAULT_DETECTION_SETTINGS, RULES_ONLY_DETECTION_SETTINGS } from "../detectionSettings";

const rec = (status: ModelIntegrityRecord["status"]): ModelIntegrityRecord => ({
  key: "ner_multilingual", modelId: "x", status,
  expected: "e", actual: "a", message: "", timestamp: new Date().toISOString(),
});

beforeEach(() => {
  _resetIntegrityRegistry();
  localStorage.clear();
});

describe("modelGateFor", () => {
  it("BERT uit => geen model nodig", () => {
    expect(modelGateFor("send_external_ai", RULES_ONLY_DETECTION_SETTINGS, []).verified).toBe(true);
  });

  it("BERT aan + verified + egress => verified", () => {
    expect(modelGateFor("copy", DEFAULT_DETECTION_SETTINGS, [rec("verified")]).verified).toBe(true);
  });

  it("BERT aan + placeholder + egress => false", () => {
    expect(modelGateFor("send_external_ai", DEFAULT_DETECTION_SETTINGS, [rec("placeholder")]).verified).toBe(false);
  });

  it("BERT aan + mismatch + egress => false", () => {
    expect(modelGateFor("copy", DEFAULT_DETECTION_SETTINGS, [rec("mismatch")]).verified).toBe(false);
  });

  it("BERT aan + missing + egress => false", () => {
    expect(modelGateFor("copy", DEFAULT_DETECTION_SETTINGS, []).verified).toBe(false);
  });

  it("BERT aan + placeholder + lokale actie => true", () => {
    expect(modelGateFor("display", DEFAULT_DETECTION_SETTINGS, [rec("placeholder")]).verified).toBe(true);
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
    expect(modelGateFor("copy", DEFAULT_DETECTION_SETTINGS, [second]).verified).toBe(false);
  });
});
