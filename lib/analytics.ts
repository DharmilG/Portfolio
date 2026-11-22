// lib/analytics.ts — typed, production-only wrapper for portfolio events.
// Sends the same non-identifying payload to Vercel Web Analytics and GA4.
// Never pass names, emails, search text, file contents, or form values here.
import { sendGAEvent } from "@next/third-parties/google";
import { track } from "@vercel/analytics";

export type AnalyticsEvent =
  | "project_readme_open"
  | "project_overview_open"
  | "project_preview_open"
  | "readme_toc_jump"
  | "readme_copy"
  | "readme_raw_open"
  | "readme_tab_change"
  | "resume_download"
  | "theme_change"
  | "command_palette_open";

export type AnalyticsProperties = Record<
  string,
  string | number | boolean | undefined
>;

export function trackEvent(
  event: AnalyticsEvent,
  properties: AnalyticsProperties = {},
) {
  if (process.env.NODE_ENV !== "production") return;
  if (typeof window === "undefined") return;

  const clean = Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined),
  ) as Record<string, string | number | boolean>;

  try {
    track(event, clean);
  } catch {
    // Analytics must never break the UI.
  }

  try {
    sendGAEvent("event", event, clean);
  } catch {
    // GA4 may not be initialized yet; drop the event silently.
  }
}
