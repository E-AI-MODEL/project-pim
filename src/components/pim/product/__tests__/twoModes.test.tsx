// Eén werkruimte: geen modewissel meer, één plek voor instellingen.
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Router-context is niet nodig voor deze structuurtest.
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

import { ProductShell } from "@/components/pim/product/ProductShell";
import { validateAppSearch } from "@/routes/app.search";

describe("Eén werkruimte", () => {
  it("er is precies één werkvlak, zonder modewissel", () => {
    render(<ProductShell />);
    expect(screen.getAllByTestId("writer-workspace")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: /Tekst nakijken/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Zelf schrijven/ })).toBeNull();
  });

  it("oude links met ?mode= blijven werken en verliezen de parameter", () => {
    expect(validateAppSearch({ mode: "quick" })).toEqual({});
    expect(validateAppSearch({ mode: "write" })).toEqual({});
    expect(validateAppSearch({})).toEqual({});
  });

  it("instellingen zitten op één plek en openen via de menuknop rechtsboven", async () => {
    render(<ProductShell />);
    expect(screen.getAllByTestId("open-menu")).toHaveLength(1);
    expect(screen.queryAllByTestId("advanced-panel")).toHaveLength(0);
    await act(async () => {
      screen.getByTestId("open-menu").click();
    });
    await act(async () => {
      screen.getByTestId("menu-item-settings").click();
    });
    expect(screen.getAllByTestId("advanced-panel")).toHaveLength(1);
  });
});
