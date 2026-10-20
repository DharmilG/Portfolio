// GET /api/repo/tree?owner=X&repo=Y&branch=main
// Allowlist first, then one recursive GitHub tree request (DOC/06 §3).
import { NextRequest, NextResponse } from "next/server";
import { assertAllowlisted } from "@/lib/allowlist";
import { getOctokit, githubStatus } from "@/lib/github";
import { filterTree, type GitTreeEntry } from "@/lib/vfs";
import { RepoQuery } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function error(status: number, message: string, stale = false) {
  return NextResponse.json(
    { error: message, ...(stale ? { stale } : {}) },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const parsed = RepoQuery.safeParse({
    owner: params.get("owner") ?? undefined,
    repo: params.get("repo") ?? undefined,
    branch: params.get("branch") || undefined,
  });
  if (!parsed.success) return error(400, "invalid owner/repo");

  const { owner, repo } = parsed.data;
  try {
    var project = await assertAllowlisted(owner, repo);
  } catch (cause) {
    const status = githubStatus(cause);
    return error(status === 404 ? 404 : 503, status === 404 ? "repo not allowlisted" : "project lookup failed");
  }

  const octokit = getOctokit();
  let branch = parsed.data.branch;
  try {
    if (!branch) {
      const repoInfo = await octokit.repos.get({ owner, repo });
      branch = repoInfo.data.default_branch || "main";
    }
  } catch (cause) {
    const status = githubStatus(cause);
    return error(status === 404 ? 404 : 502, status === 404 ? "repo not found" : "github unavailable");
  }

  async function readTree(ref: string) {
    return octokit.git.getTree({
      owner,
      repo,
      tree_sha: ref,
      recursive: "1",
    });
  }

  try {
    let result;
    try {
      result = await readTree(branch);
    } catch (cause) {
      // A requested branch should surface as 404; the default branch can fall
      // back to master for older repositories.
      if (githubStatus(cause) === 404 && !parsed.data.branch) {
        result = await readTree("master");
        branch = "master";
      } else {
        throw cause;
      }
    }

    const entries: GitTreeEntry[] = (result.data.tree ?? [])
      .filter(
        (entry): entry is typeof entry & { path: string; sha: string } =>
          Boolean(entry.path && entry.sha) &&
          (entry.type === "blob" || entry.type === "tree"),
      )
      .map((entry) => ({
        path: entry.path,
        type: entry.type as "blob" | "tree",
        sha: entry.sha,
        ...(entry.size !== undefined ? { size: entry.size } : {}),
      }));
    const filtered = filterTree(entries);

    return NextResponse.json(
      {
        full_name: `${project.repo_owner}/${project.repo_name}`,
        branch,
        sha: result.data.sha ?? null,
        tree: filtered.entries,
        truncated: Boolean(result.data.truncated) || filtered.truncated,
        fetched_at: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (cause) {
    const status = githubStatus(cause);
    if (status === 409) {
      // GitHub reports an empty repository as 409; the Explorer shows No files.
      return NextResponse.json(
        {
          full_name: `${project.repo_owner}/${project.repo_name}`,
          branch,
          sha: null,
          tree: [],
          truncated: false,
          fetched_at: new Date().toISOString(),
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (status === 404) return error(404, "branch not found");
    if (status === 403 || status === 429) {
      return error(429, "github rate limited", true);
    }
    return error(502, "github unavailable");
  }
}
