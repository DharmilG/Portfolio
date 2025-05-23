# Skill: vscode-tokens

All color/type/radius/shadow values come from `app/globals.css` `@theme`
(`--color-vscode-*`, `--font-vscode-*`, `--radius-*`, `--shadow-vscode`).
Components reference tokens only (`bg-vscode-side`, `text-vscode-fg`).

Good: `className="bg-vscode-tab text-vscode-dim rounded-control"`.
Bad: `className="bg-[#1f1f1f] text-[#ccc] rounded-[8px]"` — hardcoded values
drift from VS Code Dark Modern on the next tweak; use the token.
