"use client";

// Client wrapper so the beforeSend callback is created in a Client Component.
// It strips query strings/hashes from reported URLs before Vercel stores them.
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

function stripQueryAndHash(event: BeforeSendEvent): BeforeSendEvent {
  try {
    return { ...event, url: new URL(event.url).pathname };
  } catch {
    return event;
  }
}

export default function VercelAnalytics() {
  return <Analytics mode="production" beforeSend={stripQueryAndHash} />;
}
