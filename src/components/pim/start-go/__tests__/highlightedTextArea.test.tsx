import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HighlightedTextArea } from "../HighlightedTextArea";
import type { PiiSpan } from "@/lib/pim/types";

const span: PiiSpan = {
  start: 4,
  end: 8,
  text: "Jans",
  category: "name",
  confidence: 0.9,
  ruleId: "test.name",
} as PiiSpan;

describe("HighlightedTextArea, vervangbubbel", () => {
  it("opent Vervang/Negeer bij een klik in een markering", () => {
    const onSpanAction = vi.fn();
    render(
      <HighlightedTextArea
        value="Hoi Jans hier"
        onValueChange={() => {}}
        spans={[span]}
        onSpanAction={onSpanAction}
      />,
    );
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    ta.setSelectionRange(5, 5);
    fireEvent.click(ta);
    fireEvent.click(screen.getByText("Vervang"));
    expect(onSpanAction).toHaveBeenCalledWith(span, "replace");
  });

  it("toont geen bubbel buiten een markering", () => {
    render(
      <HighlightedTextArea
        value="Hoi Jans hier"
        onValueChange={() => {}}
        spans={[span]}
        onSpanAction={() => {}}
      />,
    );
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    ta.setSelectionRange(12, 12);
    fireEvent.click(ta);
    expect(screen.queryByTestId("span-bubble")).toBeNull();
  });
});
