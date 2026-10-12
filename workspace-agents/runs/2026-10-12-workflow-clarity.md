# 2026-10-12 — Slice 4: workflow clarity

Owner: the main pages look the same and workflow entry points are
unclear. Approved a clarity slice: setup checklist, book progress
header, chapter stage strip.

## Did

- Server: `GET /books/{slug}` enriches chapters with `has_draft`
  (filesystem check; `ChapterEntry.has_draft` defaults None so stored
  `meta.json` needs no migration).
- Client: `SetupChecklist` on Home (key → models → first book, links
  into Settings / New Book, hides when complete); `BookProgress`
  header ("X to translate · Y in progress · Z done" + next-action
  link); `StageIndicator` strip under the chapter top bar
  (Translate → Rounds → Done + "Next: …" hint); `ChapterEntry`
  type extended.
- Docs: README §§6–8 (checklist, progress header, five-band diagram,
  stage strip), ROADMAP Slice 4 marked shipped, CHANGELOG entries,
  suite counts refreshed (144/131).
- Merged to `main` locally, deleted branch. Not pushed (owner's call).

## Results

- All five gates green: pytest 144/144, ruff clean, mypy clean,
  vitest 131/131, `npm run build` passes.

## Decisions

- `has_draft` computed at read time in the route, not stored — no
  migration, always truthful.
- Checklist is data-driven (settings + book list), not dismissible —
  it vanishes by completing setup.
- "In progress" bucket = done-neither-untranslated (in-rounds plus
  ready-with-draft); next action prefers first untranslated chapter.
- Stage derives from status + draft presence; no new chapter status.

## Open

- Push `main` to origin (owner's call).
- Remaining roadmap Later: full cost visibility, reading surface,
  symmetric txt/md output, brand/polish. Guided first run is now
  largely covered by Slice 4 (checklist + progress + stage).
