# Skill: workbench chrome (dir `rounded-workbench` kept for link stability)

User screenshots are authority; the user does visual sign-off.

## Current: floating rounded sections (2026-10 refresh)

- Shell: `flex h-screen`; TitleBar flush top, StatusBar flush bottom (square,
  full-width). Between them: a gutter backdrop (`bg-vscode-titlebar`, the workbench base) with
  5px gap + 5px padding; each major region is a rounded card.
- Card shell = `Section` primitive: `rounded-section` (8px), 1px
  `border-vscode-border`, `overflow-hidden` so inner square corners clip.
- Primary side bar is ONE card: ActivityBar + SideBar fused (`PrimarySideBar`).
  The rail keeps `border-r` as the internal divider; the pane drops its outer
  border. No gutter between rail and pane.
- Fixed sizes unchanged: ActivityBar 48px, Sidebar 280px, Tabs 35px,
  Breadcrumb 22px, StatusBar 24px, Panel 280px.
- Radii/colors only via @theme tokens. Controls keep `rounded-control` (5px):
  Command Center (1px #2b2b2b border, #242424 fill, max 600px, centered),
  menus, tooltips, floating widgets.

## Superseded: flush chrome (2026-10-16)

Square regions with hairlines and no gaps matched VS Code screenshots at the
time (`PV-WORKBENCH-FLUSH`); replaced by the floating-sections look above
when current screenshots showed gutters + rounded cards.
