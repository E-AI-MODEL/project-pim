import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useRouterState: () => ({ location: { pathname: "/app" } }),
}));
vi.mock("@/components/pim/writer/WriterWorkspace", () => ({
  WriterWorkspace: () => <div data-testid="writer-workspace" />,
}));
vi.mock("@/components/pim/start-go/LiveTechMonitor", () => ({
  DiagnosticsBody: () => <div data-testid="diagnostics-body" />,
}));
vi.mock("@/components/pim/start-go/AdvancedPanel", () => ({
  AdvancedPanel: () => <div data-testid="advanced-panel" />,
}));

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
