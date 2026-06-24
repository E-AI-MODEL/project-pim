// Spoor A — bron-bewuste merge: regex-identifiers autoritair, naam-dekking
// van regex + SLM versterkt elkaar i.p.v. te concurreren op confidence.
import { describe, expect, it } from "vitest";
import { mergeSpans } from "../mergeSpans";
import type { PiiSpan } from "../types";

function span(p: Partial<PiiSpan> & Pick<PiiSpan, "start" | "end" | "category" | "ruleId">): PiiSpan {
  return { text: "", confidence: 0.7, contextual: false, ...p };
}

describe("mergeSpans", () => {
  it("laat een regex-identifier NIET overschrijven door een SLM-gok met hogere confidence", () => {
    const regexEmail = span({ start: 0, end: 12, category: "email", ruleId: "rule.email", confidence: 0.6 });
    const slmName = span({ start: 0, end: 12, category: "name", ruleId: "slm.ner.per", confidence: 0.95 });
    const out = mergeSpans([slmName, regexEmail]);
    expect(out).toHaveLength(1);
    expect(out[0].category).toBe("email");
  });

  it("behoudt de RUIMERE naam-dekking (SLM 'Jan Jansen' i.p.v. regex 'Jan')", () => {
    const regexFirst = span({ start: 0, end: 3, category: "name", ruleId: "rule.name", confidence: 0.6 });
    const slmFull = span({ start: 0, end: 10, category: "name", ruleId: "slm.ner.per", confidence: 0.7 });
    const out = mergeSpans([regexFirst, slmFull]);
    expect(out).toHaveLength(1);
    expect(out[0].end).toBe(10);
    expect(out[0].ruleId).toBe("slm.ner.per");
  });

  it("voegt niet-overlappende SLM-spans toe (hogere dekkingsgraad)", () => {
    const regexEmail = span({ start: 0, end: 12, category: "email", ruleId: "rule.email" });
    const slmName = span({ start: 20, end: 30, category: "name", ruleId: "slm.ner.per" });
    const out = mergeSpans([regexEmail, slmName]);
    expect(out).toHaveLength(2);
  });

  it("filtert door de gebruiker uitgezette categorieën", () => {
    const email = span({ start: 0, end: 12, category: "email", ruleId: "rule.email" });
    const name = span({ start: 20, end: 30, category: "name", ruleId: "slm.ner.per" });
    const out = mergeSpans([email, name], new Set(["name"]));
    expect(out).toHaveLength(1);
    expect(out[0].category).toBe("email");
  });
});
