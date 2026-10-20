// GET /api/repo/branches?owner=X&repo=Y
// Allowlist first, then two GitHub reads: the repository's default branch and
// the branch list with head SHAs. The status-bar branch picker calls this the
// first time a project is picked (DOC/09 §2b).
import { NextRequest, NextResponse } from "next/server";
import { assertAllowlisted } from "@/lib/allowlist";
import { getOctokit, githubStatus } from "@/lib/github";
import { RepoQuery } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Branch lists are small in practice; the cap keeps one request from
// fanning out over a fork-heavy repository.
const PER_PAGE = 100;

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
    branch: undefined,
  });
  if (!parsed.success) return error(400, "invalid owner/repo");

  const { owner, repo } = parsed.data;
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
    const [repoInfo, branches] = await Promise.all([
      octokit.repos.get({ owner, repo }),
      octokit.repos.listBranches({ owner, repo, per_page: PER_PAGE }),
    ]);

    // One extra page when the first one came back full.
    let all = branches.data;
    if (all.length === PER_PAGE) {
      const next = await octokit.repos.listBranches({
        owner,
        repo,
        per_page: PER_PAGE,
        page: 2,
      });
      all = [...all, ...next.data];
    }

    return NextResponse.json(
      {
        full_name: `${project.repo_owner}/${project.repo_name}`,
        default_branch: repoInfo.data.default_branch || "main",
        branches: all.map((b) => ({ name: b.name, sha: b.commit.sha })),
        truncated: all.length >= PER_PAGE * 2,
        fetched_at: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (cause) {
    const status = githubStatus(cause);
    if (status === 404) return error(404, "repo not found");
    if (status === 403 || status === 429) {
      return error(429, "github rate limited", true);
    }
    return error(502, "github unavailable");
  }
}
