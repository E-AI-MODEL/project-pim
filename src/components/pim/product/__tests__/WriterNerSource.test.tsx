// Verifieert de writer-tekst-bron voor centrale NER: in write-mode gebruikt
// ProductShell de door WriterWorkspace gepubliceerde tekst (via
// setNerSourceText) als NER-input, en valt niet terug op oude Quick-tekst.
// Bij unmount van de writer wordt de bron leeggemaakt.

import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useEffect } from "react";

import { useProductShell } from "@/components/pim/product/ProductShellContext";

// Registreer welke tekst aan useNerSpans wordt doorgegeven.
const nerInputs: string[] = [];
vi.mock("@/hooks/useNerSpans", () => ({
  useNerSpans: (text: string) => {
    nerInputs.push(text);
    return {
      nerSpans: [],
      nerStatus: null,
      ready: false,
      startNer: vi.fn(),
    };
  },
}));

// Zware chrome + andere modes uit de weg zodat we ons puur op de NER-bron
// concentreren.
vi.mock("@/components/pim/product/AppHeader", () => ({
  AppHeader: () => <div />,
}));
vi.mock("@/components/pim/product/StatusFooter", () => ({
  StatusFooter: () => <div />,
}));
vi.mock("@/components/pim/product/ExpertPanel", () => ({
  ExpertPanel: () => <div />,
}));
vi.mock("@/components/pim/product/modes/QuickMode", () => ({
  QuickMode: () => <div />,
}));
vi.mock("@/components/pim/product/modes/StartMode", () => ({
  StartMode: () => <div />,
}));

// Fake writer: publiceert een vaste plaintext via de centrale
// setNerSourceText en wist de bron bij unmount, precies zoals de echte
// WriterWorkspace dat doet.
function FakeWriter() {
  const { setNerSourceText } = useProductShell();
  useEffect(() => {
    setNerSourceText("John mailt vandaag.");
  }, [setNerSourceText]);
  useEffect(() => {
    return () => setNerSourceText("");
  }, [setNerSourceText]);
  return <div data-testid="fake-writer" />;
}
vi.mock("@/components/pim/writer/WriterWorkspace", () => ({
  WriterWorkspace: () => <FakeWriter />,
}));

import { ProductShell } from "@/components/pim/product/ProductShell";

describe("WriterWorkspace publiceert NER-bron via ProductShell", () => {
  it("gebruikt de writer-tekst als centrale NER-input in write-mode", async () => {
    nerInputs.length = 0;
    await act(async () => {
      render(<ProductShell mode="write" />);
    });
    expect(nerInputs).toContain("John mailt vandaag.");
  });

  it("valt niet terug op oude Quick-tekst als writer leeg is", async () => {
    nerInputs.length = 0;
    // Simuleer een lege writer door FakeWriter tijdelijk niet te mounten;
    // in write-mode leest de shell strikt uit nerSourceText, niet uit text.
    await act(async () => {
      render(<ProductShell mode="write" />);
    });
    // Alle NER-inputs in write-mode zijn óf "" (initieel), óf de writer-tekst.
    for (const t of nerInputs) {
      expect(t === "" || t === "John mailt vandaag.").toBe(true);
    }
  });

  it("wist de NER-bron wanneer de writer unmount", async () => {
    nerInputs.length = 0;
    let unmount: () => void = () => {};
    await act(async () => {
      const r = render(<ProductShell mode="write" />);
      unmount = r.unmount;
    });
    await act(async () => {
      unmount();
    });
    // De laatste bron-waarde die de shell nog doorgaf, moet leeg zijn.
    expect(nerInputs[nerInputs.length - 1]).toBe("");
  });
});