import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChapterRoute from "./ChapterRoute";

describe("ChapterRoute", () => {
  beforeEach(() => {
    // Stub EventSource to a no-op so useEvents doesn't throw
    (globalThis as unknown as { EventSource: unknown }).EventSource = class {
      onmessage: unknown = null;
      onerror: unknown = null;
      close() {}
    };
    global.fetch = vi.fn((url) => {
      const u = String(url);
      if (u === "/books/x") {
        return Promise.resolve(new Response(JSON.stringify({
          slug: "x",
          created_at: "2026-05-02T00:00:00Z",
          sources: { translated: { path: "/p/fr", format: "folder" }, english: { path: "/p/en", format: "folder" } },
          language_pair: { from: "en", to: "fr" },
          chapters: [{ n: 1, title: "Ch 1", status: "untouched" }],
        }), { status: 200 }));
      }
      if (u === "/books/x/chapter/1/state") {
        return Promise.resolve(new Response(JSON.stringify({
          n: 1, status: "untouched", current_round: 0,
          models: { editor: "", reviewer: "" },
          prompts_used: { editor_version: null, reviewer_version: null },
          rounds: [],
        }), { status: 200 }));
      }
      if (u === "/books/x/chapter/1/docs") {
        return Promise.resolve(new Response(JSON.stringify({
          english: { paragraphs: [{ style: "normal", text: "Hello." }] },
          working: { paragraphs: [{ style: "normal", text: "Bonjour." }] },
          previous: null,
          suggestions: null,
        }), { status: 200 }));
      }
      if (u === "/models") return Promise.resolve(new Response(JSON.stringify([{ id: "m1" }, { id: "m2" }]), { status: 200 }));
      if (u === "/settings") return Promise.resolve(new Response(JSON.stringify({
        openrouter_api_key: "k",
        default_models: { editor: "m1", reviewer: "m2" },
        ingestion: { heading_style: "Heading 1", fallback_patterns: [] },
      }), { status: 200 }));
      return Promise.reject(new Error(`unexpected ${u}`));
    }) as unknown as typeof fetch;
  });

  afterEach(() => vi.restoreAllMocks());

  it("renders the three panes after loading", async () => {
    render(
      <MemoryRouter initialEntries={["/book/x/chapter/1"]}>
        <Routes>
          <Route path="/book/:slug/chapter/:n" element={<ChapterRoute />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText("Hello.")).toBeInTheDocument());
    expect(screen.getByText("Bonjour.")).toBeInTheDocument();
    expect(screen.getByText(/click continue/i)).toBeInTheDocument();
  });

  it("shows an error with retry and back link when loading fails", async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const orig = fetchMock.getMockImplementation() as (url: unknown) => Promise<Response>;
    fetchMock.mockImplementation((url: unknown) => {
      if (String(url) === "/books/x/chapter/1/docs") {
        return Promise.resolve(new Response("boom", { status: 500 }));
      }
      return orig(url);
    });
    render(
      <MemoryRouter initialEntries={["/book/x/chapter/1"]}>
        <Routes>
          <Route path="/book/:slug/chapter/:n" element={<ChapterRoute />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText(/couldn't load this chapter/i)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to book/i })).toHaveAttribute("href", "/book/x");

    const callsBefore = fetchMock.mock.calls.length;
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it("shows a final.docx download link when the chapter is done", async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const orig = fetchMock.getMockImplementation() as (url: unknown) => Promise<Response>;
    fetchMock.mockImplementation((url: unknown) => {
      if (String(url) === "/books/x/chapter/1/state") {
        return Promise.resolve(new Response(JSON.stringify({
          n: 1, status: "done", current_round: 1,
          models: { editor: "m1", reviewer: "m2" },
          prompts_used: { editor_version: null, reviewer_version: null },
          rounds: [{ n: 1 }],
        }), { status: 200 }));
      }
      return orig(url);
    });
    render(
      <MemoryRouter initialEntries={["/book/x/chapter/1"]}>
        <Routes>
          <Route path="/book/:slug/chapter/:n" element={<ChapterRoute />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByRole("link", { name: /download final\.docx/i })).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /download final\.docx/i }))
      .toHaveAttribute("href", "/books/x/chapter/1/final");
  });

  it("shows translate entry and runs the pipeline when no draft exists", async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const orig = fetchMock.getMockImplementation() as (url: unknown) => Promise<Response>;
    fetchMock.mockImplementation((url: unknown, init?: RequestInit) => {
      const u = String(url);
      if (u === "/books/x/chapter/1/docs") {
        return Promise.resolve(new Response(JSON.stringify({
          english: { paragraphs: [{ style: "normal", text: "Hello." }] },
          working: null,
          previous: null,
          suggestions: null,
        }), { status: 200 }));
      }
      if (u === "/models") {
        return Promise.resolve(new Response(JSON.stringify([
          { id: "m1", pricing: { prompt: "0.000003", completion: "0.000015" } },
          { id: "m2", pricing: { prompt: "0.000003", completion: "0.000015" } },
        ]), { status: 200 }));
      }
      if (u === "/books/x/chapter/1/translate" && init?.method === "POST") {
        return Promise.resolve(new Response(JSON.stringify({
          state: {
            n: 1, status: "untouched", current_round: 0,
            models: { editor: "m1", reviewer: "" },
            prompts_used: {
              editor_version: null, reviewer_version: null,
              simplifier_version: "v1", dossier_version: "v1", translator_version: "v1",
            },
            rounds: [],
          },
          draft: { paragraphs: [{ style: "normal", text: "Bonjour." }] },
          simplified: { paragraphs: [{ style: "normal", text: "Hello." }] },
          dossier: "## Dossier",
        }), { status: 200 }));
      }
      return orig(url);
    });
    render(
      <MemoryRouter initialEntries={["/book/x/chapter/1"]}>
        <Routes>
          <Route path="/book/:slug/chapter/:n" element={<ChapterRoute />} />
        </Routes>
      </MemoryRouter>
    );
    const translateBtn = await screen.findByRole("button", { name: /translate from english/i });
    // Priced models → an ≈ estimate is shown; Continue stays locked.
    expect(translateBtn.textContent).toMatch(/≈/);
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
    await userEvent.click(translateBtn);
    await waitFor(() =>
      expect(screen.getAllByText(/draft translated/i).length).toBeGreaterThanOrEqual(1)
    );
    const post = fetchMock.mock.calls.find(
      ([u, i]) => String(u) === "/books/x/chapter/1/translate"
        && (i as RequestInit)?.method === "POST"
    );
    expect(post).toBeTruthy();
    expect(JSON.parse((post![1] as RequestInit).body as string)).toEqual({ model: "m1" });
  });
});
