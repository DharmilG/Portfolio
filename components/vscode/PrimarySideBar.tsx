"use client";

// PrimarySideBar — ActivityBar + SideBar fused into ONE rounded workbench
// section (2026-10 refresh). The rail keeps its border-r as the internal
// divider; there is no gutter between rail and pane. Forwards all props.
import type { ComponentProps, ReactNode } from "react";
import ActivityBar from "./ActivityBar";
import Section from "./Section";
import SideBar, { type ViewAction } from "./SideBar";

type PrimarySideBarProps = ComponentProps<typeof ActivityBar> & {
  title?: string;
  actions?: ViewAction[];
  onAction?: (id: string) => void;
  onOverflow?: () => void;
  children?: ReactNode;
};

export default function PrimarySideBar({
  title,
  actions,
  onAction,
  onOverflow,
  children,
  ...activity
}: PrimarySideBarProps) {
  return (
    <Section
      orientation="row"
      label="Primary side bar"
      className="shrink-0 bg-vscode-side"
    >
      <ActivityBar {...activity} />
      <SideBar
        title={title}
        actions={actions}
        onAction={onAction}
        onOverflow={onOverflow}
      >
        {children}
      </SideBar>
    </Section>
  );
}
