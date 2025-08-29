"use client";

// Skills — grouped technical capabilities and tooling stack.
// Styled to match the reference layout: category cards with item counters,
// grid of individual skill chips featuring authentic brand logos and semantic colors.
import { useStore } from "@/lib/store";
import SkillIcon from "../SkillIcon";
import Tooltip from "../Tooltip";
import { PageShell } from "./PageShell";

export default function SkillsPage() {
  const content = useStore((s) => s.profile);
  const groups = content?.skills ?? [];

  return (
    <PageShell
      icon="code"
      iconClassName="text-[#4ade80]"
      title="Skills"
      width="wide"
    >
      {groups.length === 0 ? (
        <p className="text-page-body text-vscode-dim">No skills listed yet.</p>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <section
              key={group.id}
              className="rounded-control border border-vscode-page-border bg-vscode-page-card p-5"
            >
              <div className="mb-3.5 flex items-center justify-between">
                <h2 className="text-page-body font-semibold text-vscode-fg-active">
                  {group.category}
                </h2>
                <span className="font-mono text-page-micro text-vscode-dim">
                  {group.items.length}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
                {group.items.map((item) => (
                  <Tooltip key={item} text={item} position="top" delay={true} className="w-full">
                    <div className="flex w-full items-center gap-2.5 rounded-control border border-vscode-page-border bg-vscode-page-chip px-3.5 py-2.5 transition-colors hover:border-vscode-accent/50 hover:bg-vscode-page-card-hover">
                      <SkillIcon name={item} size={16} />
                      <span className="truncate text-page-meta font-medium text-vscode-fg-active">
                        {item}
                      </span>
                    </div>
                  </Tooltip>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
