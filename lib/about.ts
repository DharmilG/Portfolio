// About content — the authored profile story stored in `profiles.about`.
// The JSON is intentionally editorial (headline, paragraphs, quote, principles,
// now and beyond), while the timeline, work and skills stay derived from the
// content tables. Parse defensively so a missing/partial object still renders.

export type AboutPrinciple = {
  title: string;
  body: string;
  icon: string | null;
  note: string | null;
};

export type AboutNow = {
  label: string;
  value: string;
  detail: string | null;
};

export type AboutBeyond = {
  title: string;
  body: string;
  icon: string | null;
};

export type AboutContent = {
  headline: string;
  story: string[];
  quote: string | null;
  principles: AboutPrinciple[];
  now: AboutNow[];
  beyond: AboutBeyond[];
};

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function texts(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function records(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(record) : [];
}

export function parseAbout(raw: unknown): AboutContent {
  const about = record(raw);

  return {
    headline: text(about.headline),
    story: texts(about.story).slice(0, 6),
    quote: text(about.quote) || null,
    principles: records(about.principles)
      .map((item) => ({
        title: text(item.title),
        body: text(item.body),
        icon: text(item.icon) || null,
        note: text(item.note) || null,
      }))
      .filter((item) => item.title && item.body)
      .slice(0, 6),
    now: records(about.now)
      .map((item) => ({
        label: text(item.label),
        value: text(item.value),
        detail: text(item.detail) || null,
      }))
      .filter((item) => item.label && item.value)
      .slice(0, 6),
    beyond: records(about.beyond)
      .map((item) => ({
        title: text(item.title),
        body: text(item.body),
        icon: text(item.icon) || null,
      }))
      .filter((item) => item.title && item.body)
      .slice(0, 6),
  };
}
