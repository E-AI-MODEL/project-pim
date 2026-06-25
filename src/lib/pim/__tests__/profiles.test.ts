import { describe, expect, it } from "vitest";
import { decide } from "../policy";
import { DEFAULT_DETECTION_SETTINGS, RULES_ONLY_DETECTION_SETTINGS } from "../detectionSettings";
import type { DraftCheckResult, PrivacySignals } from "../types";

const sig: PrivacySignals = { directPii: [], contextualPii: [], riskScore: 0, riskLevel: "low", reasons: [], ruleIds: [] };
const ok: DraftCheckResult = { status: "pass", issues: [] };

describe("profile-free layer policy", () => {
  it("BERT uit blokkeert send_external_ai niet meer op profielbeleid", () => {
    const d = decide({
      mode: "anonymous", action: "send_external_ai", signals: sig, draftCheck: ok,
      modelVerified: true, detectionSettings: RULES_ONLY_DETECTION_SETTINGS, payloadType: "draft_anonymous_certified",
    });
    expect(d.verdict).toBe("ALLOW");
  });

  it("BERT uit blokkeert export_file niet meer op profielbeleid", () => {
    const d = decide({
      mode: "anonymous", action: "export_file", signals: sig, draftCheck: ok,
      modelVerified: true, detectionSettings: RULES_ONLY_DETECTION_SETTINGS, payloadType: "draft_anonymous_certified",
    });
    expect(d.verdict).toBe("ALLOW");
  });

  it("display blijft lokaal toegestaan", () => {
    const d = decide({
      mode: "anonymous", action: "display", signals: sig, draftCheck: ok,
      modelVerified: true, detectionSettings: RULES_ONLY_DETECTION_SETTINGS, payloadType: "draft_anonymous_certified",
    });
    expect(d.verdict).toBe("ALLOW");
  });

  it("niet-gecertificeerde payload blijft egress fail-closed", () => {
    const d = decide({
      mode: "anonymous", action: "copy", signals: sig, draftCheck: ok,
      modelVerified: true, detectionSettings: DEFAULT_DETECTION_SETTINGS, payloadType: "raw_input",
    });
    expect(d.verdict).toBe("BLOCK");
    expect(d.flag).toBe("PIM_PAYLOAD_TYPE_EGRESS_BLOCK");
  });
});
