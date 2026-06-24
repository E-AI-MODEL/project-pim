// Spoor B — kleine LLM's herhalen zinnen; dedupeSentences ruimt dat op.
import { describe, expect, it } from "vitest";
import { dedupeSentences } from "../rewriteLlm";

describe("dedupeSentences", () => {
  it("verwijdert een exact herhaalde zin", () => {
    const inp = "De leerling werkt hard. De leerling werkt hard.";
    expect(dedupeSentences(inp)).toBe("De leerling werkt hard.");
  });

  it("negeert hoofdletter-/spatieverschillen bij het ontdubbelen", () => {
    const inp = "Het gaat goed met [persoon].  het gaat goed met [persoon].";
    expect(dedupeSentences(inp)).toBe("Het gaat goed met [persoon].");
  });

  it("behoudt verschillende zinnen en hun volgorde", () => {
    const inp = "Eerste punt. Tweede punt. Eerste punt.";
    expect(dedupeSentences(inp)).toBe("Eerste punt. Tweede punt.");
  });

  it("laat regelstructuur intact", () => {
    const inp = "Kop\n\nEen zin hier. Een zin hier.";
    expect(dedupeSentences(inp)).toBe("Kop\n\nEen zin hier.");
  });

  it("raakt korte fragmenten niet aan", () => {
    const inp = "Ja. Ja. Nee.";
    expect(dedupeSentences(inp)).toBe("Ja. Ja. Nee.");
  });
});
