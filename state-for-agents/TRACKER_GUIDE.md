# Tracker Guide — Portfolio VS Code

## Reading
- `tasks.json#session`: `branch` (always `main`), `tip` (last non-tracker
  commit — HEAD should be exactly one `tracker:` commit above it),
  `unpushed` (every local SHA newest-first; all of them until human pushes),
  `next_up`, `pending_verifications`.
- `tasks[]`: `PV-*` ids. `status` in `done|in_progress|backlog`.
  `vscode_match: yes` means pixel-parity confirmed in browser.
  `pushed:false` until the human confirms a push.

## Closing a task (frontend-first order in pending-frontend-work.md)
1. Write the one file (empty placeholder → real implementation).
2. Verify: `npx tsc --noEmit` must pass; runtime check against local
   Supabase (`127.0.0.1:54321`) or `npm run dev` smoke for UI.
3. Commit the file alone: `git add <exact-path>` + scoped message
   (`feat:`, `style:`, `db:`, `chore:`). No push, ever.
4. Update `tasks.json`: task → `done` (+`finished`, `log` SHA,
   `key_decisions`, `verified:true`), refresh `summary` counts,
   append SHA to `session.unpushed`, set `session.next_up`.
5. Commit `tasks.json` alone as `tracker: close <ID> (<sha>)`.
6. `session.tip` always points at the newest **code** commit; the tracker
   commit sits on top. Resume = `git log tip..HEAD` must show only tracker
   commits, else reconcile.

## Validation (run before every tracker commit)
`node -e` check: JSON parses; ids unique; `summary` counts match the array;
every `done` has `log` + `verified:true`; `tip` is an ancestor of HEAD
(`git merge-base --is-ancestor <tip> HEAD`).

## Never
- Never push. Never bundle code + tracker in one commit.
- Never write server writes for local edits (rule 03-local-only).
- Never seed fake data (owner inserts real rows via Studio).
