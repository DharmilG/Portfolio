# Rule 03 — Local-only edits (inviolable)

1. Visitor file edits and pseudo-commits NEVER leave the browser:
   `localEdits` / `localCommits` / `uiRenames` / `tmpFs` live in zustand +
   localStorage (`vscode-local-v1`) only.
2. Display rule everywhere: `view = localEdits[path] ?? cached`.
3. `github_cache`, Redis, and Supabase tables stay pristine server snapshots;
   no API route accepts edits. No `POST /api/commits` exists by design.
4. Terminal `push/pull` answer read-only (joke + no-op), never attempt network.

Good: `Ctrl+S` writes zustand; commit button unshifts a `local:true` entry.
Bad: any fetch/POST carrying edited content; polluting `github_cache` with local text.
