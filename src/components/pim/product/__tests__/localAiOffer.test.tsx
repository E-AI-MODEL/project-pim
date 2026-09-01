// De uitnodiging voor de lokale AI: één gedeelde kaart, één bron van waarheid.
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocalAiOffer } from "../LocalAiOffer";
import { ProductShellProvider } from "../ProductShellContext";

type Ctx = Parameters<typeof ProductShellProvider>[0]["value"];

function wrap(partial: Partial<Ctx>) {
  const value = {
    usesNerSlm: true,
    nerEnabled: false,
    nerStatus: null,
    startNer: vi.fn(),
    ...partial,
  } as unknown as Ctx;
  return {
    value,
    ui: (
      <ProductShellProvider value={value}>
        <LocalAiOffer />
      </ProductShellProvider>
    ),
  };
}

describe("LocalAiOffer", () => {
  it("nodigt uit zolang de lokale AI uit staat", () => {
    render(wrap({}).ui);
    expect(screen.getByText("Zet de lokale AI aan")).toBeInTheDocument();
  });

  it("start de gedeelde runtime, niet een eigen laadtraject", () => {
    const startNer = vi.fn();
    render(wrap({ startNer }).ui);
    fireEvent.click(screen.getByRole("button", { name: "Zet lokale AI aan" }));
    expect(startNer).toHaveBeenCalledTimes(1);
  });

  it("verdwijnt zodra de AI werkt", () => {
    render(wrap({ nerEnabled: true, nerStatus: { working: true } as never }).ui);
    expect(screen.queryByText("Zet de lokale AI aan")).not.toBeInTheDocument();
  });

  it("verschijnt niet wanneer AI in de instellingen uit staat", () => {
    render(wrap({ usesNerSlm: false }).ui);
    expect(screen.queryByText("Zet de lokale AI aan")).not.toBeInTheDocument();
  });

  it("kan voor deze sessie worden weggeklikt", () => {
    render(wrap({}).ui);
    fireEvent.click(screen.getByRole("button", { name: "Uitnodiging sluiten" }));
    expect(screen.queryByText("Zet de lokale AI aan")).not.toBeInTheDocument();
  });
});
