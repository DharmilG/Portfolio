// lib/github-blob.ts — cached text blob reads for README previews.
// Blob SHAs are immutable, so successful README fetches can live in Next's data
// cache indefinitely and be dropped by tag revalidation when snapshots refresh.
import { unstable_cache } from "next/cache";
import { getOctokit } from "@/lib/github";
import { MAX_BLOB_BYTES } from "@/lib/vfs";

export type GithubBlob = {
  content: string;
  size: number;
};

export class BlobTooLargeError extends Error {
  constructor() {
    super("file too large");
    this.name = "BlobTooLargeError";
  }
}

async function fetchGithubBlob(
  owner: string,
  repo: string,
  sha: string,
): Promise<GithubBlob> {
  const { data } = await getOctokit().git.getBlob({
    owner,
    repo,
    file_sha: sha,
  });
  const size = data.size ?? 0;
  if (size > MAX_BLOB_BYTES) throw new BlobTooLargeError();
  const content = Buffer.from(data.content, "base64")
    .toString("utf8")
    .replace(/^\uFEFF/, "");
  return { content, size };
}

export function getGithubBlob(
  owner: string,
  repo: string,
  sha: string,
  path: string,
  isReadme: boolean,
): Promise<GithubBlob> {
  if (!isReadme) return fetchGithubBlob(owner, repo, sha);

  // Recreate the cache wrapper per SHA so tags can include the exact blob and
  // owning repo. The key parts keep the cache entry stable across requests.
  const cachedFetch = unstable_cache(
    () => fetchGithubBlob(owner, repo, sha),
    ["github-readme-blob", owner, repo, sha, path],
    {
      tags: ["github-cache", `repo:${owner}/${repo}`, `readme:${sha}`],
      revalidate: false,
    },
  );
  return cachedFetch();
}
