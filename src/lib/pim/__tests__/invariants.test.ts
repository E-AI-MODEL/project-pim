import { describe, expect, it } from "vitest";
import { decide } from "../policy";
import type { DraftCheckResult, PrivacySignals, Action, PayloadType } from "../types";

const sig = (): PrivacySignals => ({ directPii: [], contextualPii: [], riskScore: 0, riskLevel: "low", reasons: [], ruleIds: [] });
const pass: DraftCheckResult = { status: "pass", issues: [] };

function call(action: Action, opts: Partial<Parameters<typeof decide>[0]> = {}) {
  return decide({
    mode: "anonymous", action, signals: sig(), draftCheck: pass,
    modelVerified: true, payloadType: "draft_anonymous_certified",
    ...opts,
  });
}

describe("privacy invarianten", () => {
  it("pseudonymous + send_external_ai BLOCK", () => {
    expect(call("send_external_ai", { mode: "pseudonymous", payloadType: "draft_pseudonymous_local" }).verdict).toBe("BLOCK");
  });

  for (const action of ["export_file", "copy", "print", "share"] as Action[]) {
    it(`pseudonymous + ${action} BLOCK`, () => {
      expect(call(action, { mode: "pseudonymous", payloadType: "draft_pseudonymous_local" }).verdict).toBe("BLOCK");
    });
  }

  it("anonymous + restore BLOCK", () => {
    expect(call("restore").verdict).toBe("BLOCK");
  });

  it("anonymous + mode-mix payload BLOCK", () => {
    const d = call("copy", {
      draftCheck: { status: "fail", issues: ["mode-mix tokens"], modeMix: true } as DraftCheckResult,
    });
    expect(d.verdict).toBe("BLOCK");
  });

  for (const pt of ["raw_input", "mapping", "restored", "unknown"] as PayloadType[]) {
    it(`payloadType=${pt} naar egress BLOCK`, () => {
      expect(call("copy", { payloadType: pt }).verdict).toBe("BLOCK");
      expect(call("send_external_ai", { payloadType: pt }).verdict).toBe("BLOCK");
      expect(call("export_file", { payloadType: pt }).verdict).toBe("BLOCK");
    });
  }

  it("modelVerified=false BLOCK egress", () => {
    expect(call("copy", { modelVerified: false }).verdict).toBe("BLOCK");
    expect(call("send_external_ai", { modelVerified: false }).verdict).toBe("BLOCK");
  });

  it("alleen certified anonymous mag egress", () => {
    expect(call("copy", { payloadType: "draft_anonymous_certified" }).verdict).toBe("ALLOW");
    expect(call("copy", { payloadType: "draft_pseudonymous_local" }).verdict).toBe("BLOCK");
  });
});
