// ProductShell — slice A.1 gedragstests.
// We mocken zware sub-modules (AppHeader/StatusFooter/modes) zodat we
// puur het gedeelde state/engine-gedrag van de shell kunnen verifiëren.

import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useProductShell } from "@/components/pim/product/ProductShellContext";

vi.mock("@/components/pim/product/AppHeader", () => ({
  AppHeader: ({ mode }: { mode: string }) => <div data-testid="hdr">{mode}</div>,
}));
vi.mock("@/components/pim/product/StatusFooter", () => ({
  StatusFooter: () => <div data-testid="ftr" />,
}));

function Probe() {
  const { text, setText, engineState } = useProductShell();
  return (
    <div>
      <div data-testid="text">{text}</div>
      <div data-testid="phase">{engineState.phase}</div>
      <button onClick={() => setText("Hallo wereld")}>set</button>
    </div>
  );
}

vi.mock("@/components/pim/product/modes/QuickMode", () => ({ QuickMode: () => <Probe /> }));
vi.mock("@/components/pim/product/modes/StartMode", () => ({ StartMode: () => <Probe /> }));
vi.mock("@/components/pim/product/modes/WriteMode", () => ({ WriteMode: () => <Probe /> }));

import { ProductShell } from "@/components/pim/product/ProductShell";

describe("ProductShell — slice A.1", () => {
  it("pim:reset wist tekst en zet engine op idle", async () => {
    render(<ProductShell mode="quick" />);
    await act(async () => {
      screen.getByRole("button", { name: "set" }).click();
    });
    expect(screen.getByTestId("text").textContent).toBe("Hallo wereld");

    await act(async () => {
      window.dispatchEvent(new Event("pim:reset"));
    });
    expect(screen.getByTestId("text").textContent).toBe("");
    expect(screen.getByTestId("phase").textContent).toBe("idle");
  });

  it("modeswitch behoudt gedeelde invoer", async () => {
    const { rerender } = render(<ProductShell mode="quick" />);
    await act(async () => {
      screen.getByRole("button", { name: "set" }).click();
    });
    expect(screen.getByTestId("text").textContent).toBe("Hallo wereld");

    rerender(<ProductShell mode="start" />);
    expect(screen.getByTestId("text").textContent).toBe("Hallo wereld");

    rerender(<ProductShell mode="write" />);
    expect(screen.getByTestId("text").textContent).toBe("Hallo wereld");
  });
});