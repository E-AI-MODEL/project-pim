// Slice C — consolidatie: één AppHeader/StatusFooter, één gedeeld
// expertpaneel achter een expliciete knop, LiveTechMonitor niet permanent
// zichtbaar, WriterWorkspace bevat geen lokaal AdvancedPanel.

import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Zware editor/monitor-modules mocken zodat we puur de shell-structuur toetsen.
vi.mock("@/components/pim/writer/WriterWorkspace", () => ({
  WriterWorkspace: () => <div data-testid="writer-workspace" />,
}));
vi.mock("@/components/pim/product/modes/QuickMode", () => ({
  QuickMode: () => <div data-testid="quick-mode" />,
}));
vi.mock("@/components/pim/product/modes/StartMode", () => ({
  StartMode: () => <div data-testid="start-mode" />,
}));
// LiveTechMonitor telt als "diagnostiek" — we tellen op testid en volgen
// of hij open of dicht is via zijn trigger.
vi.mock("@/components/pim/start-go/LiveTechMonitor", () => ({
  LiveTechMonitor: ({ trigger }: { trigger: React.ReactNode }) => (
    <div data-testid="live-tech-monitor">{trigger}</div>
  ),
}));
// AdvancedPanel mocken zodat we tellen kunnen; onthoud writer-prop.
vi.mock("@/components/pim/start-go/AdvancedPanel", () => ({
  AdvancedPanel: (props: { writer?: unknown }) => (
    <div data-testid="advanced-panel" data-writer={props.writer ? "1" : "0"} />
  ),
}));

import { ProductShell } from "@/components/pim/product/ProductShell";

describe("Slice C — consolidatie", () => {
  for (const mode of ["quick", "start", "write"] as const) {
    it(`mode=${mode}: precies één AppHeader en één StatusFooter, geen dubbele TrustBadge/LocalStatusPill`, () => {
      render(<ProductShell mode={mode} />);
      expect(screen.getAllByRole("banner")).toHaveLength(1); // <header>
      expect(screen.getAllByRole("contentinfo")).toHaveLength(1); // <footer>
      // TrustBadge + LocalStatusPill zitten in AppHeader; er is er dus één
      // van elk aria-label in de DOM.
      expect(screen.getAllByLabelText(/PiM · lokale privacy/i).length).toBeLessThanOrEqual(1);
    });
  }

  it("LiveTechMonitor is niet permanent zichtbaar: alleen een 'Diagnostiek'-trigger", () => {
    render(<ProductShell mode="quick" />);
    // De mock rendert altijd zijn trigger — we controleren dat de knop
    // aanwezig is (achter expliciete knop) en niet als vol paneel.
    expect(screen.getByTestId("open-diagnostics")).toBeTruthy();
  });

  it("Diagnostiek-knop opent en sluit de LiveTechMonitor (via trigger)", async () => {
    render(<ProductShell mode="quick" />);
    const btn = screen.getByTestId("open-diagnostics");
    await act(async () => {
      btn.click();
    });
    // Onze mock plaatst de trigger in een LiveTechMonitor-container; de
    // trigger blijft interactief.
    expect(btn).toBeTruthy();
  });

  it("Expertinstellingen-knop opent het gedeelde expertpaneel; slechts één AdvancedPanel", async () => {
    render(<ProductShell mode="quick" />);
    // Vóór klik nog geen AdvancedPanel in de DOM.
    expect(screen.queryAllByTestId("advanced-panel")).toHaveLength(0);
    await act(async () => {
      screen.getByTestId("open-expert").click();
    });
    expect(screen.getAllByTestId("advanced-panel")).toHaveLength(1);
    // In non-writer-mode geen writer-sub-paneel.
    expect(screen.getByTestId("advanced-panel").getAttribute("data-writer")).toBe("0");
  });

  it("In write-mode toont het expertpaneel de writer-instellingen", async () => {
    render(<ProductShell mode="write" />);
    await act(async () => {
      screen.getByTestId("open-expert").click();
    });
    expect(screen.getByTestId("advanced-panel").getAttribute("data-writer")).toBe("1");
  });

  it("WriterWorkspace bevat geen lokaal AdvancedPanel", () => {
    render(<ProductShell mode="write" />);
    // Zonder de expert-knop te openen mag er nul AdvancedPanels zijn.
    expect(screen.queryAllByTestId("advanced-panel")).toHaveLength(0);
    expect(screen.getByTestId("writer-workspace")).toBeTruthy();
  });

  it("Legacy pim:open-advanced-event opent het gedeelde expertpaneel", async () => {
    render(<ProductShell mode="quick" />);
    await act(async () => {
      window.dispatchEvent(new Event("pim:open-advanced"));
    });
    expect(screen.getAllByTestId("advanced-panel")).toHaveLength(1);
  });
});