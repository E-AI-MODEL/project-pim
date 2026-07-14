import { describe, expect, it } from "vitest";
import { validateAppSearch } from "@/routes/app";

describe("validateAppSearch", () => {
  it("ontbrekende mode → quick", () => {
    expect(validateAppSearch({})).toEqual({ mode: "quick" });
  });

  it("ongeldige mode → quick", () => {
    expect(validateAppSearch({ mode: "hacker" })).toEqual({ mode: "quick" });
    expect(validateAppSearch({ mode: 42 })).toEqual({ mode: "quick" });
    expect(validateAppSearch({ mode: null })).toEqual({ mode: "quick" });
  });

  it.each(["quick", "start", "write"] as const)("geldige mode blijft %s", (m) => {
    expect(validateAppSearch({ mode: m })).toEqual({ mode: m });
  });
});
