// GET /api/commits?owner=X&repo=Y&branch=main&per_page=16&page=1
// Allowlist first, then one paginated GitHub history read. `parents[]` rides
// along so Source Control can draw its inline graph rail without a second
// request; `hasMore` comes from GitHub's Link header (DOC/09 §4).
import { NextRequest, NextResponse } from "next/server";
import { assertAllowlisted } from "@/lib/allowlist";
import { getOctokit, githubStatus } from "@/lib/github";
import { CommitsQuery } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function error(status: number, message: string, stale = false) {
  return NextResponse.json(
    { error: message, ...(stale ? { stale } : {}) },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

// GitHub paginates with `Link: <...>; rel="next"`. Without the header (or on
// a truncated page) fall back to "the page came back full".
function hasNextPage(link: string | undefined, count: number, perPage: number) {
  if (link) return /rel="next"/.test(link);
  return count === perPage;
}

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const parsed = CommitsQuery.safeParse({
    owner: params.get("owner") ?? undefined,
    repo: params.get("repo") ?? undefined,
    branch: params.get("branch") || undefined,
    per_page: params.get("per_page") ?? undefined,
    page: params.get("page") ?? undefined,
  });
  if (!parsed.success) return error(400, "invalid commit query");

  const { owner, repo, per_page, page } = parsed.data;
  try {
    var project = await assertAllowlisted(owner, repo);
  } catch (cause) {
    const status = githubStatus(cause);
    return error(
      status === 404 ? 404 : 503,
      status === 404 ? "repo not allowlisted" : "project lookup failed",
    );
  }

  const octokit = getOctokit();
  try {
    // The client always sends a branch (the status-bar picker knows it);
    // without one, ask GitHub for the repository's default branch.
    let branch = parsed.data.branch;
    if (!branch) {
      const repoInfo = await octokit.repos.get({ owner, repo });
      branch = repoInfo.data.default_branch || "main";
    }

    const response = await octokit.repos.listCommits({
      owner,
      repo,
      sha: branch,
      per_page,
      page,
    });

    const commits = response.data.map((c) => ({
      sha: c.sha,
      message: c.commit.message,
      author:
        c.commit.author?.name ?? c.author?.login ?? c.commit.committer?.name ?? "unknown",
      date:
        c.commit.author?.date ??
        c.commit.committer?.date ??
        new Date().toISOString(),
      url: c.html_url,
      parents: (c.parents ?? []).map((p) => p.sha),
    }));

    return NextResponse.json(
      {
        full_name: `${project.repo_owner}/${project.repo_name}`,
        branch,
        page,
        per_page,
        commits,
        hasMore: hasNextPage(response.headers.link, commits.length, per_page),
        fetched_at: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (cause) {
    const status = githubStatus(cause);
    // 409 = empty repository (GitHub's answer for a repo without commits).
    if (status === 409) {
      return NextResponse.json(
        {
          full_name: `${project.repo_owner}/${project.repo_name}`,
          branch: parsed.data.branch ?? "main",
          page,
          per_page,
          commits: [],
          hasMore: false,
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
