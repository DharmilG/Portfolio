# Rule 01 — Commit discipline (inviolable)

1. One file per commit. `git add <exact-path>` — never `git add -A` / `.`.
2. Scoped messages: `feat:` code, `style:` CSS/tokens, `db:` migrations,
   `chore:` config, `docs:` DOC, `tracker:` tasks.json only.
3. NEVER push. No origin is configured; the human pushes after testing.
   `pushed` in tasks.json flips only on explicit human confirmation.
4. `tasks.json` updates are always their own `tracker:` commit, never bundled.

Good: `git add lib/store.ts` + `git commit -m "feat: add zustand store"`.
Bad: `git add .` / committing 3 files "together" / pushing to any remote.
