# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `AGENTS.md` agent orientation manifest (what the app does, how it works,
  where things live).
- `CHANGELOG.md` in Keep a Changelog format.
- `.archive/` convention for zipped superseded/stale/inactive files.
- `.scratch/` convention for the owner's ephemeral notes (gitignored).
- `requirements.lock`: pinned Python constraints, verified with a green
  test run in a pristine venv.
- `.github/workflows/ci.yml`: server (pytest + ruff + mypy on Python 3.11)
  and client (vitest + build on Node 22) on every push.
- Ruff (pyflakes F-only) and mypy configurations in `pyproject.toml`.
- `workspace-agents/runs/` for dated session handoff notes, and a
  Definition of Done in `AGENTS.md`.
- `ROADMAP.md`: ordered plan for txt/md ingest, UI trust fixes, and
  later features (cost visibility, guided first run, reading surface).
- Book ingestion accepts `.txt` and `.md` sources (whole-book file or
  one-file-per-chapter folder), alongside `.docx`. Plain-text
  paragraphs split on blank lines; Markdown `#` headings map to
  chapter headings (prose subset only: headings, bold, italic).
  Round and finalize output stays `.docx` for now.
- Translate-first pipeline (server): new `simplifier`, `dossier`, and
  `translator` prompt kinds seeded from the FFA translations class,
  plus Simplify → Dossier → Translate chapter passes that manufacture
  the `source-translated/` draft rounds then refine.
- English-only ingest: `translated_path` is now optional (`meta.json`
  records `{path: null, format: "generated"}`). New
  `POST /books/{slug}/chapter/{n}/translate` (runs all three passes
  with live stage events) and `GET …/draft` (dossier, simplified
  text, draft status) endpoints; rounds refuse chapters with no draft
  instead of failing.
- Translate-first UI: Translated path optional in New Book; chapters
  without a draft show a "Translate from English" entry with a ≈ cost
  estimate instead of an empty pane; new Draft tab shows the dossier
  and simplified text; Continue shows a ≈ estimate and the status bar
  keeps a running session estimate (estimate-only v1).
- `STATUS.md`: one-page project status snapshot with a doc map; test
  suite counts refreshed across `README.md` and `AGENTS.md`.
- Home page shows a setup checklist (API key → default models → first
  book) until each step is done, with links into Settings and New Book.
- Book page shows a progress header ("X to translate · Y in progress ·
  Z done") with one suggested next-action button into the chapter that
  needs attention.

### Changed
- Moved the prior developer's agentic working files from `docs/superpowers/`
  to `workspace-agents/superpowers/`, reserving `docs/` for official
  maintained app documentation.

### Fixed
- Events route registration test now uses `url_path_for` instead of flat
  `app.routes` introspection, which broke under Starlette 1.x (test-only;
  the app itself was unaffected).
- Removed 20 unused imports and fixed 6 test typing errors so the new
  ruff and mypy gates pass (no behavior change).
- Chapter workspace shows an error with Retry and Back-to-book actions
  when the chapter fails to load, instead of "Loading…" forever.
- New Book modal disables the Ingest button and shows "Ingesting…"
  while submitting, blocking double-submit on large books.
- Done now asks for confirmation ("Write final.docx and mark done?")
  and finished chapters offer a "Download final.docx" link, served by
  a new `GET /books/{slug}/chapter/{n}/final` endpoint.
- Prompt history View expands the version text inline and Delete asks
  inline ("Delete v1? …") instead of native `alert()`/`confirm()` popups.
- Ingesting a whole-book file with no detectable chapter boundaries
  returns HTTP 400 with an explanation instead of HTTP 500.
- README reconciled with the shipped UI: Ingest labels, diff checkbox,
  prompt editor location, batch window, status colors, default
  patterns, metadata filenames, plus the new Done flow.

## [0.1.0] - 2026-05-21

Inherited baseline from upstream (`wmiles81/Translate-bouncer`). Local web
app for AI-assisted bilingual chapter proofreading.

### Added
- Book ingestion from `.docx` (whole-book or one-file-per-chapter), with
  automatic chapter splitting and paragraph pairing.
- Proofreading rounds per chapter: Editor pass → Reviewer suggestions →
  Editor applies suggestions, via user-chosen OpenRouter models.
- Side-by-side comparison of each round against the previous version.
- Batch mode: run rounds across many chapters unattended, with live
  per-model status over Server-Sent Events.
- Editable Editor/Reviewer prompts with full version history and restore.
- Chapter finalization: writes shippable `final.docx`, marks chapter done.
- Per-book state under `~/.translate/` (parsed sources, round artifacts,
  chapter metadata); single-instance lock file.
- React + Vite + TypeScript web UI: Books list, Book page, Chapter
  workspace (English / Working / Suggestions / Diff panes), model picker
  with pricing, Settings page, native macOS file picker.
- Double-click launchers for macOS, Windows, and Linux, plus
  `scripts/package.sh` to build the distributable `Translate.zip`.
- pytest server suite and vitest client suite.
