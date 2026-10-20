# 03 — Architecture (Detailed)

> Implements `01/02` with `04-10`. Single PAT, public reads, local-only writes.

## Stack
Next.js 16 / React 19 / TS / Tailwind 4 (`@theme`) / Zustand / Shiki / `@xterm/xterm` / Octokit / Upstash Redis / Supabase / Vercel. Nodejs runtime for routes (Buffer + Octokit).

## High-level flow
```
Client (Zustand: explorer, editorTabs{kind:code|markdown|browser}, terminalSessions,
        localEdits, localCommits, uiRenames, tmpFs, preview, theme)
  -> GET /api/projects|tree|blob|commits (public, allowlist, x-cache HIT/MISS/STALE)
  -> Supabase (sections, projects, profiles, site_settings, github_cache persistent)
  -> GitHub REST via Octokit + PAT (tree recursive=1, blob, repo+langs, commits page)
  -> Upstash Redis hot (tree/meta 48h, blob/commits-page 24h) + ETag 304
  -> Cron GET /api/cron/sync (Bearer CRON_SECRET) warms all visible, DEL commits:* on HEAD change
Local writes NEVER leave browser: view = localEdits[path] ?? cached. No POST for edits/commits.
```

## App structure
```
app/(portfolio)/[[...file]]/page.tsx   # shell + deep-link /Projects/repo/path
app/globals.css                        # @import tailwind + @theme tokens (05 §2)
app/api/projects/route.ts              # visible join cache
app/api/repo/tree/route.ts             # allowlist -> Redis -> Supabase -> GitHub
app/api/repo/blob/route.ts             # sha verify -> Redis -> getBlob, 512KB/binary guards
app/api/commits/route.ts               # per_page/page, Redis per-page, allowlist
app/api/proxy/route.ts                 # terminal curl, 20KB/8s/30-per-min
app/api/cron/sync/route.ts             # nightly warm + HEAD DEL
app/api/revalidate/route.ts            # x-secret, revalidateTag repo:o/r
components/vscode/{TitleBar,ActivityBar,Explorer,Tabs,FileViewer,StatusBar,CommandPalette,
  SourceControl,TerminalPanel,MarkdownPreview,BrowserPreview}
lib/{db.ts (anon+admin), github.ts (octokit), cache.ts (redis+tags), allowlist.ts,
  validators.ts (zod), localGit.ts (LocalEdit/LocalCommit types), terminal/parser.ts, store.ts, vfs.ts}
```

## Hybrid content rule
- UI-only (code): shell, tokens, keybinds, terminal grammar, branch SVG.
- DB-controlled: sections, projects (`owner/name`, `title_override`, `preview_url/embeddable`, `orders/visible/featured`), profiles, skills/experiences/socials, settings.
- GitHub-live (cached): tree, blob, meta+langs, real commits page.
- Local-only (browser): `localEdits, localCommits, uiRenames, tmpFs, term history` (localStorage `vscode-local-v1`). `github_cache` never polluted.

## State (Zustand, no Redux)
```ts
explorer:{sections, projects, treeByRepo, loading}
editorTabs:{tabs:{id,path,sha,kind}[], activeId, openTab(), closeTab()}
local:{edits:Record<path,content>, commits:LocalCommit[], renames:Record<path,name>, tmpFs, commit(msg), discard(path?)}
terminal:{sessions:{id,hist,cwd}[], activeId}
preview:{url, history, reloadKey}
theme:{mode:'dark'|'light'}
```
Selectors: `isDirty(path)`, `displayContent(path) = edits[path] ?? cache`, `dirtyCount`, `viewCommits() = [...local, ...realPage]`.
