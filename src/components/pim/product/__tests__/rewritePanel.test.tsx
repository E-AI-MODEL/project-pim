// Herschrijven is opt-in en nooit toegestaan op pseudonieme tekst.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RewritePanel, hasPseudonymTokens } from "../RewritePanel";

vi.mock("@/lib/pim/rewriteLlm", () => ({
  onRewriteStatus: () => () => {},
  loadRewriteLlm: vi.fn(),
  rewriteAnonymousDraftStream: vi.fn(),
}));

describe("RewritePanel", () => {
  it("herkent pseudoniemcodes", () => {
    expect(hasPseudonymTokens("Hallo [PERSOON_001]")).toBe(true);
    expect(hasPseudonymTokens("Hallo [persoon]")).toBe(false);
  });

  it("blokkeert herschrijven van pseudonieme tekst", () => {
    render(
      <RewritePanel
        open
        onOpenChange={() => {}}
        sourceText="Gesprek met [PERSOON_001]."
        onAccept={() => {}}
      />,
    );
    expect(screen.getByTestId("rewrite-blocked")).toBeTruthy();
    expect(screen.getByTestId<HTMLButtonElement>("rewrite-start").disabled).toBe(true);
  });

  it("staat herschrijven toe op nagekeken anonieme tekst", () => {
    render(
      <RewritePanel
        open
        onOpenChange={() => {}}
        sourceText="Gesprek met [persoon] over de toets."
        onAccept={() => {}}
      />,
    );
    expect(screen.queryByTestId("rewrite-blocked")).toBeNull();
    expect(screen.getByTestId<HTMLButtonElement>("rewrite-start").disabled).toBe(false);
  });
});
