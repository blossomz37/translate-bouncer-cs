import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { ChapterEntry } from "../types/api";
import BookProgress from "./BookProgress";

const ch = (n: number, status: ChapterEntry["status"], has_draft: boolean): ChapterEntry => ({
  n, title: `Ch ${n}`, status, has_draft,
});

describe("BookProgress", () => {
  it("counts buckets and points at the first untranslated chapter", () => {
    render(
      <MemoryRouter>
        <BookProgress
          bookSlug="x"
          chapters={[ch(1, "done", true), ch(2, "in_progress", true), ch(3, "untouched", false)]}
        />
      </MemoryRouter>
    );
    expect(screen.getByText(/1 to translate · 1 in progress · 1 done/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /translate chapter 3/i }))
      .toHaveAttribute("href", "/book/x/chapter/3");
  });

  it("points at the first unfinished chapter once all are translated", () => {
    render(
      <MemoryRouter>
        <BookProgress
          bookSlug="x"
          chapters={[ch(1, "done", true), ch(2, "untouched", true)]}
        />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: /continue chapter 2/i }))
      .toHaveAttribute("href", "/book/x/chapter/2");
  });

  it("celebrates when everything is done", () => {
    render(
      <MemoryRouter>
        <BookProgress bookSlug="x" chapters={[ch(1, "done", true)]} />
      </MemoryRouter>
    );
    expect(screen.getByText(/all 1 chapter done/i)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
