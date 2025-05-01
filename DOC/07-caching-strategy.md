# 07 — Caching Strategy (free, detailed)

> Goal: ~30 GitHub req/2days for 10 repos (vs 1000s without). Visitors consume 0 quota. All free-tier.

## Layers + TTLs (locked)
1. **Next fetch cache + ISR (free):** `fetch(gh,{next:{revalidate:172800, tags:['repo:o/r']}})`. `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`.
2. **Upstash Redis (free 500k/mo, use ~5k):**
   - `repo:o/r:tree:branch` EX 172800 (48h)
   - `repo:o/r:meta` EX 172800 (48h)
   - `blob:<sha>` EX 86400 (24h, immutable)
   - `commits:o/r:branch:page:per_page` EX 86400 (24h, per-page)
   - `ratelimit:proxy:{ip}` sliding 30/min
3. **Supabase `github_cache` (persistent):** `{branch, sha (HEAD), metadata, tree, etag, fetched_at, expires_at = fetched+48h}`. Commits NOT stored here (Redis-only, lean table).

## Flow (all repo routes)
```
allowlist? 404 : Redis HIT? return (x-cache:HIT)
-> github_cache fresh (expires_at>now)? return + warm Redis (HIT)
-> GitHub + If-None-Match:etag -> 304? bump expires_at, return stale (0 quota)
-> 200? filter (node_modules/dist/.git/.next), cap tree 5000, SETEX + upsert, revalidateTag, return MISS
-> 403/429|5xx? return stale + x-cache:STALE + Retry-After
```

## Local overlay (never cached server-side)
`display = localEdits[path] ?? cached`. Dirty diff client-only. `github_cache/Redis` stay pristine. Commit just moves `edits -> localCommits` in browser.

## Invalidation
- Cron `0 2 * * *` `GET /api/cron/sync` (Bearer): for each `visible` repo -> `getTree+getRepo+langs+README+commits p1` -> upsert + `SETEX` + `revalidateTag('repo:o/r')` + `update projects.last_synced_at`. If `HEAD sha` changed -> `DEL commits:o/r:*`.
- Manual: dashboard edit -> hit `POST /api/revalidate?repo=o/r` (`x-secret`) or wait ≤48h.
- Client dedupe: 30s SWR for tree/blob/commits p1.

## Cost control
- REST only (<20 repos). GraphQL only if >20. No tarball (serverless unzip blow). Blob 512KB cap, binary blocklist, proxy 20KB/8s.
- Math: 10 repos * (1 tree + 1 meta + 1 commits p1 + ~2 blobs warmed) / 2 days ≈ 50 req/2days << 5000/hr. Redis ≈ 50 writes + ~2000 reads/mo << 500k.
