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

  it("toont op mobiel één werkruimte zonder modekaarten", () => {
    render(<ProductShell />);
    expect(screen.queryByTestId("mobile-mode-picker")).toBeNull();
    expect(screen.getAllByTestId("writer-workspace")).toHaveLength(1);
  });

  it("toont op desktop dezelfde ene werkruimte", () => {
    setViewport(1280);
    render(<ProductShell />);
    expect(screen.queryByTestId("mobile-mode-picker")).toBeNull();
    expect(screen.getAllByTestId("writer-workspace")).toHaveLength(1);
  });
});
