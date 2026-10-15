# Skill: terminal-emu

`@xterm/xterm` is rendering only. All commands run through the pure function
`parse(input, ctx) → {output, effects}` (`lib/terminal/parser.ts`) where ctx
carries `{cwd, vfs, localEdits, localCommits, tmpFs}`. No pty (Vercel
serverless cannot hold one). `curl` is the sole network command and goes via
`GET /api/proxy` (20KB cap, 8s timeout, no private IPs).

Good: `status/diff/commit/log/branch/checkout` mutate the same zustand store
as Source Control; `push/pull` print the read-only joke.
Bad: `eval`, child processes, or direct `fetch(api.github.com)` from parser.
