# Status

Translate — local web app for AI-assisted book translation and bilingual
chapter proofreading (FFA members' own books). Python FastAPI server +
React/Vite SPA; OpenRouter is the only outside service.

## Where things stand

- `main` is green and pushed (2026-10-12): pytest 144, vitest 131,
  ruff, mypy, and client build all pass; CI runs the same gates.
- Shipped: txt/md ingest, UI trust fixes, and the translate-first
  pipeline (English-only ingest → per-chapter Simplify → Dossier →
  Translate → Editor/Reviewer rounds → `final.docx`).
- Next up: see `ROADMAP.md` Later (full cost visibility, guided
  first run, reading surface, symmetric txt/md output, brand/polish).

## Doc map

- `README.md` — end-user manual (§15 has the API surface + dev setup).
- `AGENTS.md` — agent orientation: architecture, run commands, gates,
  definition of done.
- `ROADMAP.md` — shipped slices + what comes next.
- `CHANGELOG.md` — Keep a Changelog; `[Unreleased]` holds the latest.
- `workspace-agents/runs/` — dated session handoff notes.

## Run it

From source (details in `AGENTS.md`): build the client once with
`npm ci && npm run build`, then `.venv/bin/translate`. End users get
`release/Translate.zip` via `scripts/package.sh`.
