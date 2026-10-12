# 2026-10-12 — Slice 3: translate-first pipeline

Owner hit the product's missing half (app needed a draft translation he
didn't have), proposed translate-from-scratch, and pointed at the FFA
translations class notes (`.scratch/translations-class-notes`, read-only)
as the expert basis. Declined my build-order options; asked for advice
grounded in the notes (+ web research if needed).

## Did

- Read the class notes: taught pipeline is Simplify → Dossier →
  Translate per chapter with visible artifacts, then proofread/QA.
  Cross-checked simplification against a 2025 paper (still helps LLM
  translation). Advised: per-chapter placement, all three passes,
  build before Later polish (first-run/cost depend on the true flow).
- Roadmap: recorded Slice 3, then marked it shipped with Later items
  reworded (cost-full and guided first-run now buildable).
- Server: `simplifier`/`dossier`/`translator` prompt kinds seeded from
  the class prompts; `render_numbered_source`/`render_translate_payload`;
  three pass functions in `rounds.py` (style-restore by index, empty
  paragraph rejection); optional `translated_path` at ingest
  (`{path: null, format: "generated"}`); `POST …/translate` (guards:
  409 with rounds or supplied draft) and `GET …/draft`; docs endpoint
  tolerates missing drafts (working null); round routes 400 without
  a draft instead of 500ing.
- Client: optional Translated path + hint; TranslateEntry pane with ≈
  estimate; Draft tab (dossier + simplified); Continue estimate +
  locked without draft; session estimate total in the status bar;
  3 new Settings prompt editors; `generated` source label on Book page.
- Docs: README (two ways to start, §9 translate section, Draft tab,
  estimates, batch note, 5 prompts, draft artifacts, 2 endpoints),
  AGENTS.md pipeline, CHANGELOG entries per commit.
- Merged to `main` locally, deleted branch. Not pushed (owner's call).

## Results

- All five gates green: pytest 143/143 (was 125), ruff clean, mypy
  clean (one dict-type fix mid-run), vitest 118/118 (was 105),
  `npm run build` passes.
- One test-authoring slip fixed mid-run (insert landed mid-test).

## Decisions

- Per-chapter on demand (class artifacts are per-chapter, human
  inspected); re-translate allowed only for machine drafts
  (draft-translation.raw.txt presence), never over supplied ones.
- Simplification feeds translation only; rounds still reference the
  original English. Dossier built from simplified text.
- Editor model reused for all three passes; prompt versions recorded
  in chapter meta (PromptsUsed extended, optional fields).
- Cost is estimate-only v1 (tokens ≈ chars/4, output ≈ input),
  labeled ≈ everywhere; batch excluded from the session total and
  disclosed via tooltip. Actuals = Later work.
- Later (not v1): book-level glossary, batch auto-translate.

## Open

- Push `main` to origin (owner's call).
- The owner's `the-crumbling-wards/drafts/*.txt` is the natural pilot:
  ingest English-only, translate ch-01, review dossier + draft.
- `STATUS.md` (untracked, owner's file) left untouched.
