import { describe, expect, it } from "vitest";
import { executeAction } from "../egressGuard";
import type { CertifiedPayload, PimDecision, PayloadType } from "../types";

const baseDecision = (action: PimDecision["action"]): PimDecision => ({
  verdict: "ALLOW",
  reason: "ok",
  reasonCode: "OK",
  ruleId: "test",
  policyVersion: "test",
  riskLevel: "low",
  mode: "anonymous",
  action,
  timestamp: new Date().toISOString(),
  payloadType: "draft_anonymous_certified",
});

const cert = (type: PayloadType): CertifiedPayload => ({
  text: "Lege schone tekst.",
  mode: "anonymous",
  payloadType: type,
  guardStatus: "pass",
});

describe("executeAction payload-type gate", () => {
  for (const bad of ["raw_input", "mapping", "restored", "unknown", "draft_pseudonymous_local"] as PayloadType[]) {
    it(`copy met payloadType=${bad} wordt geweigerd`, async () => {
      const r = await executeAction(baseDecision("copy"), cert(bad));
      expect(r.executed).toBe(false);
      expect(r.reason).toMatch(/payload-type/i);
    });

    it(`export met payloadType=${bad} wordt geweigerd`, async () => {
      const r = await executeAction(baseDecision("export_file"), cert(bad));
      expect(r.executed).toBe(false);
    });
  }

  it("BLOCK-besluit wordt nooit uitgevoerd, ongeacht payload", async () => {
    const d = { ...baseDecision("copy"), verdict: "BLOCK" as const };
    const r = await executeAction(d, cert("draft_anonymous_certified"));
    expect(r.executed).toBe(false);
  });
});
