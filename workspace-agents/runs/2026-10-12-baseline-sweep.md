# 2026-10-12 — Baseline sweep + workspace setup

First session on the fork. Cloned `blossomz37/translate-bouncer-cs`,
oriented, swept for safety/freshness, and set up the dev baseline.

## Did

- Wrote `AGENTS.md` (orientation) and `CHANGELOG.md` (Keep a Changelog;
  `[0.1.0]` = inherited upstream baseline dated 2026-05-21).
- Safety sweep: secret scan over repo + 96 commits (clean — only
  `sk-or-test` / `sk-or-x` placeholders); read hotspots (slug, paths,
  file picker, launchers, bind address).
- Fresh installs: Python pulls latest (FastAPI 0.143, Starlette 1.7,
  pytest 9.1…); `npm ci` works from the committed lockfile.
- Fixed 1 server test broken by Starlette 1.x (`app.routes` now holds
  nested `_IncludedRouter`; test uses `url_path_for` instead).
- Fixed 22 ruff-F findings (20 unused imports autofixed, 2 manual) and
  6 mypy findings in tests; added `[tool.ruff]` (F-only) + `[tool.mypy]`.
- Generated `requirements.lock` from a pristine venv (107/107 pytest
  green in that env; constraints dry-run resolves to exact pins).
- Added `.github/workflows/ci.yml` (server: pytest+ruff+mypy on
  Python 3.11; client: vitest+build on Node 22). YAML validated;
  not yet observed running on GitHub.
- Moved `docs/superpowers/` → `workspace-agents/superpowers/`
  (owner decision; lanes documented in AGENTS.md).

## Results

- Server: 107/107 pytest green on latest deps. `pip-audit` clean for
  runtime deps (2 setuptools findings resolved by upgrading to 84.x).
- Client: 95/95 vitest green, `npm run build` passes. `npm audit`:
  22 findings, all fixable; all dev/build/test-only except moderate
  react-router-dom open-redirects (negligible for a localhost app).

## Decisions

- Lock via pip constraints (`requirements.lock`), not uv — keeps one
  installer (pip) across dev, README, launchers, and CI.
- Ruff gate is F-only; E501/UP/I + `ruff format` deferred to an
  explicit normalization commit (inherited code was never formatted).
- No dependency upgrades: current pins work and are tested.

## Update — first launch verified (same day)

- Started `.venv/bin/translate --port 5180` via a one-shot smoke script:
  `/health` → 200 `{"status":"ok"}`, `/` → 200 serving the app UI.
  Server stopped cleanly afterward.
- Agent sandbox blocks socket binds, so the smoke ran unsandboxed
  under a one-time owner approval. Not an app issue.
- Smoke left a stale `~/.translate/.lock` (dead PID); the lock is
  designed to be taken over silently, so the next launch is unaffected.
- Owner confirmed successful launch in their own terminal and took the
  first screenshots into `docs/assets/`.
- Added local-only `.vscode/tasks.json` (Launch App / Close App);
  `.vscode/` is gitignored by design.

## Open (not done)

- Safe `npm audit fix` pass + deliberate major upgrades (React 19,
  Vite 8, Tailwind 4, Vitest 5, TS 7).
- One-line slug guard on read endpoints (negligible risk as-is).
- Ruff format normalization commit.
- Backlog home: GitHub Issues recommended, owner to confirm.
- `docs/assets/` screenshots once the app is running.
- Dev direction scoping — the actual next step.
