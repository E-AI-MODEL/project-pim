// Gebruiksgemak: twee schermen, één analysemodel, één instellingenplek.
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
vi.mock("@/components/pim/product/modes/CheckMode", () => ({
  CheckMode: () => <div data-testid="check-mode" />,
}));
vi.mock("@/components/pim/start-go/LiveTechMonitor", () => ({
  LiveTechMonitor: ({ trigger }: { trigger: React.ReactNode }) => <div>{trigger}</div>,
}));
vi.mock("@/components/pim/start-go/AdvancedPanel", () => ({
  AdvancedPanel: () => <div data-testid="advanced-panel" />,
}));

import { ProductShell } from "@/components/pim/product/ProductShell";
import { MODE_LABEL, normalizeProductMode, PRODUCT_MODES } from "@/components/pim/product/types";

describe("Twee schermen met heldere verwachting", () => {
  it("er zijn precies twee schermen met verwachtingstaal", () => {
    expect(PRODUCT_MODES).toEqual(["check", "write"]);
    expect(MODE_LABEL.check).toBe("Tekst nakijken");
    expect(MODE_LABEL.write).toBe("Zelf schrijven");
  });

  it("oude links (quick/start) landen in het nakijkscherm", () => {
    expect(normalizeProductMode("quick")).toBe("check");
    expect(normalizeProductMode("start")).toBe("check");
    expect(normalizeProductMode("write")).toBe("write");
    expect(normalizeProductMode(undefined)).toBe("check");
  });

  it("de modeswitcher toont beide schermen en de verwachting van het actieve scherm", () => {
    render(<ProductShell mode="check" />);
    expect(screen.getAllByRole("link", { name: /Tekst nakijken/ })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: /Zelf schrijven/ })).toHaveLength(1);
    expect(screen.getByText(/Plak of upload je tekst/)).toBeTruthy();
  });

  it("instellingen zitten op één plek en openen via de footerknop", async () => {
    render(<ProductShell mode="check" />);
    expect(screen.getAllByTestId("open-settings")).toHaveLength(1);
    expect(screen.queryAllByTestId("advanced-panel")).toHaveLength(0);
    await act(async () => {
      screen.getByTestId("open-settings").click();
    });
    expect(screen.getAllByTestId("advanced-panel")).toHaveLength(1);
  });
});
