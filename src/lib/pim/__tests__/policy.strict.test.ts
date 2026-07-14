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

const baseInput = {
  mode: "anonymous" as const,
  signals: emptySignals,
  draftCheck: passCheck,
  modelVerified: true,
  payloadType: "draft_anonymous_certified" as const,
};

describe("policy.decide — lock-principe (BERT uit)", () => {
  describe("strikte modus", () => {
    it("BLOCK externe AI met PIM_RULES_ONLY_EXTERNAL_AI_BLOCK", () => {
      const d = decide({
        ...baseInput,
        action: "send_external_ai",
        bertEnabled: false,
        strictMode: true,
      });
      expect(d.verdict).toBe("BLOCK");
      expect(d.flag).toBe("PIM_RULES_ONLY_EXTERNAL_AI_BLOCK");
    });

    it("BLOCK export met PIM_RULES_ONLY_EXPORT_BLOCK", () => {
      const d = decide({
        ...baseInput,
        action: "export_file",
        bertEnabled: false,
        strictMode: true,
      });
      expect(d.verdict).toBe("BLOCK");
      expect(d.flag).toBe("PIM_RULES_ONLY_EXPORT_BLOCK");
    });

    it("ALLOW copy (egress maar niet AI/export)", () => {
      const d = decide({ ...baseInput, action: "copy", bertEnabled: false, strictMode: true });
      expect(d.verdict).toBe("ALLOW");
    });
  });

  describe("niet-strikte modus (default)", () => {
    it("ALLOW_WITH_WARNING bij externe AI", () => {
      const d = decide({ ...baseInput, action: "send_external_ai", bertEnabled: false });
      expect(d.verdict).toBe("ALLOW_WITH_WARNING");
      expect(d.flag).toBe("PIM_BERT_OFF_EGRESS_WARN");
    });

    it("ALLOW_WITH_WARNING bij export", () => {
      const d = decide({ ...baseInput, action: "export_file", bertEnabled: false });
      expect(d.verdict).toBe("ALLOW_WITH_WARNING");
      expect(d.flag).toBe("PIM_BERT_OFF_EGRESS_WARN");
    });

    it("ALLOW bij copy/print/share", () => {
      for (const action of ["copy", "print", "share"] as const) {
        const d = decide({ ...baseInput, action, bertEnabled: false });
        expect(d.verdict).toBe("ALLOW");
      }
    });
  });

  describe("BERT aan (default)", () => {
    it("strictMode heeft geen effect — gewone risk-check geldt", () => {
      const d = decide({ ...baseInput, action: "send_external_ai", strictMode: true });
      expect(d.verdict).toBe("ALLOW");
    });
  });
});
