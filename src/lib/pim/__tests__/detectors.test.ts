import { describe, expect, it } from "vitest";
import { detectPii } from "../detectors";

describe("PIM detectors", () => {
  it("accepteert alleen BSN-nummers die slagen voor de elfproef", () => {
    const valid = ["123", "456", "782"].join("");
    const invalid = ["123", "456", "789"].join("");
    const spans = detectPii(`Geldig BSN ${valid}, ongeldig nummer ${invalid}.`);
    const bsnTexts = spans.filter((s) => s.category === "bsn").map((s) => s.text);

    expect(bsnTexts).toContain(valid);
    expect(bsnTexts).not.toContain(invalid);
  });

  it("wijst een nulreeks af als BSN", () => {
    const zeroLike = ["000", "000", "000"].join("");
    const spans = detectPii(`Geen BSN: ${zeroLike}.`);

    expect(spans.some((s) => s.category === "bsn")).toBe(false);
  });
});
