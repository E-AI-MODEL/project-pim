// Regressie: de gebruiker mag de veilige versie bewerken en die daarna
// kopiëren. De bewerkte tekst wordt opnieuw gecertificeerd, niet geweigerd.
import { act, render, screen, waitFor, fireEvent } from "@testing-library/react";
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
vi.mock("@/components/pim/start-go/LiveTechMonitor", () => ({
  DiagnosticsBody: () => <div data-testid="diagnostics-body" />,
}));

import { ProductShell } from "@/components/pim/product/ProductShell";

describe("Nakijken: bewerkte veilige tekst kopiëren", () => {
  it("voert de kopieeractie uit op de door de gebruiker bewerkte tekst", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<ProductShell mode="check" />);

    const editor = screen.getAllByRole("textbox")[0] as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(editor, {
        target: { value: "Mail van Jan Jansen via jan.jansen@voorbeeld.nl over de toets." },
      });
    });

    await waitFor(
      () => {
        expect(screen.getByTestId("analysis-status").getAttribute("data-state")).toBe("ready");
      },
      { timeout: 5000 },
    );

    const copyButtons = screen.getAllByRole("button", { name: /kopie/i });
    expect(copyButtons.length).toBeGreaterThan(0);
    await act(async () => {
      copyButtons[0].click();
    });

    await waitFor(() => {
      expect(
        screen.queryByText(/komt niet overeen met de door PiM gecertificeerde tekst/i),
      ).toBeNull();
    });
  }, 20000);
});
