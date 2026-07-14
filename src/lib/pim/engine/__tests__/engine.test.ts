import { describe, expect, it } from "vitest";
import { createEngine } from "../engine";
import { DEFAULT_DETECTION_SETTINGS } from "../../detectionSettings";

function make(overrides: Partial<Parameters<typeof createEngine>[0]> = {}) {
  return createEngine({
    detectionSettings: DEFAULT_DETECTION_SETTINGS,
    modelVerified: true,
    bertEnabled: true,
    strictMode: false,
    ...overrides,
  });
}

describe("PimEngine — happy path", () => {
  it("anonymous clean text → ALLOW display + certified payload", () => {
    const engine = make();
    const state = engine.evaluate({ mode: "anonymous", text: "De methode werkt beter." });
    expect(state.phase).toBe("ready");
    expect(state.guard?.status).toBe("pass");
    expect(state.payloadType).toBe("draft_anonymous_certified");
    expect(state.displayDecision?.verdict).toBe("ALLOW");
  });

  it("residual PII in raw text still yields certified draft after anonymize", () => {
    const engine = make();
    const state = engine.evaluate({
      mode: "anonymous",
      text: "Mail naar test@voorbeeld.nl vandaag.",
    });
    expect(state.signals!.directPii.length).toBeGreaterThan(0);
    expect(state.guard?.status).toBe("pass");
    expect(state.payloadType).toBe("draft_anonymous_certified");
  });
});

describe("PimEngine — lock-principe (BERT off)", () => {
  it("strict mode blocks external AI action", async () => {
    const engine = make({ bertEnabled: false, strictMode: true });
    engine.evaluate({ mode: "anonymous", text: "Schone tekst zonder PII." });
    const outcome = await engine.requestAction({ action: "send_external_ai" });
    expect(outcome.verdict).toBe("BLOCK");
    expect(outcome.executed).toBe(false);
  });

  it("non-strict mode warns on external AI", async () => {
    const engine = make({ bertEnabled: false, strictMode: false });
    engine.evaluate({ mode: "anonymous", text: "Schone tekst zonder PII." });
    const outcome = await engine.requestAction({ action: "send_external_ai" });
    expect(outcome.verdict).toBe("ALLOW_WITH_WARNING");
  });

  it("copy stays ALLOW when BERT off (not strict)", async () => {
    const engine = make({ bertEnabled: false, strictMode: false });
    engine.evaluate({ mode: "anonymous", text: "Schone tekst zonder PII." });
    const outcome = await engine.requestAction({ action: "copy" });
    expect(outcome.verdict).toBe("ALLOW");
  });
});

describe("PimEngine — integrity + payload gate", () => {
  it("modelVerified=false blocks any egress", async () => {
    const engine = make({ modelVerified: false });
    engine.evaluate({ mode: "anonymous", text: "Schone tekst." });
    const outcome = await engine.requestAction({ action: "copy" });
    expect(outcome.verdict).toBe("BLOCK");
    expect(outcome.decision.flag).toBe("PIM_MODEL_INTEGRITY_BLOCK");
  });

  it("pseudonymous copy is blocked (payload-type)", async () => {
    const engine = make();
    engine.evaluate({ mode: "pseudonymous", text: "Jan Jansen belt naar school." });
    const outcome = await engine.requestAction({ action: "copy" });
    expect(outcome.verdict).toBe("BLOCK");
  });
});

describe("PimEngine — lifecycle", () => {
  it("requestAction before evaluate throws", async () => {
    const engine = make();
    await expect(engine.requestAction({ action: "copy" })).rejects.toThrow(/before evaluate/);
  });

  it("reset clears state", () => {
    const engine = make();
    engine.evaluate({ mode: "anonymous", text: "Hallo." });
    expect(engine.getState().phase).toBe("ready");
    engine.reset();
    expect(engine.getState().phase).toBe("idle");
  });

  it("subscribers receive state on change", () => {
    const engine = make();
    const seen: string[] = [];
    const unsub = engine.subscribe((s) => seen.push(s.phase));
    engine.evaluate({ mode: "anonymous", text: "Hallo." });
    engine.reset();
    unsub();
    expect(seen).toEqual(["idle", "ready", "idle"]);
  });
});