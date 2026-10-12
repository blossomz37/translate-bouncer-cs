# 2026-10-12 — UI trust fixes (roadmap Next slice)

Owner approved the roadmap's Next slice. One branch, one commit per fix,
merged locally. Not pushed (owner's call).

## Did

1. Chapter-load failure shows an error with Retry + Back-to-book
   (`ChapterRoute.tsx`; was stuck on "Loading…" forever).
2. New Book modal shows "Ingesting…" and locks the button while
   submitting (`NewBookModal.tsx`, `BookListRoute.tsx`).
3. Done asks for confirmation ("Write final.docx and mark done?") and
   finished chapters get a "Download final.docx" link, served by new
   `GET /books/{slug}/chapter/{n}/final` (`StatusBar.tsx`,
   `ChapterRoute.tsx`, `server/routes/chapters.py`, `api/chapters.ts`).
4. Prompt history View expands inline and Delete confirms inline
   (`PromptEditor.tsx`; no more `alert()`/`confirm()`).
5. Unsplittable whole-book ingest returns HTTP 400, not 500
   (`server/routes/books.py` catches `ChapterSplitError`).
6. README reconciled with the shipped UI (§§4–12: Ingest labels, diff
   checkbox, prompt location, batch window, status colors, default
   patterns, `meta.json` filenames, new Done flow).
- Each fix has tests + a CHANGELOG entry; `ROADMAP.md` Next marked shipped.

## Results

- All five gates green: pytest 125/125 (was 122), ruff clean, mypy
  clean, vitest 105/105 (was 95), `npm run build` passes.
- One existing test updated for the new Done behavior (two-step
  confirm); everything else additive.

## Decisions

- `alert()`/`confirm()` replacements and the Done confirmation use
  inline two-step UI in the existing components (no new modal system).
- Download is a plain anchor to the new endpoint (same-origin; covered
  by the existing `/books` dev proxy).
- Found while reconciling: §12 said `book.json`/`chNN.json`, disk has
  `meta.json` — fixed in the same docs commit.

## Open

- Roadmap Later items untouched: cost visibility, guided first run,
  reading surface, symmetric txt/md output, brand/polish.
- `STATUS.md` (untracked, owner's file) left untouched.
