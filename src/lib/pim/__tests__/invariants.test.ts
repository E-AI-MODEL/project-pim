// Spec §11.3, 20 privacy-invarianten (de hoofdmoot).
import { describe, expect, it } from "vitest";
import { decide } from "../policy";
import type { DraftCheckResult, PrivacySignals, Action, PayloadType } from "../types";

const sig = (): PrivacySignals => ({
  directPii: [],
  contextualPii: [],
  riskScore: 0,
  riskLevel: "low",
  reasons: [],
  ruleIds: [],
});
const pass: DraftCheckResult = { status: "pass", issues: [] };

function call(action: Action, opts: Partial<Parameters<typeof decide>[0]> = {}) {
  return decide({
    mode: "anonymous",
    action,
    signals: sig(),
    draftCheck: pass,
    modelVerified: true,
    profileId: "education-nl-full",
    payloadType: "draft_anonymous_certified",
    ...opts,
  });
}

describe("§11.3, privacy-invarianten", () => {
  // 1.30 pseudonymous + send_external_ai => BLOCK
  it("1.30 pseudonymous + send_external_ai BLOCK", () => {
    expect(
      call("send_external_ai", { mode: "pseudonymous", payloadType: "draft_pseudonymous_local" })
        .verdict,
    ).toBe("BLOCK");
  });
  // 1.31–1.34 pseudonymous + {export,copy,print,share} => BLOCK
  for (const action of ["export_file", "copy", "print", "share"] as Action[]) {
    it(`pseudonymous + ${action} BLOCK`, () => {
      expect(
        call(action, { mode: "pseudonymous", payloadType: "draft_pseudonymous_local" }).verdict,
      ).toBe("BLOCK");
    });
  }
  // 1.35 anonymous + restore => BLOCK
  it("1.35 anonymous + restore BLOCK", () => {
    expect(call("restore").verdict).toBe("BLOCK");
  });
  // 1.36 anonymous draft met pseudo-token => fail/block via draftCheck
  it("1.36 anonymous + mode-mix payload => BLOCK via draftCheck fail", () => {
    const d = call("copy", {
      draftCheck: {
        status: "fail",
        issues: ["mode-mix tokens"],
        modeMix: true,
      } as DraftCheckResult,
    });
    expect(d.verdict).toBe("BLOCK");
  });
  // 1.37–1.40 raw_input / mapping / restored / unknown => BLOCK
  for (const pt of ["raw_input", "mapping", "restored", "unknown"] as PayloadType[]) {
    it(`payloadType=${pt} naar egress BLOCK`, () => {
      expect(call("copy", { payloadType: pt }).verdict).toBe("BLOCK");
      expect(call("send_external_ai", { payloadType: pt }).verdict).toBe("BLOCK");
      expect(call("export_file", { payloadType: pt }).verdict).toBe("BLOCK");
    });
  }
  // 1.41 model mismatch (verified=false) => BLOCK non-lokaal
  it("1.41 modelVerified=false BLOCK egress", () => {
    expect(call("copy", { modelVerified: false }).verdict).toBe("BLOCK");
    expect(call("send_external_ai", { modelVerified: false }).verdict).toBe("BLOCK");
  });
  // 1.42 missing model dekkend door modelVerified=false test hierboven.
  // 1.43, 1.44, in profiles.test.ts
  // 1.49 alleen `draft_anonymous_certified` mag naar buiten
  it("1.49 alleen certified anonymous mag egress", () => {
    expect(call("copy", { payloadType: "draft_anonymous_certified" }).verdict).toBe("ALLOW");
    expect(call("copy", { payloadType: "draft_pseudonymous_local" }).verdict).toBe("BLOCK");
  });
});
