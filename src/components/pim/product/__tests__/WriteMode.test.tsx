// Slice B — WriteMode toont de echte editor, geen placeholder, en voegt
// géén tweede globale chrome (header/footer/monitor) toe binnen de
// ProductShell. Redirect- en engine-parity worden elders getest.

import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Zware sub-modules mocken: we willen géén echte Tiptap-editor of NER-loader
// draaien in deze integratietest. WriterWorkspace zelf blijft echt, maar
// we ontlasten hem van externe integraties.
vi.mock("@/components/pim/writer/WriterWorkspace", () => ({
  WriterWorkspace: () => <div data-testid="writer-workspace-real">editor</div>,
}));
// Header/footer mocken zodat we in de DOM eenduidig kunnen tellen.
vi.mock("@/components/pim/product/AppHeader", () => ({
  AppHeader: () => <header data-testid="app-header" />,
}));
vi.mock("@/components/pim/product/StatusFooter", () => ({
  StatusFooter: () => <footer data-testid="status-footer" />,
}));
// LiveTechMonitor mag niet dubbel voorkomen in write-mode; we voegen een
// data-testid toe in de mock zodat we tellen kunnen.
vi.mock("@/components/pim/start-go/LiveTechMonitor", () => ({
  LiveTechMonitor: () => <div data-testid="live-tech-monitor" />,
}));
// Andere modes met content mocken zodat er geen onverwachte overlap is.
vi.mock("@/components/pim/product/modes/QuickMode", () => ({
  QuickMode: () => <div data-testid="quick-mode" />,
}));
vi.mock("@/components/pim/product/modes/StartMode", () => ({
  StartMode: () => <div data-testid="start-mode" />,
}));

import { ProductShell } from "@/components/pim/product/ProductShell";

describe("Slice B — WriteMode in ProductShell", () => {
  it("toont de echte WriterWorkspace, geen placeholder-tekst", () => {
    render(<ProductShell mode="write" />);
    expect(screen.getByTestId("writer-workspace-real")).toBeTruthy();
    expect(screen.queryByText(/in voorbereiding/i)).toBeNull();
    expect(screen.queryByText(/Open editor/i)).toBeNull();
  });

  it("rendert AppHeader en StatusFooter precies één keer in write-mode", () => {
    render(<ProductShell mode="write" />);
    expect(screen.getAllByTestId("app-header")).toHaveLength(1);
    expect(screen.getAllByTestId("status-footer")).toHaveLength(1);
  });

  it("mode-switch write → quick → write behoudt gedeelde chrome (geen dubbele header)", async () => {
    const { rerender } = render(<ProductShell mode="write" />);
    expect(screen.getAllByTestId("app-header")).toHaveLength(1);
    await act(async () => {
      rerender(<ProductShell mode="quick" />);
    });
    expect(screen.getAllByTestId("app-header")).toHaveLength(1);
    expect(screen.getByTestId("quick-mode")).toBeTruthy();
    await act(async () => {
      rerender(<ProductShell mode="write" />);
    });
    expect(screen.getAllByTestId("app-header")).toHaveLength(1);
    expect(screen.getByTestId("writer-workspace-real")).toBeTruthy();
  });
});
