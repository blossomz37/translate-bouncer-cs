# Roadmap

Planned features and fixes for Translate, in ship order. Each slice ships
on its own branch with tests, gates green, and a changelog entry.

## Shipped

- **Slice 1 — txt/md ingest v1** (2026-10-12): `.txt`/`.md` ingest input,
  docx output.
- **Slice 2 — UI trust fixes** (2026-10-12): chapter-load error UI, ingest
  busy state, Done confirmation + final.docx download, inline prompt
  history dialogs, ChapterSplitError → 400, README reconciliation.
- **Slice 3 — translate-first pipeline** (2026-10-12): English-only
  ingest; per-chapter Simplify → Dossier → Translate manufactures the
  draft (prompts seeded from the FFA class); dossier/simplified
  artifacts viewable in a Draft tab; estimate-only cost readout
  (≈ per action + session total).

## Now — Slice 4: workflow clarity

The pages work but don't teach the workflow. Three additions:

1. **Setup checklist** on Home until key + default models + first
   book exist (each item links to Settings or opens New Book).
2. **Book progress header**: "X to translate · Y in progress · Z
   done" with one suggested next-action button (Translate / Continue
   the next chapter). Server enriches `GET /books/{slug}` chapters
   with `has_draft` (file check, no migration).
3. **Chapter stage indicator**: Translate → Rounds → Done strip under
   the top bar showing where this chapter is and what's next.

## Later — features

- **Cost visibility (full):** real spend from API usage, budgets.
  (Estimate-only minimum already shipped in Slice 3.)
- **Guided first run:** setup checklist (API key → models → first book)
  and a one-line "Continue will run…" preview — now buildable on the
  true translate-first flow.
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
