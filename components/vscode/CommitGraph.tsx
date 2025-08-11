"use client";

// CommitGraph — the inline graph rail beside the Source Control commit rows
// (DOC/05 §7). One compact SVG per row: lanes that reach the row come down
// from above, lanes that continue leave below, a commit opens a side lane
// for every extra parent, and the commit itself is the dot. The lane model
// comes from lib/commitGraph.ts (pure).
import type { CommitLaneRow } from "@/lib/commitGraph";

const ROW_HEIGHT = 28;
const RAIL_PAD = 6;
const LANE_GAP = 7;

// Lane colors follow the workbench palette (accent / modified / added / fg).
const LANE_COLORS = [
  "var(--color-vscode-accent)",
  "var(--color-vscode-modified)",
  "var(--color-vscode-added)",
  "var(--color-vscode-fg)",
];

type CommitGraphProps = {
  row: CommitLaneRow;
  laneCount: number;
};

export default function CommitGraph({ row, laneCount }: CommitGraphProps) {
  const width = RAIL_PAD * 2 + Math.max(0, laneCount - 1) * LANE_GAP;
  const x = (lane: number) => RAIL_PAD + lane * LANE_GAP;
  const mid = ROW_HEIGHT / 2;
  const color = (lane: number) => LANE_COLORS[lane % LANE_COLORS.length];

  return (
    <svg
      width={width}
      height={ROW_HEIGHT}
      viewBox={`0 0 ${width} ${ROW_HEIGHT}`}
      aria-hidden
      className="shrink-0 overflow-visible"
    >
      {row.inLanes.map((lane) => (
        <line
          key={`in-${lane}`}
          x1={x(lane)}
          y1={0}
          x2={x(lane)}
          y2={mid}
          stroke={color(lane)}
          strokeWidth={1.5}
        />
      ))}
      {row.outLanes.map((lane) => (
        <line
          key={`out-${lane}`}
          x1={x(lane)}
          y1={mid}
          x2={x(lane)}
          y2={ROW_HEIGHT}
          stroke={color(lane)}
          strokeWidth={1.5}
        />
      ))}
      {row.newLanes.map((lane) => (
        <path
          key={`new-${lane}`}
          d={`M ${x(row.lane)} ${mid} C ${x(row.lane) + 3} ${mid}, ${x(lane) - 3} ${mid}, ${x(lane)} ${mid}`}
          fill="none"
          stroke={color(lane)}
          strokeWidth={1.5}
        />
      ))}
      <circle cx={x(row.lane)} cy={mid} r={2.5} fill={color(row.lane)} />
    </svg>
  );
}
