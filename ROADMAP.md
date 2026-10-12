# Roadmap

Planned features and fixes for Translate, in ship order. Each slice ships
on its own branch with tests, gates green, and a changelog entry.

## Shipped

- **Slice 1 — txt/md ingest v1** (2026-10-12): `.txt`/`.md` ingest input,
  docx output.
- **Slice 2 — UI trust fixes** (2026-10-12): chapter-load error UI, ingest
  busy state, Done confirmation + final.docx download, inline prompt
  history dialogs, ChapterSplitError → 400, README reconciliation.

## Now — Slice 3: translate-first pipeline

Start from an English-only manuscript: per-chapter **Simplify →
Dossier → Translate** manufactures the `source-translated/` draft that
rounds then refine. Expert basis: the FFA translations class notes
(dossier-driven translation, simplification pre-edit, per-chapter
visible artifacts) plus 2025 input-rewriting research (simplification
still improves LLM translation quality).

Decisions (from the class material):

- Per-chapter on demand, not whole-book at ingest — every class
  artifact is per-chapter and meant for human inspection.
- Simplification feeds translation only; proofreading rounds keep
  referencing the original English (the voice/style authority).
- Dossier is built from the simplified text (the text being translated).
- Reuse the chapter's Editor model for all three passes (no new
  model settings in v1).

Server:

- New prompt kinds `simplifier`, `dossier`, `translator`, seeded from
  the class prompts, versioned in Settings like the others.
- `render_translate_payload` (EN + empty target slots); new
  `run_simplification_pass` / `run_dossier_pass` /
  `run_translation_pass` in `rounds.py` reusing the payload parser.
- `POST /books/{slug}/chapter/{n}/translate` runs all three passes
  with SSE stage events; `GET …/draft` returns the saved dossier,
  simplified text, and draft status for viewing.
- `translated_path` optional at ingest (`meta.json` translated source
  becomes `{path: null, format: "generated"}`); draft presence
  detected by file, no new chapter status.
- Minimal cost readout (estimate-only v1): per-action ≈ estimates
  from payload size × model pricing, plus a session estimate total.
  Actual usage capture from API responses is future work.

Client:

- Translated path optional in New Book, with a hint explaining the
  two ways to start (own draft vs. machine translation).
- Working pane "Translate from English" entry state when no draft
  exists; right-pane Draft tab showing dossier + simplified text.
- Prompt editors for the three new kinds in Settings.

Explicitly later (not v1): book-level accumulated glossary, batch
auto-translate of missing drafts, actual-cost tracking.

## Later — features

- **Cost visibility (full):** real spend from API usage, budgets.
  (Slice 3 ships the estimate-only minimum.)
- **Guided first run:** setup checklist (API key → models → first book)
  and a one-line "Continue will run…" preview — built on the true
  flow once Slice 3 lands.
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
