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
const bertOff = { regex: true as const, lexicon: true, context: true, bert: "off" as const };
const bertOn = { regex: true as const, lexicon: true, context: true, bert: "100mb" as const };

describe("policy strict mode", () => {
  it("allows display with BERT on", () => {
    const d = decide({
      mode: "anonymous",
      action: "display",
      signals: emptySignals,
      draftCheck: passCheck,
      modelVerified: true,
      payloadType: "draft_anonymous_certified",
      detectionSettings: bertOn,
    });
    expect(d.verdict).toBe("ALLOW");
  });

  it("does not expose profileId", () => {
    const d = decide({
      mode: "anonymous",
      action: "display",
      signals: emptySignals,
      draftCheck: passCheck,
      modelVerified: true,
      payloadType: "draft_anonymous_certified",
      detectionSettings: bertOn,
    });
    expect(Object.prototype.hasOwnProperty.call(d, "profileId")).toBe(false);
  });

  it("blocks send_external_ai in strict mode when BERT is off", () => {
    const d = decide({
      mode: "anonymous",
      action: "send_external_ai",
      signals: emptySignals,
      draftCheck: passCheck,
      modelVerified: true,
      payloadType: "draft_anonymous_certified",
      detectionSettings: bertOff,
      strictMode: true,
    });
    expect(d.verdict).toBe("BLOCK");
    expect(d.flag).toBe("PIM_RULES_ONLY_EXTERNAL_AI_BLOCK");
  });

  it("blocks export_file in strict mode when BERT is off", () => {
    const d = decide({
      mode: "anonymous",
      action: "export_file",
      signals: emptySignals,
      draftCheck: passCheck,
      modelVerified: true,
      payloadType: "draft_anonymous_certified",
      detectionSettings: bertOff,
      strictMode: true,
    });
    expect(d.verdict).toBe("BLOCK");
    expect(d.flag).toBe("PIM_RULES_ONLY_EXPORT_BLOCK");
  });
});
