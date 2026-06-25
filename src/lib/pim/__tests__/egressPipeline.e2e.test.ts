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

const certified = (text = "Schone geanonimiseerde tekst zonder directe PII."): CertifiedPayload => ({
  text,
  mode: "anonymous",
  payloadType: "draft_anonymous_certified",
  profileId: "education-nl-rules-only",
  guardStatus: "pass",
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
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:pim-test");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
  vi.spyOn(window, "open").mockReturnValue({
    document: { write: vi.fn(), close: vi.fn() },
    focus: vi.fn(),
    print: vi.fn(),
  } as unknown as Window);
}

beforeEach(() => {
  vi.restoreAllMocks();
  installBrowserStubs();
});

describe("egress pipeline e2e", () => {
  it.each(["copy", "export_file", "print", "share", "send_external_ai"] as const)(
    "%s voert alleen een gecertificeerde schone anonymous payload uit",
    async (action) => {
      const result = await executeAction(allowDecision(action), certified());

      expect(result.executed).toBe(true);
    },
  );

  it("blokkeert copy als de werkelijke payload bij re-consult toch directe PII bevat", async () => {
    const fakeEmail = ["test.docent", "voorbeeldschool.nl"].join("@");
    const result = await executeAction(
      allowDecision("copy"),
      certified(`Deze payload bevat alsnog ${fakeEmail}.`),
    );

    expect(result.executed).toBe(false);
    expect(result.reason).toMatch(/re-consult BLOCK/i);
  });

  it("stuurt send_external_ai nooit naar een endpoint in deze build", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await executeAction(allowDecision("send_external_ai"), certified());

    expect(result.executed).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.reason).toMatch(/Geen endpoint geconfigureerd/i);
  });
});
