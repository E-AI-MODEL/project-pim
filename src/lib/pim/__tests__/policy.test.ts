import { describe, expect, it } from "vitest";
import { decide } from "../policy";
import type { DraftCheckResult, PrivacySignals } from "../types";

const emptySignals: PrivacySignals = {
  directPii: [],
  contextualPii: [],
  riskScore: 0,
  riskLevel: "low",
  reasons: [],
  ruleIds: [],
};
const passCheck: DraftCheckResult = { status: "pass", issues: [] };

describe("policy.decide — basis", () => {
  it("ALLOW bij anonymous + display + pass + verified + certified payload", () => {
    const d = decide({
      mode: "anonymous",
      action: "display",
      signals: emptySignals,
      draftCheck: passCheck,
      modelVerified: true,
      profileId: "education-nl-full",
      payloadType: "draft_anonymous_certified",
    });
    expect(d.verdict).toBe("ALLOW");
  });

  it("BLOCK bij modelVerified=false", () => {
    const d = decide({
      mode: "anonymous",
      action: "copy",
      signals: emptySignals,
      draftCheck: passCheck,
      modelVerified: false,
      profileId: "education-nl-full",
      payloadType: "draft_anonymous_certified",
    });
    expect(d.verdict).toBe("BLOCK");
    expect(d.flag).toBe("PIM_MODEL_INTEGRITY_BLOCK");
  });

  it("besluit bevat profileId + payloadType", () => {
    const d = decide({
      mode: "anonymous",
      action: "display",
      signals: emptySignals,
      draftCheck: passCheck,
      modelVerified: true,
      profileId: "education-nl-rules-only",
      payloadType: "draft_anonymous_certified",
    });
    expect(d.profileId).toBe("education-nl-rules-only");
    expect(d.payloadType).toBe("draft_anonymous_certified");
  });
});
