import { act, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...rest }: any) => <a href={to} {...rest}>{children}</a>,
  useNavigate: () => vi.fn(),
  useRouterState: () => ({ location: { pathname: "/app" } }),
}));
vi.mock("@/components/pim/writer/WriterWorkspace", () => ({ WriterWorkspace: () => <div /> }));
vi.mock("@/components/pim/start-go/LiveTechMonitor", () => ({ DiagnosticsBody: () => <div /> }));
import { ProductShell } from "@/components/pim/product/ProductShell";
describe("dbg", () => {
  it("dump", async () => {
    render(<ProductShell mode="check" />);
    const editor = screen.getAllByRole("textbox")[0];
    await act(async () => { fireEvent.change(editor, { target: { value: "Mail van Jan Jansen via jan.jansen@voorbeeld.nl over de toets." } }); });
    await waitFor(() => expect(screen.getByTestId("analysis-status").getAttribute("data-state")).toBe("ready"), { timeout: 5000 });
    console.log(screen.getAllByRole("button").map((b) => b.textContent).join(" | "));
  }, 20000);
});
