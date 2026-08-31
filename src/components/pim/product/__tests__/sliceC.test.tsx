// Slice C, consolidatie: één AppHeader/StatusFooter, één gedeeld
// expertpaneel achter een expliciete knop, LiveTechMonitor niet permanent
// zichtbaar, WriterWorkspace bevat geen lokaal AdvancedPanel.

import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Zware editor/monitor-modules mocken zodat we puur de shell-structuur toetsen.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useRouterState: () => ({ location: { pathname: "/app" } }),
}));
vi.mock("@/components/pim/product/AppHeader", () => ({
  AppHeader: () => <div data-testid="app-header" />,
}));
vi.mock("@/components/pim/writer/WriterWorkspace", () => ({
  WriterWorkspace: () => <div data-testid="writer-workspace" />,
}));
vi.mock("@/components/pim/product/modes/CheckMode", () => ({
  CheckMode: () => <div data-testid="check-mode" />,
}));
// Diagnostiek zit als tabblad in het gedeelde zijpaneel.
vi.mock("@/components/pim/start-go/LiveTechMonitor", () => ({
  DiagnosticsBody: () => <div data-testid="diagnostics-body" />,
}));

// AdvancedPanel mocken zodat we tellen kunnen; onthoud writer-prop.
vi.mock("@/components/pim/start-go/AdvancedPanel", () => ({
  AdvancedPanel: (props: { writer?: unknown }) => (
    <div data-testid="advanced-panel" data-writer={props.writer ? "1" : "0"} />
  ),
}));

import { ProductShell } from "@/components/pim/product/ProductShell";

describe("Slice C, consolidatie", () => {
  for (const mode of ["check", "write"] as const) {
    it(`mode=${mode}: precies één AppHeader en één StatusFooter, geen dubbele TrustBadge/LocalStatusPill`, () => {
      render(<ProductShell mode={mode} />);
      expect(screen.getAllByTestId("app-header")).toHaveLength(1);
      expect(screen.getAllByRole("contentinfo")).toHaveLength(1); // <footer>
      // De footer bevat geen knoppen meer; alles zit in het zijpaneel.
      expect(screen.queryAllByTestId("open-settings")).toHaveLength(0);
      expect(screen.queryAllByTestId("open-diagnostics")).toHaveLength(0);
    });
  }

  it("Diagnostiek is niet permanent zichtbaar, maar opent als tabblad in het zijpaneel", async () => {
    render(<ProductShell mode="check" />);
    expect(screen.queryAllByTestId("diagnostics-body")).toHaveLength(0);
    await act(async () => {
      window.dispatchEvent(new Event("pim:open-diagnostics"));
    });
    expect(screen.getAllByTestId("diagnostics-body")).toHaveLength(1);
  });


  it("Instellingen openen via het zijpaneel; slechts één AdvancedPanel", async () => {
    render(<ProductShell mode="check" />);
    // Vóór openen nog geen AdvancedPanel in de DOM.
    expect(screen.queryAllByTestId("advanced-panel")).toHaveLength(0);
    await act(async () => {
      window.dispatchEvent(new Event("pim:open-menu"));
    });
    // Het menu is de startpagina van het paneel; instellingen zit erin.
    expect(screen.queryAllByTestId("advanced-panel")).toHaveLength(0);
    await act(async () => {
      screen.getByTestId("menu-item-settings").click();
    });
    expect(screen.getAllByTestId("advanced-panel")).toHaveLength(1);
    // In non-writer-mode geen writer-sub-paneel.
    expect(screen.getByTestId("advanced-panel").getAttribute("data-writer")).toBe("0");
  });

  it("In write-mode toont het instellingen-tabblad de writer-instellingen", async () => {
    render(<ProductShell mode="write" />);
    await act(async () => {
      window.dispatchEvent(new Event("pim:open-settings"));
    });
    expect(screen.getByTestId("advanced-panel").getAttribute("data-writer")).toBe("1");
  });


  it("WriterWorkspace bevat geen lokaal AdvancedPanel", () => {
    render(<ProductShell mode="write" />);
    // Zonder de expert-knop te openen mag er nul AdvancedPanels zijn.
    expect(screen.queryAllByTestId("advanced-panel")).toHaveLength(0);
    expect(screen.getByTestId("writer-workspace")).toBeTruthy();
  });

  it("Legacy pim:open-settings-event opent het gedeelde expertpaneel", async () => {
    render(<ProductShell mode="check" />);
    await act(async () => {
      window.dispatchEvent(new Event("pim:open-settings"));
    });
    expect(screen.getAllByTestId("advanced-panel")).toHaveLength(1);
  });
});
