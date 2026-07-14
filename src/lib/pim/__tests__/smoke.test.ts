import { describe, expect, it } from "vitest";
import { computeSignals, anonymize, draftCheck, DEFAULT_PROFILE } from "@/lib/pim";

describe("PIM smoke — round-trip detect + anonymize + draftCheck", () => {
  it("detecteert BSN en vervangt door label", () => {
    const text = "Het BSN 123456782 staat in het dossier.";
    const signals = computeSignals(text, [], DEFAULT_PROFILE, new Set());
    const cats = signals.directPii.map((s) => s.category);
    expect(cats).toContain("bsn");
    const draft = anonymize(text, signals);
    expect(draft.text).not.toContain("123456782");
    expect(draft.text.toLowerCase()).toContain("[bsn]");
  });

  it("detecteert e-mailadres en draftCheck slaagt op geanonimiseerde tekst", () => {
    const text = "Mail naar test.docent@voorbeeldschool.nl voor vrijdag.";
    const signals = computeSignals(text, [], DEFAULT_PROFILE, new Set());
    expect(signals.directPii.map((s) => s.category)).toContain("email");
    const draft = anonymize(text, signals);
    expect(draft.text).not.toContain("@voorbeeldschool.nl");
    const guard = draftCheck({ text: draft.text, mode: "anonymous", rawHadPii: true }, "anonymous");
    expect(guard.status).toBe("pass");
  });

  it("draftCheck markeert restanten in geanonimiseerde output", () => {
    const guard = draftCheck(
      { text: "Bel mij op 06-12345678.", mode: "anonymous", rawHadPii: false },
      "anonymous",
    );
    expect(guard.status).not.toBe("pass");
  });
});
