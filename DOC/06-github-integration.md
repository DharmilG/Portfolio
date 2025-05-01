# 06 — GitHub Integration (Detailed)

> All GitHub calls server-side only (Route Handlers + cron). Browser never calls `api.github.com`.
> Depends on `04-data-model.md`: `projects` allowlist + `github_cache` table.

## 1. Auth (one PAT, zero visitor auth)

- Create fine-grained PAT: read-only, `Contents:read, Metadata:read`, selected repos = your portfolio repos only. Expiry 1yr + reminder.
- Env: `GITHUB_PAT` (Vercel server-only, never `NEXT_PUBLIC_`).
- Octokit server init:
```ts
// lib/github.ts
import { Octokit } from "@octokit/rest";
export const octokit = new Octokit({ auth: process.env.GITHUB_PAT });
```
- Quota: unauth 60 req/hr/IP (unusable), PAT 5000 req/hr/user, secondary max 100 concurrent / 900 points/min. Our design uses ~`N_repos * 3 req / 48h` via cache, so 10 repos = ~30 req/2days.

## 2. Request flow (cache-first, 48h TTL)

```
GET /api/repo/tree?owner=X&repo=Y
  1. Allowlist: select 1 from projects where repo_owner=X and repo_name=Y and visible=true else 404
  2. Redis GET repo:X/Y:tree:<branch> -> HIT return
  3. Supabase github_cache where repo_full_name='x/y' and expires_at > now() -> HIT return + warm Redis
  4. GitHub with If-None-Match: etag -> 304 ? bump expires_at, return stale : fetch, filter, write Redis (EX 172800) + upsert github_cache, return
  5. On 403/429 -> return stale + header x-cache: STALE
```

Same flow for `meta` (TTL 48h) and `blob:<sha>` (TTL 24h, immutable).

## 3. Tree — entire repo in 1 request

```ts
// 1 req gets all paths+SHAs
const { data } = await octokit.git.getTree({
  owner, repo,
  tree_sha: branch, // try 'main', fallback 'master' on 404
  recursive: "1",
});
// data.tree: [{path, mode, type: 'blob'|'tree', sha, size}]
```

Rules:
- Branch resolve: `GET /repos/{o}/{r}` -> `default_branch`, fallback `main` -> `master`. Store in `github_cache.branch`.
- Cap: truncate at 5000 entries, set `truncated:true`.
- Filter (at sync time, before cache write): drop `^(.git/|node_modules/|dist/|build/|.next/|coverage/)`.
- Sort: dirs first, then alpha. Keep `size` for Explorer tooltip.
- Persist: `github_cache {branch, sha: data.sha, tree, fetched_at, expires_at}`.

## 4. Blob — file content lazy, on-demand only

```ts
const { data } = await octokit.git.getBlob({ owner, repo, file_sha: sha });
// data.content base64, data.size, encoding
const text = Buffer.from(data.content, 'base64').toString('utf8');
```

Rules:
- Never bulk-fetch all files (Vercel 10s timeout + quota burn). Fetch when user opens tab.
- Cap: reject if `size > 512*1024` -> return `{truncated:true, preview:'File too large for preview'}`.
- Binary blocklist by ext: `png jpg jpeg gif webp ico mp4 mp3 zip tar gz woff2 ttf pdf exe`. Return `{binary:true}` -> Editor shows download/Open raw link instead.
- Decode: base64 -> utf8, strip BOM. Detect language from ext for Shiki.
- Alternative allowed: `GET /repos/{o}/{r}/contents/{path}?ref={sha}` for small text (<1MB), same cap applies.
- Cache key `blob:<sha>` Redis EX 86400 (immutable, safe long TTL).

README auto-pick: on folder expand, if tree contains `README.md|readme.md` case-insensitive at root, prefetch its blob + open by default.

## 5. Meta + languages (Explorer badge + header)

```ts
const [{data: repo}, {data: langs}] = await Promise.all([
  octokit.repos.get({ owner, repo }),
  octokit.repos.listLanguages({ owner, repo }),
]);
// repo: stargazers_count, forks_count, description, language, updated_at, default_branch
// langs: {TypeScript: 12345, ...}
```

Merge into `github_cache.metadata`:
```json
{"stars":12,"forks":2,"open_issues":0,"language":"TypeScript","description":"...","default_branch":"main","updated_at":"2026-10-14T00:00:00Z","languages":{"TypeScript":9000,"CSS":500}}
```
Header UI: stars/forks + language bar (top 3 langs %). Updated via cron, not per visitor.

## 6. Commits / history (real, paginated on-demand)

> Real GitHub history per project. Never bulk-fetch 500/1000. Page through 10-20 at a time.

```ts
const { data } = await octokit.repos.listCommits({
  owner, repo,
  sha: branch, // github_cache.branch
  per_page: 10, // clamp 1..20
  page, // 1-based, from UI "View more"
});
// data[]: {sha, commit:{message, author:{name,date}}, html_url}
```

Rules:
- Default `per_page=10, page=1`. UI shows page 1 merged as `[...localCommits, ...realPage1]`. `View more` fetches `page+1` only.
- Cache per page: Redis `commits:o/r:branch:page:per_page` EX 86400. No `github_cache` row bloat.
- HEAD check: nightly cron compares `HEAD sha vs github_cache.sha`. If changed -> `DEL commits:o/r:*` (invalidate page 1+) + re-sync tree+meta. Else keep serving cache, zero quota.
- Empty/shallow repos: `409 empty` -> show `No commits yet`. Private/archived -> 404 passthrough as empty state.
- Cost: 1 req / page / repo / day. 10 repos x 2 pages = ~20 req/day.

## 7. Perf / UX (fast feel)

1. Cron `GET /api/cron/sync` nightly warms `tree+meta+README` for all `visible` repos -> visitor cold HIT.
2. Explorer expand: instant from cache, skeleton rows while revalidating.
3. Editor open: show Shiki skeleton + stream text, prefetch sibling files (parent dir, max 5).
4. ETag: store `etag` from `GET repos` response, send `If-None-Match` next sync. `304` costs ~0 quota, just bump `expires_at`.
5. Timeouts: Octokit `request.timeout 8000`, proxy `curl` cap 20KB.
6. Tarball rejected: `GET /tarball/{sha}` in 1 req sounds ideal but unzip on serverless = slow TTFB + memory blow. Use tree+lazy blob.

## 8. File mapping (VS Code path <-> GitHub)

| VS Code Explorer | GitHub |
|---|---|
| `Projects/<title_override\|repo_name>/` | repo root `sha=github_cache.sha` |
| `Projects/<name>/src/app/page.tsx` | `src/app/page.tsx` blob `sha` from tree |
| `Projects/<name>/README.md` (default open) | root README blob |
| Breadcrumb + `openTab(path, sha)` | `GET /api/repo/blob?owner&repo&sha&path` |

Rename: DB `title_override` changes folder for everyone. UI `uiRenames` (localStorage) overrides locally only, no API call.

## 9. Errors

- `404 allowlist` -> `{"error":"repo not allowlisted"}` (never hit GitHub).
- `404 branch` -> try `master`, else `{"error":"branch not found"}`.
- `403 rate-limit` -> serve stale cache + `Retry-After` from `x-ratelimit-reset`.
- `422 empty repo` -> show `No files` empty state.

## 10. Local overlay (edits + fake git, client-only)

> Tree/blob/meta above are immutable server snapshots. Edits never write through to GitHub/Supabase/Redis.

- View: `displayContent = localEdits[path] ?? blob.content`. `sha/etag` unchanged.
- Dirty detection: `localEdits[path] !== cached` -> Explorer `M` badge + tab `●` + StatusBar `main*`.
- Pseudo-commit: `localCommits.push({id, msg, files: dirtyPaths, time})`, clears dirty, draws new dot on `main` lane in Source Control. Flagged `local:true`, label `not pushed`.
- Real commits (§6) stay read-only underneath. Merge order: `[...localCommits, ...realCommits]`.
