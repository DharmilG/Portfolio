# Skill: flat-chrome (dir `rounded-workbench` kept for link stability)

VS Code chrome is flush and square. This supersedes the earlier
"floating rounded cards on #0f0f0f" look (reverted 2026-10-16 while
matching real VS Code screenshots).

- Shell: `flex h-screen` — no gaps, no padding; regions touch the viewport.
- Structural surfaces (TitleBar, ActivityBar, SideBar, editor, StatusBar):
  square corners; separated by `1px` `border-vscode-border` (#2b2b2b)
  hairlines, never gutters.
- TitleBar: 36px, `bg-vscode-titlebar` (#191a1b).
- Fixed chrome: ActivityBar 48px, Sidebar 280px, Tabs 35px, Breadcrumb 22px,
  StatusBar 24px, Panel 280px.
- Radii exist only for controls: `rounded-control` (5px) — Command Center,
  menus, tooltips, floating widgets. No pills anywhere.
- Command Center: 5px radius, `1px` `#2b2b2b` border, `#242424` fill,
  max 600px wide, centered.

Good: flush regions with `border-r border-vscode-border` separators; radii
and colors only via @theme tokens.
Bad: rounded structural panels, gaps between regions, pill shapes,
per-component radius or hex values.
