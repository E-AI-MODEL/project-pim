import { describe, expect, it } from "vitest";
import { restoreTextWithMapping } from "../restore";
import { detectPii } from "../detectors";

const mapping = new Map([
  ["[NAME_001]", "Milan"],
  ["[NAME_002]", "Sophie"],
  ["[CLASS_CODE_001]", "groep 7B"],
]);

describe("restoreTextWithMapping", () => {
  it("zet exacte codes terug", () => {
    const r = restoreTextWithMapping("[NAME_001] en [NAME_002] zitten in [CLASS_CODE_001].", mapping);
    expect(r.text).toBe("Milan en Sophie zitten in groep 7B.");
    expect(r.restored).toBe(3);
    expect(r.unknown).toEqual([]);
  });

  it("vangt varianten van AI op", () => {
    const r = restoreTextWithMapping("[name_1] helpt NAME_2. Daarna [NAME_001]:", mapping);
    expect(r.text).toBe("Milan helpt Sophie. Daarna Milan:");
    expect(r.replacements).toBe(3);
  });

  it("meldt onbekende codes en laat ze staan", () => {
    const r = restoreTextWithMapping("[NAME_009] belde.", mapping);
    expect(r.text).toBe("[NAME_009] belde.");
    expect(r.unknown).toEqual(["[NAME_009]"]);
  });

  it("raakt gewone woorden met cijfers niet aan", () => {
    const r = restoreTextWithMapping("Zie name_1 in bijlage.", mapping);
    expect(r.text).toBe("Zie name_1 in bijlage.");
  });

  it("NAME_10 wordt niet NAME_1", () => {
    const m = new Map([
      ["[NAME_001]", "A"],
      ["[NAME_010]", "B"],
    ]);
    expect(restoreTextWithMapping("[NAME_010] [NAME_001]", m).text).toBe("B A");
  });
});

describe("onderwijs-DNA detectie", () => {
  const cats = (t: string) => detectPii(t).map((s) => s.category);
  it("herkent instanties en arrangementen", () => {
    expect(cats("Overleg met het wijkteam en de logopedist.")).toContain("context_care");
    expect(cats("Er is een TLV aangevraagd.")).toContain("context_care");
  });
  it("herkent familieconstructies", () => {
    expect(cats("De nieuwe partner van moeder haalt hem op.")).toContain("context_family");
    expect(cats("Zijn broertje in groep 3 heeft hetzelfde.")).toContain("context_family");
  });
  it("herkent toetsniveaus", () => {
    expect(cats("Op Cito M6 scoorde hij laag.")).toContain("context_performance");
  });
});
