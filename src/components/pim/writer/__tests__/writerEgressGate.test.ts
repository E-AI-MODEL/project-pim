// Stap 2: elk pad dat tekst uit het schrijfscherm naar buiten brengt
// (klembord, bestand, externe AI) loopt eerst langs de egress-gate.
// Deze test bewaakt dat in de bron: een directe clipboard- of
// blob-actie zonder voorafgaande runEgress-controle is een regressie.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const bron = readFileSync("src/components/pim/writer/WriterWorkspace.tsx", "utf8");

describe("Schrijfscherm, egress-gate", () => {
  it("kent één gedeelde gate die opnieuw certificeert", () => {
    expect(bron).toMatch(/const runEgress\s*=/);
    expect(bron).toMatch(/requestActionForText\(/);
  });

  it("gebruikt geen klembord of download zonder gate", () => {
    const regels = bron.split("\n");
    const uitgaand = regels
      .map((r, i) => ({ r, i }))
      .filter(
        ({ r }) =>
          r.includes("clipboard.writeText") ||
          r.includes("URL.createObjectURL") ||
          r.includes("rewriteWithLlm("),
      );
    expect(uitgaand.length).toBeGreaterThan(0);
    for (const { i } of uitgaand) {
      const context = regels.slice(Math.max(0, i - 12), i).join("\n");
      expect(context, `regel ${i + 1} gaat buiten de gate om`).toMatch(/runEgress\(/);
    }
  });
});
