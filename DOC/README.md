# Portfolio VS Code — Docs Index

Stack: Next.js 16 (App Router, nodejs routes) + Tailwind 4 (`@theme`) + Supabase + Upstash Redis + Vercel.
Viewer: Shiki (not Monaco). Terminal: xterm UI + client parser. No custom admin (dashboard only).
Rule: `view = localEdits[path] ?? cached`. Visitors use 0 GitHub quota. 1 Supabase insert = 1 new project.

Status (all detailed, consistent):
- [x] 01-project-overview.md — rounded UI, local edit + fake git, free-tier, 1-row flow
- [x] 02-requirements.md — 15 functional, parity checklist, caps
- [x] 03-architecture.md — flow, structure, Zustand slices
- [x] 04-data-model.md — DDL + RLS + Storage + seeds + §8 local-only
- [x] 05-vscode-ui-spec.md — tokens, edit overlay, Source Control lane, preview splits
- [x] 06-github-integration.md — tree/blob/meta + §6 real paginated history + §10 overlay
- [x] 07-caching-strategy.md — 48h/24h TTLs, per-page commits, overlay, cost math
- [x] 08-admin-cms.md — 1-row SQL, mappings, RLS recap
- [x] 09-api-contracts.md — projects/tree/blob/commits/proxy/cron + §8 local contract
- [x] 10-terminal-preview.md — xterm + git-local + iframe + markdown
- [x] 11-deployment-roadmap.md — env, cron, steps, MVP/V1/V2

Conventions: `orders` sort, `visible` gate, `repo_owner/repo_name` source of truth, `github_cache` pristine snapshot, local state in `vscode-local-v1`.
