// GET /api/cron/sync — nightly GitHub snapshot for every visible project
// (DOC/09 §6). Protected by CRON_SECRET; Vercel calls it on the schedule in
// vercel.json. It writes only server-side snapshots (github_cache + the
// project's last_synced_at) — never anything a visitor typed (rule 03).
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db";
import { getOctokit, githubStatus } from "@/lib/github";
import { readmeDescription } from "@/lib/readme";
import { filterTree, type GitTreeEntry } from "@/lib/vfs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// github_cache rows live 48h (DOC/09 §0).
const CACHE_TTL_HOURS = 48;

function isReadme(path: string): boolean {
  return /^readme(\.md)?$/i.test(path.split("/").pop() ?? "");
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "cron not configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const admin = getSupabaseAdmin();
  const { data: projects, error } = await admin
    .from("projects")
    .select("id,repo_owner,repo_name")
    .eq("visible", true);
  if (error || !projects) {
    return NextResponse.json(
      { error: "projects unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  const octokit = getOctokit();
  const synced: string[] = [];
  const failed: { repo: string; error: string }[] = [];

  for (const project of projects) {
    const owner = project.repo_owner;
    const repo = project.repo_name;
    const full = `${owner}/${repo}`;
    try {
      const repoInfo = await octokit.repos.get({ owner, repo });
      const branch = repoInfo.data.default_branch || "main";
      const languages = await octokit.repos.listLanguages({ owner, repo });

      // An empty repository (409) or a branch without files (404) is a valid
      // snapshot with an empty tree.
      let entries: GitTreeEntry[] = [];
      let treeSha: string | null = null;
      try {
        const tree = await octokit.git.getTree({
          owner,
          repo,
          tree_sha: branch,
          recursive: "1",
        });
        treeSha = tree.data.sha ?? null;
        entries = (tree.data.tree ?? [])
          .filter(
            (
              entry,
            ): entry is typeof entry & { path: string; sha: string } =>
              Boolean(entry.path && entry.sha) &&
              (entry.type === "blob" || entry.type === "tree"),
          )
          .map((entry) => ({
            path: entry.path,
            type: entry.type as "blob" | "tree",
            sha: entry.sha,
            ...(entry.size !== undefined ? { size: entry.size } : {}),
          }));
      } catch (cause) {
        const status = githubStatus(cause);
        if (status === 409) {
          // Empty repository — nothing to snapshot.
        } else if (status === 404) {
          // The branch may exist and simply hold no files.
          await octokit.repos.getBranch({ owner, repo, branch });
        } else {
          throw cause;
        }
      }
      const filtered = filterTree(entries);

      // The README is the description surface (DOC/05 §5).
      let readme: string | null = null;
      const readmeEntry = filtered.entries.find(
        (e) => e.type === "blob" && isReadme(e.path),
      );
      if (readmeEntry) {
        try {
          const blob = await octokit.git.getBlob({
            owner,
            repo,
            file_sha: readmeEntry.sha,
          });
          readme =
            readmeDescription(
              Buffer.from(blob.data.content, "base64").toString("utf8"),
            ) || null;
        } catch {
          // A missing README only costs the description.
        }
      }

      const metadata = {
        description: repoInfo.data.description ?? null,
        readme,
        stars: repoInfo.data.stargazers_count ?? 0,
        forks: repoInfo.data.forks_count ?? 0,
        language: repoInfo.data.language ?? null,
        languages: languages.data ?? {},
        // Tags come from the repository languages.
        tags: Object.keys(languages.data ?? {}),
        default_branch: branch,
        homepage: repoInfo.data.homepage ?? null,
        updated_at: repoInfo.data.updated_at ?? null,
      };

      const { error: upsertError } = await admin.from("github_cache").upsert(
        {
          repo_full_name: full,
          branch,
          sha: treeSha,
          metadata,
          tree: filtered.entries,
          etag: treeSha,
          fetched_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + CACHE_TTL_HOURS * 3600_000,
          ).toISOString(),
        },
        { onConflict: "repo_full_name" },
      );
      if (upsertError) throw new Error(upsertError.message);

      await admin
        .from("projects")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", project.id);
      synced.push(full);
    } catch (cause) {
      failed.push({
        repo: full,
        error: cause instanceof Error ? cause.message : "sync failed",
      });
    }
  }

  return NextResponse.json(
    { synced, failed, at: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
