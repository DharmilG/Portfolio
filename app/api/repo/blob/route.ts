// GET /api/repo/blob?owner=X&repo=Y&sha=...&path=...
// Allowlist + one lazy GitHub blob request; text previews only (DOC/06 §4).
import { NextRequest, NextResponse } from "next/server";
import { assertAllowlisted } from "@/lib/allowlist";
import { getOctokit, githubStatus } from "@/lib/github";
import { langFor } from "@/lib/langs";
import { BlobQuery } from "@/lib/validators";
import { isBinaryPath, MAX_BLOB_BYTES } from "@/lib/vfs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function error(status: number, message: string, extra = {}) {
  return NextResponse.json(
    { error: message, ...extra },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const parsed = BlobQuery.safeParse({
    owner: params.get("owner") ?? undefined,
    repo: params.get("repo") ?? undefined,
    branch: params.get("branch") || undefined,
    sha: params.get("sha") ?? undefined,
    path: params.get("path") ?? undefined,
  });
  if (!parsed.success) return error(400, "invalid blob query");

  const { owner, repo, sha, path } = parsed.data;
  try {
    var project = await assertAllowlisted(owner, repo);
  } catch (cause) {
    const status = githubStatus(cause);
    return error(
      status === 404 ? 404 : 503,
      status === 404 ? "repo not allowlisted" : "project lookup failed",
    );
  }

  if (isBinaryPath(path)) {
    return error(415, "binary preview not supported", { binary: true });
  }

  try {
    const octokit = getOctokit();
    const { data } = await octokit.git.getBlob({
      owner,
      repo,
      file_sha: sha,
    });
    const size = data.size ?? 0;
    if (size > MAX_BLOB_BYTES) {
      return error(413, "file too large", { truncated: true });
    }
    const content = Buffer.from(data.content, "base64")
      .toString("utf8")
      .replace(/^\uFEFF/, "");
    return NextResponse.json(
      {
        full_name: `${project.repo_owner}/${project.repo_name}`,
        path,
        sha,
        content,
        language: langFor(path),
        size,
        truncated: false,
        binary: false,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (cause) {
    const status = githubStatus(cause);
    if (status === 404) return error(404, "file not found");
    if (status === 403 || status === 429) {
      return error(429, "github rate limited", { stale: true });
    }
    return error(502, "github unavailable");
  }
}
