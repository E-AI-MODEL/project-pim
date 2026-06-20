// Privacy-invarianten §11.3 — rules-only (1.43, 1.44).
import { describe, expect, it } from "vitest";
import { decide } from "../policy";
import type { DraftCheckResult, PrivacySignals } from "../types";

const sig: PrivacySignals = { directPii: [], contextualPii: [], riskScore: 0, riskLevel: "low", reasons: [], ruleIds: [] };
const ok: DraftCheckResult = { status: "pass", issues: [] };

describe("rules-only profielbeleid", () => {
  it("rules-only + send_external_ai => BLOCK", () => {
    const d = decide({
      mode: "anonymous", action: "send_external_ai", signals: sig, draftCheck: ok,
      modelVerified: true, profileId: "education-nl-rules-only", payloadType: "draft_anonymous_certified",
    });
    expect(d.verdict).toBe("BLOCK");
    expect(d.flag).toBe("PIM_RULES_ONLY_EXTERNAL_AI_BLOCK");
  });

  it("rules-only + export_file => BLOCK", () => {
    const d = decide({
      mode: "anonymous", action: "export_file", signals: sig, draftCheck: ok,
      modelVerified: true, profileId: "education-nl-rules-only", payloadType: "draft_anonymous_certified",
    });
    expect(d.verdict).toBe("BLOCK");
    expect(d.flag).toBe("PIM_RULES_ONLY_EXPORT_BLOCK");
  });

  it("rules-only + display => ALLOW", () => {
    const d = decide({
      mode: "anonymous", action: "display", signals: sig, draftCheck: ok,
      modelVerified: true, profileId: "education-nl-rules-only", payloadType: "draft_anonymous_certified",
    });
    expect(d.verdict).toBe("ALLOW");
  });

  it("design-only profiel blokkeert alle egress", () => {
    const d = decide({
      mode: "anonymous", action: "copy", signals: sig, draftCheck: ok,
      modelVerified: true, profileId: "healthcare-nl", payloadType: "draft_anonymous_certified",
    });
    expect(d.verdict).toBe("BLOCK");
    expect(d.flag).toBe("PIM_PROFILE_DESIGN_ONLY_BLOCK");
  });
});