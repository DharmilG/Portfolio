"use client";

// PrimarySideBar — ActivityBar + SideBar fused into ONE rounded workbench
// section (2026-10 refresh). The rail keeps its border-r as the internal
// divider; there is no gutter between rail and pane. Forwards all props.
import type { ComponentProps, ReactNode } from "react";
import ActivityBar from "./ActivityBar";
import Section from "./Section";
import SideBar from "./SideBar";

type PrimarySideBarProps = ComponentProps<typeof ActivityBar> & {
  title?: string;
  onOverflow?: () => void;
  actions?: ReactNode;
  children?: ReactNode;
};

export default function PrimarySideBar({
  title,
  onOverflow,
  actions,
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
      <SideBar title={title} onOverflow={onOverflow} actions={actions}>
        {children}
      </SideBar>
    </Section>
  );
}
