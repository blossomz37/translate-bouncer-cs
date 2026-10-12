# Roadmap

Planned features and fixes for Translate, in ship order. Each slice ships
on its own branch with tests, gates green, and a changelog entry.

## Now — Slice 1: txt/md ingest (v1)

Accept `.txt` and `.md` books as ingest input, same two shapes as `.docx`
today (whole-book file or one-file-per-chapter folder). Output stays
`final.docx` for v1.

- New `server/text_io.py`: `parse_txt` (blank-line paragraphs) and
  `parse_md` (`#` headings → heading levels, `*`/`**` pass through).
- Generalize `SourceFormat` + folder filter + chapter-split seam in
  `server/ingest.py` / `server/chapter_split.py` (splitting logic itself
  needs no changes).
- Update macOS picker prompts, New Book labels, README, tests + fixtures.

## Next — UI trust fixes (shipped 2026-10-12)

Small, high-impact correctness and safety fixes from the Oct 2026 review:

1. Render the swallowed chapter-load error (today: stuck on "Loading…").
2. Ingest busy state: disable the button while submitting, block
   double-submit.
3. Confirm Done/finalize ("writes final.docx") and link the finished file.
4. Replace native `alert()`/`confirm()` in prompt history with inline UI.
5. Return HTTP 400 (not 500) when chapter splitting finds no boundaries.
6. Reconcile README with the shipped UI (button labels, diff behavior,
   prompt location, batch modal, fallback-pattern claims).

## Later — features

- **Cost visibility:** estimate before Continue/batch ("≈ $X–Y") plus a
  running session-spend readout, using pricing data already loaded.
- **Guided first run:** setup checklist (API key → models → first book)
  and a one-line "Continue will run…" preview.
- **Reading surface:** serif/prose styling for the Working pane,
  resizable or collapsible panes, stacking on narrow screens.
- **Symmetric txt/md output:** `write_txt`/`write_md` so txt/md books
  finish as txt/md instead of `final.docx` (documented as prose-subset
  md only: headings, bold, italic — no tables/lists/links).
- **Brand and polish:** identity, consistent buttons, transitions,
  focus styles, dark mode.

## Out of scope (deliberately not planned)

- Full-fidelity Markdown round-tripping (the paragraph model can't
  represent tables, lists, or links without a redesign).
- New formats beyond txt/md (e.g. EPUB, PDF).
