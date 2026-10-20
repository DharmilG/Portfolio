"use client";

// ExtensionsView — the Extensions pane (DOC/05 §10). Static cards for the
// two extensions the workbench pretends to have; "Install" is a dummy that
// only raises a toast (PV-UI-TOAST).
import { useState } from "react";
import { useStore } from "@/lib/store";
import Codicon from "./Codicon";

type Extension = {
  id: string;
  name: string;
  publisher: string;
  description: string;
  rating: string;
  installs: string;
};

const EXTENSIONS: Extension[] = [
  {
    id: "prettier",
    name: "Prettier",
    publisher: "Prettier",
    description: "Opinionated code formatter — formats the file on save.",
    rating: "4.5",
    installs: "38.4M",
  },
  {
    id: "eslint",
    name: "ESLint",
    publisher: "Microsoft",
    description: "Integrates ESLint into the workbench (dummy).",
    rating: "4.2",
    installs: "32.1M",
  },
];

export default function ExtensionsView() {
  const pushToast = useStore((s) => s.pushToast);
  const [installed, setInstalled] = useState<string[]>([]);

  const install = (ext: Extension) => {
    if (installed.includes(ext.id)) return;
    setInstalled((prev) => [...prev, ext.id]);
    pushToast(`Installing ${ext.name}… (demo)`, "info");
  };

  return (
    <div className="flex flex-col gap-2 px-3 py-3 text-[13px]">
      {EXTENSIONS.map((ext) => {
        const done = installed.includes(ext.id);
        return (
          <div
            key={ext.id}
            className="rounded-control border border-vscode-border bg-vscode-side p-3"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-control bg-vscode-activity-active-bg text-vscode-fg">
                <Codicon name="extensions" size={14} />
              </span>
              <div className="min-w-0">
                <div className="truncate font-medium">{ext.name}</div>
                <div className="truncate text-[11px] text-vscode-dim">
                  {ext.publisher}
                </div>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-vscode-muted">
              {ext.description}
            </p>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-vscode-dim">
              <span className="flex items-center gap-1">
                <Codicon name="star-full" size={12} />
                {ext.rating}
              </span>
              <span>{ext.installs} installs</span>
            </div>
            <button
              type="button"
              disabled={done}
              onClick={() => install(ext)}
              className="mt-3 flex h-[26px] items-center rounded-[4px] border border-transparent bg-vscode-accent px-2 py-[4px] text-[12px] leading-[16px] text-vscode-badge-fg enabled:hover:bg-vscode-accent-hover disabled:opacity-40"
            >
              {done ? "Installed" : "Install"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
