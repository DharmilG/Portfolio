"use client";

// RunView — the Run and Debug pane (DOC/05 §10). Starts the selected
// project: a project with a `preview_url` opens in the integrated browser
// (or in a new tab when the embed is not allowed). Projects without a public
// URL explain that instead of pretending to run.
import { useStore } from "@/lib/store";
import Codicon from "./Codicon";

export default function RunView() {
  const projects = useStore((s) => s.projects);
  const activeRepo = useStore((s) => s.activeRepo);
  const openBrowser = useStore((s) => s.openBrowser);
  const pushToast = useStore((s) => s.pushToast);

  const project =
    projects.find((p) => `${p.repo_owner}/${p.repo_name}` === activeRepo) ??
    null;
  const title = project
    ? (project.title_override ?? project.repo_name)
    : "No project";
  const url = project?.preview_url ?? null;
  const embeddable = project?.preview_embeddable ?? false;

  const run = () => {
    if (!url) return;
    if (embeddable) {
      openBrowser(url);
      return;
    }
    window.open(url, "_blank", "noopener");
  };

  return (
    <div className="flex flex-col gap-3 px-3 py-3 text-[13px]">
      <div className="rounded-control border border-vscode-border bg-vscode-side p-3">
        <div className="flex items-center gap-2">
          <Codicon name="run" size={14} className="text-vscode-added" />
          <span className="font-medium">{title}</span>
        </div>
        <p className="mt-1 break-all text-[11px] text-vscode-dim">
          {url ?? "No preview URL for this project yet"}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled={!url}
            onClick={run}
            className="flex h-[26px] items-center gap-1 rounded-[4px] border border-transparent bg-vscode-accent px-2 py-[4px] text-[12px] leading-[16px] text-vscode-badge-fg enabled:hover:bg-vscode-accent-hover disabled:opacity-40"
          >
            <Codicon name="play" size={12} />
            Run
          </button>
          {url && !embeddable ? (
            <button
              type="button"
              onClick={() => window.open(url, "_blank", "noopener")}
              className="flex h-[26px] items-center rounded-[4px] border border-vscode-border px-2 py-[4px] text-[12px] leading-[16px] text-vscode-fg hover:bg-vscode-list-hover"
            >
              Open in new tab
            </button>
          ) : null}
        </div>
      </div>

      {!url ? (
        <p className="px-1 text-[11px] leading-relaxed text-vscode-dim">
          Live previews need a public URL. The project keeps its source in the
          Explorer until then.
        </p>
      ) : null}
      {url && !embeddable ? (
        <p className="px-1 text-[11px] leading-relaxed text-vscode-dim">
          This preview cannot be framed — it opens in a new tab.
        </p>
      ) : null}
    </div>
  );
}
