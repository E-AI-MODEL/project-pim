import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeAction } from "../egressGuard";
import type { CertifiedPayload, PimDecision } from "../types";

const allowDecision = (action: PimDecision["action"]): PimDecision => ({
  verdict: "ALLOW",
  reason: "ok",
  reasonCode: "OK",
  ruleId: "test.e2e",
  policyVersion: "test",
  riskLevel: "low",
  mode: "anonymous",
  action,
  timestamp: new Date().toISOString(),
  profileId: "education-nl-full",
  payloadType: "draft_anonymous_certified",
});

const certified = (
  text = "Clean anonymous text without direct identifiers.",
): CertifiedPayload => ({
  text,
  mode: "anonymous",
  payloadType: "draft_anonymous_certified",
  profileId: "education-nl-rules-only",
  guardStatus: "pass",
  // Gebruiker draait bewust zonder BERT: de re-consult mag dan lokaal
  // kopieren/printen/delen toestaan met waarschuwing, maar niet exporteren.
  detectionSettings: { regex: true, lexicon: true, context: true, bert: "off" },
});

function installBrowserStubs() {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:pim-test"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(window, "open").mockReturnValue({
    document: { write: vi.fn(), close: vi.fn() },
    focus: vi.fn(),
    print: vi.fn(),
  } as unknown as Window);
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  installBrowserStubs();
});

describe("egress pipeline e2e", () => {
  it.each(["copy", "print", "share"] as const)(
    "%s only executes a clean certified anonymous payload",
    async (action) => {
      const result = await executeAction(allowDecision(action), certified());
      expect(result.executed).toBe(true);
    },
  );

  it.each(["export_file", "send_external_ai"] as const)(
    "%s is fail-closed when a detection layer did not run",
    async (action) => {
      const result = await executeAction(allowDecision(action), certified());
      expect(result.executed).toBe(false);
      expect(result.reason).toMatch(/re-consult BLOCK/i);
    },
  );

  it("blocks copy when re-consult finds a direct identifier", async () => {
    const contact = ["test.docent", "voorbeeldschool.nl"].join(String.fromCharCode(64));
    const result = await executeAction(
      allowDecision("copy"),
      certified(`This payload still contains ${contact}.`),
    );

    expect(result.executed).toBe(false);
    expect(result.reason).toMatch(/re-consult BLOCK/i);
  });

  it("does not call fetch for send_external_ai in this build", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await executeAction(allowDecision("send_external_ai"), certified());

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.executed).toBe(false);
  });
});
