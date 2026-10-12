# Translate — Agent Orientation

> Read this file before working in this repo. It describes what the app does,
> how it works, and where things live. `README.md` is the user manual;
> this file is the map for agents.

**Repo:** `blossomz37/translate-bouncer-cs` (fork of `wmiles81/Translate-bouncer`)
**Status:** No active development goal yet — orientation only.

## What this app does

Translate is a **local web app for AI-assisted bilingual chapter proofreading**.
Its users are Future Fiction Academy members translating their own books.

The workflow: point Translate at a translated book (e.g. a German `.docx`)
plus the English original. It splits both into chapters, pairs them
paragraph-for-paragraph, and walks each chapter through repeated
**Editor → Reviewer → Editor (apply suggestions)** rounds using two AI
models the user picks. When the user is happy, they click **Done** and
Translate writes a final `.docx` for that chapter.

Everything runs locally. The only outside service is
[OpenRouter](https://openrouter.ai), which routes prompts to the chosen
models. Manuscripts leave the machine only as prompt bodies sent to OpenRouter.

## How it works

**Architecture:** Python FastAPI server (`server/`) + React/Vite/TypeScript
single-page app (`client/`). In production the server serves the prebuilt
client bundle (`client/dist/`) as static files; end users never need Node.

**Core pipeline** (per chapter):

1. **Ingest** (`server/ingest.py`, `chapter_split.py`, `docx_io.py`) —
   split source `.docx` files into chapters, parse to paragraph JSON.
2. **Round** (`server/rounds.py`, `payload.py`, `prompts.py`, `openrouter.py`) —
   render a bilingual payload, send to the Editor model, send the result
   to the Reviewer model for suggestions, send suggestions back to the
   Editor to apply. Each round produces a new working version.
3. **Finalize** (`server/finalize.py`) — write `final.docx`, mark chapter done.

**Supporting pieces:**

- `server/routes/` — FastAPI route modules (`books`, `chapters`, `events`,
  `prompts`, `settings`, `system`). Full endpoint list is in
  `README.md` §15 ("API surface").
- `server/sse.py` + `GET /events` — Server-Sent Events stream for live
  round progress, retries, errors (drives the client's status bar).
- `server/state.py`, `paths.py`, `config.py` — typed state read/write,
  path helpers, Pydantic config model.
- `server/lock.py`, `main.py` — single-instance lock file, app factory,
  `translate` CLI entry point.
- Client batch mode (`src/lib/batchRunner.ts`, `BatchRunModal`,
  `BatchControls`) runs rounds across many chapters unattended.

**Runtime data** (not in this repo) lives under `~/.translate/`:
`config.json`, `prompts/`, per-book folders with parsed sources
(`source-en/`, `source-translated/`), per-chapter round artifacts
(`round-K-editor.docx/.json/.raw.txt`, `round-K-reviewer.json`),
chapter metadata, and `final.docx`. Full table in `README.md` §12.

## Repo map

| Path | What it is |
|---|---|
| `server/` | FastAPI server (Python 3.11+) |
| `server/routes/` | API route modules |
| `client/` | React + Vite + TS SPA (`src/views/`, `src/components/`, `src/hooks/`, `src/lib/`, `src/api/`, `src/types/`) |
| `tests/server/` | pytest suite (server-side) |
| `client/src/**/*.test.*` | vitest suite (client-side, co-located) |
| `scripts/package.sh` | Builds the distributable `release/Translate.zip` |
| `release-files/` | Launchers (`.command`/`.bat`/`.sh`) + `QUICK_START.txt` staged into the zip |
| `docs/superpowers/` | Original design docs and plans (historical context) |
| `README.md` | End-user manual + developer section (§15) |
| `LICENSE.txt` | Restricted MIT — FFA members only; no external PRs |

## Running it (from source)

```bash
python3.11 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cd client && npm install && npm run build && cd ..
.venv/bin/translate            # production-like: serves prebuilt client
```

Dev mode: `.venv/bin/translate --no-browser` in one terminal,
`cd client && npm run dev` in another (Vite hot-reload on :5173,
proxies API calls to the Python server — see `client/vite.config.ts`).

## Tests and checks

```bash
.venv/bin/python -m pytest tests/server/ -v   # server suite
cd client && npm test                          # vitest suite
cd client && npm run build                     # tsc + vite build (type check)
```

Python dev extras include `ruff` and `mypy` (see `pyproject.toml`).

## Notes for agents

- **Source of truth for behavior:** the code + `README.md` §15. The
  `docs/superpowers/` plans describe the original design; treat them as
  history, not spec, when they conflict with current code.
- **Don't hand-edit `client/dist/`** — it's build output (regenerate via
  `npm run build`). Don't commit `release/` artifacts casually.
- **Runtime state is outside the repo** (`~/.translate/`). Tests use
  fixtures (`tests/server/fixtures/`, `conftest.py`), not the live dir.
- **License:** restricted MIT for FFA members; internal to GML Publishing
  LLC. External pull requests are not accepted (see `LICENSE.txt`,
  `README.md` §15 Contributing).
- No active development goal is set for this fork yet. When one is,
  record it here (or link the planning doc) so future sessions orient faster.
