// lib/vfs.ts — virtual filesystem rules shared by the repo routes.
// Tree entries are filtered before they reach the Explorer; blobs are capped
// and binary files are rejected (DOC/06 §3-4).
export type GitTreeEntry = {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
};

const IGNORED_DIRS = [
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  "coverage",
];

const BINARY_EXT =
  /\.(?:png|jpe?g|gif|webp|ico|mp4|mp3|zip|tar|gz|woff2?|ttf|pdf|exe)$/i;

export const MAX_TREE_ENTRIES = 5000;
export const MAX_BLOB_BYTES = 524288;

export function isIgnoredPath(path: string): boolean {
  return IGNORED_DIRS.some(
    (dir) => path === dir || path.startsWith(`${dir}/`),
  );
}

export function filterTree(
  entries: GitTreeEntry[],
  cap = MAX_TREE_ENTRIES,
): { entries: GitTreeEntry[]; truncated: boolean } {
  const kept = entries.filter(
    (entry) =>
      entry.type === "blob" || entry.type === "tree"
        ? !isIgnoredPath(entry.path)
        : false,
  );
  return {
    entries: kept
      .slice(0, cap)
      .sort((a, b) =>
        a.type === b.type
          ? a.path.localeCompare(b.path)
          : a.type === "tree"
            ? -1
            : 1,
      ),
    truncated: kept.length > cap,
  };
}

export function isBinaryPath(path: string): boolean {
  return BINARY_EXT.test(path);
}
