// Eén zijbalk voor alles wat geen tekstwerk is: instellingen, diagnostiek, over.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
vi.mock("@/components/pim/product/modes/CheckMode", () => ({
  CheckMode: () => <div data-testid="check-mode" />,
}));
vi.mock("@/components/pim/start-go/LiveTechMonitor", () => ({
  DiagnosticsBody: () => <div data-testid="diagnostics-body" />,
}));
vi.mock("@/components/pim/start-go/AdvancedPanel", () => ({
  AdvancedPanel: () => <div data-testid="advanced-panel" />,
}));

import { ProductShell } from "@/components/pim/product/ProductShell";

describe("Gedeeld zijpaneel", () => {
  it("de menuknop opent het paneel met drie tabbladen", async () => {
    render(<ProductShell mode="check" />);
    expect(screen.queryAllByTestId("side-panel")).toHaveLength(0);
    await act(async () => {
      screen.getByTestId("open-menu").click();
    });
    expect(screen.getAllByTestId("side-panel")).toHaveLength(1);
    expect(screen.getByTestId("tab-settings")).toBeTruthy();
    expect(screen.getByTestId("tab-diagnostics")).toBeTruthy();
    expect(screen.getByTestId("tab-about")).toBeTruthy();
    // Standaard staat het paneel op Instellingen.
    expect(screen.getAllByTestId("advanced-panel")).toHaveLength(1);
  });

  it("pim:open-diagnostics opent hetzelfde paneel op het tabblad Diagnostiek", async () => {
    render(<ProductShell mode="check" />);
    await act(async () => {
      window.dispatchEvent(new Event("pim:open-diagnostics"));
    });
    expect(screen.getAllByTestId("side-panel")).toHaveLength(1);
    expect(screen.getAllByTestId("diagnostics-body")).toHaveLength(1);
    expect(screen.queryAllByTestId("advanced-panel")).toHaveLength(0);
  });

  it("Escape sluit het paneel", async () => {
    render(<ProductShell mode="check" />);
    await act(async () => {
      screen.getByTestId("open-menu").click();
    });
    await act(async () => {
      fireEvent.keyDown(document.body, { key: "Escape", code: "Escape" });
    });
    expect(screen.queryAllByTestId("side-panel")).toHaveLength(0);
  });
});
