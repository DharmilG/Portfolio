# Agent State — Portfolio VS Code

This folder lets any agent session resume this project exactly where work
stopped. Start here, in this order:

1. `tasks.json` → read `session` (branch, tip, unpushed, `next_up`,
   `pending_verifications`), then the task list. `tip` is the last
   non-tracker commit; HEAD must be the tracker-sync commit on top of it
   (see TRACKER_GUIDE.md). Reconcile forward from `tip` before touching code.
2. `TRACKER_GUIDE.md` → how to read, update, and close tasks.
3. `rules/` (in numeric order) → **inviolable constraints**.
4. `skills/` → capabilities, loaded per task: `vscode-tokens`,
   `rounded-workbench`, `shiki-readonly`, `local-git`, `terminal-emu`.
5. `pending-frontend-work.md` → frontend-first build order (backend later).

## Rules vs skills (the split — never confuse them)

- **Rules** say what agents must/must-not do: one file per commit, never push
  (human pushes after testing), verify before every commit, local-only edits.
- **Skills** say how to build VS Code-parity UI (tokens, radii, readonly
  viewer, local git, terminal emulation). Skills never grant permissions.

## Session continuity contract

- Every code commit is one file. Every `tasks.json` update is its own
  `tracker:` commit on top (never bundled with code).
- `pushed` flips only on explicit human confirmation ("pushed till X").
- Unpushed local work is normal; pushing is exclusively human. No origin
  configured yet — everything is unpushed by definition.
- `archive/` holds superseded docs (history, not authority).
