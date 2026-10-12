# 2026-10-12 — App assessment + roadmap + txt/md ingest v1

Owner asked for (1) a UI/design assessment and (2) txt/md ingest.
Ran two parallel read-only reviewer agents, then implemented Slice 1.

## Did

- UI/UX + ingest audits via two helper agents (full reports were
  session-local; key findings summarized below).
- Added `ROADMAP.md` (Now / Next / Later + out-of-scope) and linked it
  from `AGENTS.md` repo map.
- Slice 1 — txt/md ingest v1: new `server/text_io.py` (`parse_txt`,
  `parse_md`); `SourceFormat` + dispatch generalized in `server/ingest.py`;
  parser-independent `split_parsed` in `server/chapter_split.py`
  (`split_docx` kept as a wrapper); picker prompts + New Book labels;
  README + CHANGELOG updated. Output stays `final.docx`.
- Tests: new `tests/server/test_text_io.py` (8 tests); 7 new tests in
  `tests/server/test_ingest.py` (all tmp-based, no new fixtures).
- Merged to `main` locally, deleted `feat/txt-md-ingest`. Not pushed
  (owner's call).

## Results

- All five gates green: pytest 122/122 (was 107), ruff clean, mypy
  clean, vitest 95/95, `npm run build` passes.
- One test expectation fixed mid-run (mine, not the product's): folder
  ingest titles come from filename stems, not md headings.

## Decisions

- Fixes live in `ROADMAP.md` (Next) and land in the changelog as each
  ships, so the changelog never logs unmade fixes as done.
- txt paragraphs split on blank lines, single newlines joined (Markdown
  semantics); no hard-wrap heuristic. md is prose-subset only.
- Non-UTF-8 text files raise `ValueError` → HTTP 400, not 500.
- Empty-folder error now reads "no .docx, .txt, or .md files in …"
  (old test regex still matches; no test change needed).

## Open

- Next slice per roadmap: UI trust fixes (swallowed chapter-load error,
  ingest busy state, Done confirm + final.docx link, alert/confirm
  replacement, ChapterSplitError → 400, README reconciliation).
- `STATUS.md` (untracked, owner's file) left untouched.
