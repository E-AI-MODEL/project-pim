// Regressie: de gebruiker mag de veilige versie bewerken en die daarna
// kopiëren. CheckMode moet die bewerkte tekst opnieuw laten certificeren
// (requestActionForText) in plaats van hem als payloadText mee te sturen,
// want dan weigert de engine hem.
import { act, render, screen, waitFor } from "@testing-library/react";
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

import { CheckMode } from "@/components/pim/product/modes/CheckMode";
import { ProductShellProvider } from "@/components/pim/product/ProductShellContext";
import { createEngine, EMPTY_ENGINE_STATE } from "@/lib/pim/engine";
import { DEFAULT_DETECTION_SETTINGS } from "@/lib/pim";

const TEKST = "Emma de Vries doet volgende week mee aan het project.";

function buildContext(overrides: Record<string, unknown>) {
  const engine = createEngine({ detectionSettings: DEFAULT_DETECTION_SETTINGS });
  engine.evaluate({ text: TEKST, mode: "anonymous", autoRepair: true });
  const state = engine.getState() ?? EMPTY_ENGINE_STATE;
  return {
    engineState: state,
    evaluate: () => state,
    previewDecision: () => ({
      ...engine.previewDecision("copy"),
      verdict: "ALLOW" as const,
    }),
    requestAction: vi.fn(),
    requestActionForText: vi.fn(),
    reset: vi.fn(),
    settings: {
      detectionSettings: DEFAULT_DETECTION_SETTINGS,
      disabledCategories: new Set(),
      thresholdOverrides: {},
      integrity: [],
    },
    text: TEKST,
    setText: vi.fn(),
    mode: "anonymous" as const,
    setMode: vi.fn(),
    action: "copy" as const,
    setAction: vi.fn(),
    analysisMode: "manual" as const,
    setAnalysisMode: vi.fn(),
    analysisTick: 0,
    runAnalysis: vi.fn(),
    isStale: false,
    markStale: vi.fn(),
    clearStale: vi.fn(),
    writerContent: null,
    setWriterContent: vi.fn(),
    writerAutoRedact: new Set(),
    setWriterAutoRedact: vi.fn(),
    writerStrict: false,
    setWriterStrict: vi.fn(),
    usesNerSlm: false,
    nerEnabled: false,
    nerSpans: [],
    nerStatus: null,
    startNer: vi.fn(),
    nerSourceText: TEKST,
    setNerSourceText: vi.fn(),
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("Nakijken: bewerkte veilige tekst kopiëren", () => {
  it("laat de bewerkte tekst opnieuw certificeren in plaats van hem af te wijzen", async () => {
    const requestActionForText = vi
      .fn()
      .mockResolvedValue({ executed: true, reason: "Kopiëren toegestaan." });
    const requestAction = vi.fn();
    const ctx = buildContext({ requestActionForText, requestAction, analysisTick: 1 });

    render(
      <ProductShellProvider value={ctx}>
        <CheckMode />
      </ProductShellProvider>,
    );

    const copyKnop = await screen.findByRole("button", { name: /Kopieer veilige tekst/i });
    await act(async () => {
      copyKnop.click();
    });

    await waitFor(() => {
      expect(requestActionForText).toHaveBeenCalled();
    });
    // Geen losse payloadText meer: de engine zou die weigeren.
    expect(requestAction).not.toHaveBeenCalled();
    const [tekst, actie] = requestActionForText.mock.calls[0];
    expect(typeof tekst).toBe("string");
    expect(actie).toBe("copy");
  }, 20000);
});
