import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PromptEditor from "./PromptEditor";

describe("PromptEditor", () => {
  beforeEach(() => {
    global.fetch = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            current: "v2",
            versions: [
              { id: "v1", saved_at: "2026-05-02T00:00:00Z", text: "seed" },
              { id: "v2", saved_at: "2026-05-02T01:00:00Z", text: "edited" },
            ],
          }),
          { status: 200 }
        )
      )
    ) as unknown as typeof fetch;
  });

  afterEach(() => vi.restoreAllMocks());

  it("loads and displays current version text", async () => {
    render(<PromptEditor kind="editor" />);
    await waitFor(() => expect(screen.getByDisplayValue("edited")).toBeInTheDocument());
  });

  it("toggles history visibility", async () => {
    render(<PromptEditor kind="editor" />);
    await waitFor(() => expect(screen.getByDisplayValue("edited")).toBeInTheDocument());
    expect(screen.queryByText(/^v1$/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /show history/i }));
    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByText("v2")).toBeInTheDocument();
  });

  it("expands version text inline instead of an alert dialog", async () => {
    render(<PromptEditor kind="editor" />);
    await waitFor(() => expect(screen.getByDisplayValue("edited")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /show history/i }));
    expect(screen.queryByText("seed")).not.toBeInTheDocument();
    const views = screen.getAllByRole("button", { name: /^view$/i });
    await userEvent.click(views[0]);
    expect(screen.getByText("seed")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^close$/i }));
    expect(screen.queryByText("seed")).not.toBeInTheDocument();
  });

  it("requires inline confirmation before deleting a version", async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    render(<PromptEditor kind="editor" />);
    await waitFor(() => expect(screen.getByDisplayValue("edited")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /show history/i }));
    const deletes = () => screen.getAllByRole("button", { name: /^delete$/i });
    const deleteCalls = () =>
      fetchMock.mock.calls.filter(([, i]) => (i as RequestInit)?.method === "DELETE");

    await userEvent.click(deletes()[0]);
    expect(screen.getByText(/delete v1\? this can't be undone/i)).toBeInTheDocument();
    expect(deleteCalls()).toHaveLength(0);

    await userEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    expect(screen.queryByText(/delete v1\?/i)).not.toBeInTheDocument();
    expect(deleteCalls()).toHaveLength(0);

    await userEvent.click(deletes()[0]);
    await userEvent.click(screen.getByRole("button", { name: /confirm delete/i }));
    await waitFor(() => expect(deleteCalls()).toHaveLength(1));
    expect(fetchMock.mock.calls.find(([, i]) => (i as RequestInit)?.method === "DELETE")?.[0])
      .toBe("/prompts/editor/v1");
  });
});
