"use client";

// Skills — the grouped chips (DOC/04 §1). One block per category, the
// everyday tools first.
import { useStore } from "@/lib/store";
import { PageChip, PageShell } from "./PageShell";

export default function SkillsPage() {
  const content = useStore((s) => s.profile);
  const groups = content?.skills ?? [];

  return (
    <PageShell
      icon="code"
      title="Skills"
      subtitle="The tools I reach for, grouped the way I actually work."
      footer="Rows live in the `skills` table (category + items)."
    >
      {groups.length === 0 ? (
        <p className="text-[13px] text-vscode-dim">No skills listed yet.</p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.id}>
              <div className="text-[12px] font-medium uppercase tracking-wide text-vscode-emphasis">
                {group.category}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <PageChip key={item}>{item}</PageChip>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
