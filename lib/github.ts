// lib/github.ts — server-only GitHub client.
// The browser never calls api.github.com; Route Handlers use this PAT client.
// Keep the token in GITHUB_PAT (fine-grained: Contents + Metadata read).
import { Octokit } from "@octokit/rest";

let client: Octokit | null = null;

export function getOctokit(): Octokit {
  const token = process.env.GITHUB_PAT;
  if (!token) {
    throw Object.assign(new Error("GITHUB_PAT is not configured"), {
      status: 503,
    });
  }
  client ??= new Octokit({
    auth: token,
    request: { timeout: 8000 },
  });
  return client;
}

// GitHub/Octokit errors carry a numeric `status`; normalize for Route Handlers.
export function githubStatus(error: unknown): number {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }
  return 502;
}
