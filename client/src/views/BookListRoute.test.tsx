import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BookListRoute from "./BookListRoute";

describe("BookListRoute", () => {
  beforeEach(() => {
    global.fetch = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(["a-book", "b-book"]), { status: 200 }))
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists slugs from GET /books", async () => {
    render(
      <MemoryRouter>
        <BookListRoute />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText("a-book")).toBeInTheDocument());
    expect(screen.getByText("b-book")).toBeInTheDocument();
  });

  it("shows empty state when no books", async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockReset();
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 })
    );
    render(
      <MemoryRouter>
        <BookListRoute />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText(/no books yet/i)).toBeInTheDocument());
  });

  it("blocks double-submit while ingesting", async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    let resolvePost!: (v: Response) => void;
    const postGate = new Promise<Response>((res) => { resolvePost = res; });
    fetchMock.mockImplementation((url: unknown, init?: RequestInit) => {
      if (String(url) === "/books" && init?.method === "POST") return postGate;
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });
    render(
      <MemoryRouter>
        <BookListRoute />
      </MemoryRouter>
    );
    await userEvent.click(screen.getByRole("button", { name: /new book/i }));
    await userEvent.type(screen.getByLabelText(/translated path/i), "/p/fr");
    await userEvent.type(screen.getByLabelText(/english path/i), "/p/en");
    const ingest = screen.getByRole("button", { name: /^ingest$/i });
    await userEvent.click(ingest);
    await waitFor(() => expect(screen.getByRole("button", { name: /ingesting/i })).toBeDisabled());
    await userEvent.click(screen.getByRole("button", { name: /ingesting/i }));
    const posts = fetchMock.mock.calls.filter(
      ([u, i]) => String(u) === "/books" && (i as RequestInit)?.method === "POST"
    );
    expect(posts).toHaveLength(1);
    resolvePost(new Response(JSON.stringify({ slug: "x" }), { status: 200 }));
    await waitFor(() => expect(screen.queryByLabelText(/translated path/i)).not.toBeInTheDocument());
  });
});
