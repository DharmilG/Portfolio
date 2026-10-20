// lib/commitGraph.ts — lane layout for the Source Control graph rail.
// Commits arrive newest-first and carry their parents (DOC/09 §4). The rail
// draws the DAG those parents describe: one lane per open branch, a side
// branch opening to the right of the commit that introduced it.
//
// Pure data — no React, no store (rule: dumb-depth). The renderer lives in
// components/vscode/CommitGraph.tsx.

export type CommitLaneRow = {
  /** Lane this commit sits in. */
  lane: number;
  /** Lanes open above the row (they reach the commit). */
  inLanes: number[];
  /** Lanes open below the row (they continue past the commit). */
  outLanes: number[];
  /** Lanes this commit opens (its extra parents). */
  newLanes: number[];
  /** True when the commit started its own lane (a branch tip). */
  startsLane: boolean;
};

type CommitLike = { sha: string; parents: string[] };

export function buildCommitLanes(commits: CommitLike[]): CommitLaneRow[] {
  // Lane index -> the sha the lane is waiting for (null = the lane ended).
  const lanes: (string | null)[] = [];
  const rows: CommitLaneRow[] = [];

  for (const commit of commits) {
    let lane = lanes.indexOf(commit.sha);
    const startsLane = lane === -1;
    // Lanes reaching this row are the ones that were open above it.
    const inLanes = lanes.reduce<number[]>(
      (acc, expect, i) => (expect !== null ? [...acc, i] : acc),
      [],
    );

    if (startsLane) {
      lane = lanes.length;
      lanes.push(commit.sha);
    }
    // The first parent continues the lane; extra parents open new lanes.
    lanes[lane] = commit.parents[0] ?? null;
    const newLanes: number[] = [];
    for (const parent of commit.parents.slice(1)) {
      lanes.push(parent);
      newLanes.push(lanes.length - 1);
    }

    const outLanes = lanes.reduce<number[]>(
      (acc, expect, i) => (expect !== null ? [...acc, i] : acc),
      [],
    );
    rows.push({ lane, inLanes, outLanes, newLanes, startsLane });
  }

  return rows;
}

// Widest lane index the graph uses — the rail keeps one width for all rows.
export function commitLaneCount(rows: CommitLaneRow[]): number {
  return rows.reduce(
    (max, row) =>
      Math.max(
        max,
        row.lane + 1,
        ...row.inLanes.map((l) => l + 1),
        ...row.outLanes.map((l) => l + 1),
      ),
    0,
  );
}
