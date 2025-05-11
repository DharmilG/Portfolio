// lib/localGit.ts — local-only edit/commit model (pure, zero deps).
// Real GitHub history stays server-side; pseudo-commits live in the browser.
// See DOC/09 §8, rule 03-local-only, skill local-git.

export type LocalEdit = {
  path: string;
  content: string;
  savedAt: string;
};

export type LocalCommit = {
  id: `local-${number}`;
  msg: string;
  files: string[];
  time: string;
  local: true;
};

export type RealCommit = {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
  local?: false;
};

export type ViewCommit = LocalCommit | RealCommit;

export function makeLocalCommit(msg: string, files: string[]): LocalCommit {
  return {
    id: `local-${Date.now()}`,
    msg: msg.trim().slice(0, 200),
    files: [...files],
    time: new Date().toISOString(),
    local: true,
  };
}

export function mergeCommits(
  local: LocalCommit[],
  real: RealCommit[],
): ViewCommit[] {
  return [...local, ...real];
}

export function resolveContent(
  path: string,
  edits: Record<string, string>,
  cached: string,
): string {
  return edits[path] ?? cached;
}

export function isEdited(
  path: string,
  edits: Record<string, string>,
): boolean {
  return path in edits;
}
