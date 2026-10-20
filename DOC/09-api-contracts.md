# 09 — API Contracts (Detailed)

> App Router Route Handlers (`app/api/**/route.ts`). Server-only secrets. Public GET for portfolio, protected cron/revalidate.
> Depends on `04-data-model.md` + `06-github-integration.md`.

## 0. Conventions

- Runtime: `export const runtime = 'nodejs'` (Octokit + Buffer need Node, not Edge).
- Validation: `zod` query parsing, `owner/repo` regex `^[a-zA-Z0-9_.-]+$`, `sha` `^[a-f0-9]{40}$` or tree sha, `path` max 1024 chars, no `..`.
- Auth: `GITHUB_PAT`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` server-only. `NEXT_PUBLIC_` only Supabase URL + anon key.
- Caching: `fetch(..., {next:{revalidate:172800, tags:['repo:owner/name']}})` for GitHub, Redis EX 48h tree/meta, 24h blob/commits.
- Headers out: `x-cache: HIT|MISS|STALE`, `x-ratelimit-remaining`, `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`.
- Errors always: `{error:string, stale?:boolean, retryAfter?:number}`.

```ts
// lib/validators.ts
import { z } from "zod";
export const RepoQuery = z.object({
  owner: z.string().regex(/^[a-zA-Z0-9_.-]+$/),
  repo: z.string().regex(/^[a-zA-Z0-9_.-]+$/),
  branch: z.string().regex(/^[a-zA-Z0-9_.\/-]+$/).optional(),
});
```

Allowlist helper (every repo route runs first):
```ts
// lib/allowlist.ts
export async function assertAllowlisted(owner:string, repo:string) {
  const { data } = await supabaseAdmin.from('projects')
    .select('id, title_override, preview_url').eq('repo_owner',owner).eq('repo_name',repo).eq('visible',true).single();
  if(!data) throw Object.assign(new Error('repo not allowlisted'),{status:404});
  return data;
}
```

## 1. GET /api/projects

Public list for Explorer + cards. No GitHub call on hot path (joins cache).

Query: `?featured=true` optional, `?limit=50` default 50.

```ts
// join in handler: projects visible + github_cache.metadata
type ProjectOut = {
  id:string; full_name:string; // "owner/name" lower
  title:string; // title_override ?? repo_name
  description:string|null; // description_override ?? metadata.description
  stars:number; forks:number; language:string|null; languages:Record<string,number>;
  preview_url:string|null; preview_embeddable:boolean;
  tags:string[]; featured:boolean; orders:number;
  updated_at:string|null; sha:string|null; branch:string;
};
```

SQL:
```sql
select p.*, c.metadata, c.sha, c.branch from projects p
left join github_cache c on c.repo_full_name = lower(p.repo_owner||'/'||p.repo_name)
where p.visible=true order by p.orders;
```

Response `200 {projects: ProjectOut[]}`. `x-cache: HIT` if all `expires_at` fresh.

## 2. GET /api/repo/tree?owner=X&repo=Y&branch=main

```ts
type TreeEntry = { path:string; type:'blob'|'tree'; sha:string; size?:number };
type TreeOut = { full_name:string; branch:string; sha:string; tree:TreeEntry[]; truncated:boolean; fetched_at:string };
```

Steps:
1. `RepoQuery` parse + `assertAllowlisted`.
2. `github_cache` snapshot first: a fresh row (48h) for the same branch is a
   `HIT` (`x-cache: HIT`, `public, s-maxage=3600, stale-while-revalidate=86400`).
   A different branch misses and falls through to GitHub (`x-cache: MISS`).
3. `branch ?? github_cache.branch ?? 'main'`. Try `getTree(branch, recursive:1)`,
   on 404 retry `master`. A default branch that exists but holds no files also
   answers 404 — confirm with `repos.getBranch` and return an empty tree.
4. Redis `GET repo:o/r:tree:branch` -> HIT.
5. Else Octokit `git.getTree` with `If-None-Match: etag`. `304` -> bump `expires_at`, return stale. `200` -> filter `node_modules/dist/.git/.next/build/coverage`, cap 5000, `SETEX 172800`, upsert github_cache {tree, sha, etag, fetched_at, expires_at}.

Errors: `404 not-allowlisted | branch not found`, `422 empty repo`, `429 + stale`.

## 2b. GET /api/repo/branches?owner=X&repo=Y

```ts
type BranchOut = { full_name:string; default_branch:string; description:string|null; branches:{name:string;sha:string}[]; truncated:boolean; fetched_at:string };
```

Steps:
1. `RepoQuery` parse + `assertAllowlisted`.
2. `repos.get` (default branch + repository description) and
   `repos.listBranches` (per_page 100, one extra page when the first is full).
3. The status-bar branch picker calls this the first time a project is picked;
   the browser caches the answer for the session (2 GitHub requests).

## 3. GET /api/repo/blob?owner=X&repo=Y&sha=...&path=...

```ts
type BlobOut = { full_name:string; path:string; sha:string; content:string; language:string; size:number; truncated:boolean; binary:boolean };
```

Steps:
1. Validate `sha` + `assertAllowlisted` + verify the SHA exists in the cached
   tree of that repository (prevents arbitrary SHA mining). A snapshot of
   another branch is not a match — the request stays allowed there.
2. Redis `GET blob:<sha>` -> HIT.
3. Else `git.getBlob({owner,repo,file_sha:sha})`. If `size>524288` -> `413 {error:'too large', truncated:true}` + preview message, no content.
4. Binary ext blocklist `png|jpg|jpeg|gif|webp|ico|mp4|mp3|zip|gz|woff2|ttf|pdf|exe` -> `415 {binary:true, content:''}`.
5. `Buffer.from(content,'base64').toString('utf8')`, strip `\uFEFF`, `SETEX 86400` (immutable), language from `path` ext map for Shiki.

## 4. GET /api/commits?owner=X&repo=Y&branch=main&per_page=16&page=1

Real history, paginated. Cached per page 24h.

```ts
import { z } from "zod";
export const CommitsQuery = RepoQuery.extend({
  per_page: z.coerce.number().min(1).max(32).default(16),
  page: z.coerce.number().min(1).max(20).default(1),
});
type RealCommit = { sha:string; message:string; author:string; date:string; url:string; parents:string[] };
type CommitsOut = { full_name:string; branch:string; page:number; per_page:number; commits:RealCommit[]; hasMore:boolean };
```

Steps:
1. `CommitsQuery` parse + `assertAllowlisted` (no bypass).
2. Branch from the query, else the repository's default branch.
3. `octokit.repos.listCommits({owner, repo, sha:branch, per_page, page})`.
   `parents[]` rides along so Source Control can draw its inline graph rail.
4. `hasMore` = GitHub's `Link` header carries `rel="next"` (fallback: the page
   came back full). `SETEX 86400`, return. On `409/404 empty` ->
   `{commits:[], hasMore:false}`.
5. HEAD invalidation: `sync` DELs `commits:o/r:*` when `sha` changes.

## 5. GET /api/proxy?url=https://...

Terminal `curl` backend to bypass CORS.

- Validate `url` starts `https://` (allow `http://` only for `localhost` blocked — deny private IPs `127./10./192.168.`).
- `fetch(url,{signal:AbortSignal.timeout(8000)})`, allow `content-type: text/*|json|markdown` only, cap read `20*1024` chars, strip control chars.
- Rate-limit Upstash sliding window `30/min/IP`: `RATELIMIT proxy:{ip}` else `429 {error:'slow down'}`.
- Response `{url, status, content:string, truncated:boolean}`.

## 6. Cron + revalidate (protected)

```
GET /api/cron/sync  Header Authorization: Bearer $CRON_SECRET
POST /api/revalidate?repo=owner/name  Header x-secret: $REVALIDATE_SECRET
```

`sync`:
```ts
const {data: list} = await supabaseAdmin.from('projects').select('repo_owner,repo_name').eq('visible',true);
for (const r of list) { await syncRepo(r); revalidateTag(`repo:${r.repo_owner}/${r.repo_name}`); }
// syncRepo: getRepo + listLanguages + getTree + README blob -> upsert github_cache
//           {branch, sha, metadata{description,readme,tags,stars,languages}, tree, etag,
//            fetched_at, expires_at(+48h)} + update projects.last_synced_at
```
Empty repositories (409) and branches without files (404) snapshot as an empty
tree — they are not failures. The response is `{synced:[...], failed:[...], at}`.

`revalidate` marks the tag `repo:<owner>/<name>` stale
(`revalidateTag(tag, "max")` — Next 16 wants the two-argument form).

`vercel.json`: `{ "crons": [{ "path":"/api/cron/sync","schedule":"0 2 * * *"}] }`.

## 7. Error table

| Status | Code | When | Body |
|---|---|---|---|
| 400 | invalid-query | zod fail | `{error:'invalid owner/repo'}` |
| 404 | not-allowlisted | not in projects visible | `{error:'repo not allowlisted'}` |
| 404 | branch-missing | main+master 404 | `{error:'branch not found'}` |
| 413 | too-large | blob >512KB | `{error:'file too large', truncated:true}` |
| 415 | binary | image/zip/font | `{error:'binary preview not supported', binary:true}` |
| 429 | rate-limit | GitHub 403/429 or proxy limit | `{error:'rate limited', stale:true, retryAfter:60}` + stale tree if have |
| 502 | github-down | 5xx/timeout | `{error:'github unavailable', stale:true}` |

Frontend: on `stale:true` show banner `Showing cached snapshot` + keep navigation working.

## 8. Local commit contract (client-only, no new routes)

> No `POST /api/commits`. Local edits/commits never hit API. All in Zustand + localStorage.

```ts
// lib/localGit.ts (client only)
type LocalEdit = { path:string; content:string; savedAt:string };
type LocalCommit = { id:`local-${number}`; msg:string; files:string[]; time:string; local:true };
type RealCommit = { sha:string; message:string; author:string; date:string; url:string; local?:false };
// Source Control renders: [...localCommits, ...realCommits from GET /api/commits]
```

- `Ctrl+S` in FileViewer -> `localEdits[path]=content` (no fetch). `Discard` -> delete key, revert to cached blob.
- Commit button (Source Control input + terminal `commit -m`) -> `localCommits.unshift({id, msg, files: Object.keys(localEdits)})`, then clear `localEdits` for those files (now `committed`, not `dirty`).
- Tree/blob allowlist + validation unchanged. `sha` verification uses server tree only; local content displayed via `localEdits[path] ?? blob.content`.
- Quota impact: zero. No revalidate, no Redis write.
