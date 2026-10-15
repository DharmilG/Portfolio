# Skill: rounded-workbench

VS Code 1.90+ workbench: outer `8px` gap + padding on `#0f0f0f` body; every
panel `radius 8px`, `1px #2b2b2b` border, `0 8px 24px rgb(0 0 0/.45)` shadow.
Fixed chrome: TitleBar 36px, ActivityBar 48px, Sidebar 280px, Tabs 35px,
Breadcrumb 22px, StatusBar 24px, Panel 280px. Command Center is a full pill.

Good: grid shell with `gap-2 p-2`, each region `rounded-vscode border`.
Bad: square panels, zero gap, or per-component radius values — breaks the
floating-workbench illusion; radii live in tokens, not classNames.
