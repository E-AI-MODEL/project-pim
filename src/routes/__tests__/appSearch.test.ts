import { describe, expect, it } from "vitest";
import { validateAppSearch } from "@/routes/app.search";

describe("validateAppSearch", () => {
  it("ontbrekende mode → check", () => {
    expect(validateAppSearch({})).toEqual({ mode: "check" });
  });

  it("ongeldige mode → check", () => {
    expect(validateAppSearch({ mode: "hacker" })).toEqual({ mode: "check" });
    expect(validateAppSearch({ mode: 42 })).toEqual({ mode: "check" });
    expect(validateAppSearch({ mode: null })).toEqual({ mode: "check" });
  });

  it.each(["check", "write"] as const)("geldige mode blijft %s", (m) => {
    expect(validateAppSearch({ mode: m })).toEqual({ mode: m });
  });

  it.each(["quick", "start"] as const)("oude mode %s gaat op in check", (m) => {
    expect(validateAppSearch({ mode: m })).toEqual({ mode: "check" });
  });
});
