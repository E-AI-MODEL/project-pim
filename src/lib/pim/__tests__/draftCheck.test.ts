// §11.3 — 1.45–1.48: draft check + audit-cleanliness.
import { describe, expect, it } from "vitest";
import { draftCheck, draftCheckWithRegistry } from "../processing";
import type { DraftCandidate } from "../types";

describe("draftCheck (sync) — residual PII vinden (1.48)", () => {
  it("vindt e-mail, telefoon, BSN, IBAN als residueel", async () => {
    const cases: Array<[string, string]> = [
      ["test@voorbeeld.nl", "email"],
      ["06-12345678", "phone"],
      ["123456782", "bsn"],
      ["NL91ABNA0417164300", "iban"],
    ];
    for (const [text, cat] of cases) {
      const r = draftCheck({ mode: "anonymous", text, rawHadPii: false } as DraftCandidate, "anonymous");
      expect(r.status).toBe("fail");
      expect(r.residualCategories ?? []).toContain(cat);
    }
  });

  it("mode-mix: anonymous met pseudo-tokens => fail (1.36)", () => {
    const draft: DraftCandidate = { mode: "anonymous", text: "Hallo [NAME_001] kom mee.", rawHadPii: false };
    const r = draftCheck(draft, "anonymous");
    expect(r.status).toBe("fail");
    expect(r.modeMix).toBe(true);
  });
});

describe("draftCheckWithRegistry (async) — §4.6 dezelfde coverage als input", () => {
  it("schone tekst => pass", async () => {
    const r = await draftCheckWithRegistry(
      { mode: "anonymous", text: "De methode werkt aantoonbaar beter.", rawHadPii: false } as DraftCandidate,
      "anonymous", "education-nl-full",
    );
    expect(r.status).toBe("pass");
  });

  it("residuele e-mail wordt door registry óók gevonden", async () => {
    const r = await draftCheckWithRegistry(
      { mode: "anonymous", text: "Mail naar test@school.nl voor info.", rawHadPii: false } as DraftCandidate,
      "anonymous", "education-nl-full",
    );
    expect(r.status).toBe("fail");
    expect(r.residualCategories ?? []).toContain("email");
  });
});