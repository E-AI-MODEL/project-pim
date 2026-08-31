import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductShell } from "../ProductShell";

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
  window.matchMedia = ((query: string) => ({
    matches: width < 768,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

describe("PiM light op mobiel", () => {
  const original = window.innerWidth;
  beforeEach(() => setViewport(390));
  afterEach(() => setViewport(original));

  it("toont de modekaarten met verwachting en een vaste nakijkknop", () => {
    render(<ProductShell mode="check" />);
    expect(screen.getByTestId("mobile-mode-picker")).toBeTruthy();
    expect(screen.getByText(/PiM zegt of je hem kunt delen/)).toBeTruthy();
    expect(screen.getByTestId("run-analysis-mobile")).toBeTruthy();
  });

  it("toont op desktop geen mobiele kaarten of actiebalk", () => {
    setViewport(1280);
    render(<ProductShell mode="check" />);
    expect(screen.queryByTestId("mobile-mode-picker")).toBeNull();
    expect(screen.queryByTestId("run-analysis-mobile")).toBeNull();
  });
});
