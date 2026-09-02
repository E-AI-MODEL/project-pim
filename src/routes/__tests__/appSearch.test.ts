import { describe, expect, it } from "vitest";
import { validateAppSearch } from "@/routes/app.search";

describe("validateAppSearch", () => {
  it("levert een lege search op, /app heeft geen modi meer", () => {
    expect(validateAppSearch({})).toEqual({});
    expect(validateAppSearch()).toEqual({});
  });

  it.each(["check", "write", "quick", "start", "hacker"])("oude mode %s valt weg", (m) => {
    expect(validateAppSearch({ mode: m })).toEqual({});
  });
});
