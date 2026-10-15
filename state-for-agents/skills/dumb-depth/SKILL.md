# Skill: dumb-depth (smart edge, dumb core)

Product decisions live close to the app (routes, screens); code gets dumber
with depth. Deep code is pure mechanics: no I/O, no secrets, no framework
imports. Only boundary adapters (`db`, `github`, `cache`, `allowlist`) touch
the outside world. Import direction is one-way: `lib/*` never imports
`app/*` or `components/*`; components never call outside services directly.

Good: route handler calls `assertAllowlisted()` once at the top, then pure
`RepoQuery.parse()` + `resolveContent()`; `parse(input, ctx)` with all
terminal state passed in, zero fetch inside.
Bad: `fetch(api.github.com)` inside a component; `process.env.GITHUB_PAT`
outside `lib/github.ts`; a helper importing a component for formatting.

Check: `grep -r "GITHUB_PAT\|SUPABASE_SERVICE" components lib/validators
lib/localGit lib/vfs` is empty; `tsc --noEmit` clean.
