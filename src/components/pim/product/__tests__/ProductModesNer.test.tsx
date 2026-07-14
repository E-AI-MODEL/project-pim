// Verifieert dat QuickMode en StartMode de centrale nerSpans uit de
// ProductShellContext meesturen als `extraSpans` naar de engine, zodat er
// geen tweede NER-flow per modus meer nodig is.

import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PiiSpan } from "@/lib/pim/types";
import { QuickMode } from "../modes/QuickMode";
import { StartMode } from "../modes/StartMode";

const evaluateMock = vi.fn(() => ({
  signals: null,
  draft: null,
  guard: null,
  pseudoMapping: null,
}));
const previewDecisionMock = vi.fn(() => ({ verdict: "ALLOW" as const, reason: "" }));
const requestActionMock = vi.fn(async () => ({ executed: true, reason: "ok" }));

const nerSpan: PiiSpan = {
  start: 0,
  end: 4,
  text: "John",
  category: "name",
  ruleId: "ner:person",
  confidence: 0.98,
  contextual: false,
};

type Ctx = ReturnType<typeof buildCtx>;
let ctx: Ctx;

function buildCtx() {
  return {
    engineState: { signals: null, draft: null, guard: null, pseudoMapping: null },
    evaluate: evaluateMock,
    previewDecision: previewDecisionMock,
    requestAction: requestActionMock,
    reset: vi.fn(),
    settings: {
      detectionSettings: {},
      thresholdOverrides: {},
      disabledCategories: new Set(),
      integrity: {},
      advancedPanelProps: {},
    } as unknown as never,
    text: "John mailt vandaag.",
    setText: vi.fn(),
    mode: "anonymous" as const,
    setMode: vi.fn(),
    action: "send_external_ai" as const,
    setAction: vi.fn(),
    writerContent: null,
    setWriterContent: vi.fn(),
    writerAutoRedact: new Set(),
    setWriterAutoRedact: vi.fn(),
    writerStrict: false,
    setWriterStrict: vi.fn(),
    usesNerSlm: true,
    nerEnabled: true,
    nerSpans: [nerSpan],
    nerStatus: null,
    startNer: vi.fn(),
    nerSourceText: "John mailt vandaag.",
    setNerSourceText: vi.fn(),
  };
}

vi.mock("../ProductShellContext", () => ({
  useProductShell: () => ctx,
  ProductShellProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Zware sub-panels laten we buiten deze test; we toetsen alleen de
// engine-call.
vi.mock("@/components/pim/start-go/InputPanel", () => ({
  InputPanel: () => <div data-testid="input-panel" />,
}));
vi.mock("@/components/pim/start-go/ResultPanel", () => ({
  ResultPanel: () => <div data-testid="result-panel" />,
}));
vi.mock("@/components/pim/start-go/SafetyVerdictCard", () => ({
  SafetyVerdictCard: () => <div data-testid="verdict" />,
}));
vi.mock("@/components/pim/start-go/FindingChips", () => ({
  FindingChips: () => <div data-testid="chips" />,
}));

describe("Product modes, centrale NER-spans", () => {
  beforeEach(() => {
    evaluateMock.mockClear();
    ctx = buildCtx();
  });

  it("QuickMode geeft centrale nerSpans mee als extraSpans", async () => {
    render(<QuickMode />);
    await waitFor(() => {
      expect(evaluateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          text: "John mailt vandaag.",
          extraSpans: [nerSpan],
          autoRepair: false,
        }),
      );
    });
  });

  it("StartMode geeft centrale nerSpans mee als extraSpans", async () => {
    render(<StartMode />);
    await waitFor(() => {
      expect(evaluateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          text: "John mailt vandaag.",
          extraSpans: [nerSpan],
          autoRepair: true,
        }),
      );
    });
  });
});