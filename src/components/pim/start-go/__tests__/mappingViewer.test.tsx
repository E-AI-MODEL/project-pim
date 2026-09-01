// Stap 3: de pseudoniem-mapping is een sleutel met ruwe persoonsgegevens.
// Kopiëren kan alleen na een expliciete bevestiging en wordt gelogd.
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { MappingViewer } from "@/components/pim/start-go/MappingViewer";
import { getEgressReconsultLog } from "@/lib/pim/egressGuard";

const mapping = new Map([["[NAME_001]", "Emma de Vries"]]);

function open() {
  render(<MappingViewer mapping={mapping} />);
  act(() => {
    screen.getAllByRole("button")[0].click();
  });
}

describe("MappingViewer, lokale sleutel", () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  });

  it("kopieert niet meteen, maar vraagt eerst om bevestiging", async () => {
    open();
    await act(async () => {
      screen.getByRole("button", { name: /Kopieer als JSON/i }).click();
    });
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.getByTestId("mapping-copy-confirm")).toBeTruthy();
  });

  it("kopieert pas na bevestiging en noteert dat in de log", async () => {
    open();
    await act(async () => {
      screen.getByRole("button", { name: /Kopieer als JSON/i }).click();
    });
    await act(async () => {
      screen.getByRole("button", { name: /Ja, kopieer lokaal/i }).click();
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain("Emma de Vries");
    expect(getEgressReconsultLog().join("\n")).toMatch(/LOKALE SLEUTEL/);
  });

  it("annuleren laat het klembord met rust", async () => {
    open();
    await act(async () => {
      screen.getByRole("button", { name: /Kopieer als JSON/i }).click();
    });
    await act(async () => {
      screen.getByRole("button", { name: /Annuleren/i }).click();
    });
    expect(writeText).not.toHaveBeenCalled();
  });
});
