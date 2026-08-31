// Eén zijbalk voor alles wat geen tekstwerk is: het menu zelf, met
// instellingen en diagnostiek als onderdelen daarvan.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const navigateMock = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useNavigate: () => navigateMock,
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
  it("de menuknop opent het menu met instellingen, diagnostiek en achtergrond", async () => {
    render(<ProductShell mode="check" />);
    expect(screen.queryAllByTestId("side-panel")).toHaveLength(0);
    await act(async () => {
      screen.getByTestId("open-menu").click();
    });
    expect(screen.getAllByTestId("side-panel")).toHaveLength(1);
    expect(screen.getByTestId("panel-menu")).toBeTruthy();
    expect(screen.getByTestId("menu-item-settings")).toBeTruthy();
    expect(screen.getByTestId("menu-item-diagnostics")).toBeTruthy();
    expect(screen.getByTestId("about-tab")).toBeTruthy();
    expect(screen.getByTestId("clear-storage")).toBeTruthy();
  });

  it("instellingen openen binnen hetzelfde paneel, met een weg terug", async () => {
    render(<ProductShell mode="check" />);
    await act(async () => {
      screen.getByTestId("open-menu").click();
    });
    await act(async () => {
      screen.getByTestId("menu-item-settings").click();
    });
    expect(screen.getAllByTestId("advanced-panel")).toHaveLength(1);
    expect(screen.queryAllByTestId("panel-menu")).toHaveLength(0);
    await act(async () => {
      screen.getByTestId("panel-back").click();
    });
    expect(screen.getByTestId("panel-menu")).toBeTruthy();
  });

  it("pim:open-diagnostics springt direct naar diagnostiek", async () => {
    render(<ProductShell mode="check" />);
    await act(async () => {
      window.dispatchEvent(new Event("pim:open-diagnostics"));
    });
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

  it("zonder eigen instellingencontext (achtergrondpagina) wijst Instellingen naar Tekst nakijken", async () => {
    const { SidePanel } = await import("@/components/pim/product/SidePanel");
    navigateMock.mockClear();
    render(<SidePanel />);
    await act(async () => {
      window.dispatchEvent(new Event("pim:open-menu"));
    });
    const item = screen.getByTestId("menu-item-settings");
    expect(item.textContent).toContain("In Tekst nakijken");
    await act(async () => {
      item.click();
    });
    // Geen eigen instellingenscherm: navigeren naar /app, geen drill-down.
    expect(navigateMock).toHaveBeenCalledWith({ to: "/app", search: { mode: "check" } });
    expect(screen.queryAllByTestId("advanced-panel")).toHaveLength(0);
    expect(screen.queryAllByTestId("side-panel")).toHaveLength(0);
  });
});
