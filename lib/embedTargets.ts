// Embeddable URL mappings for the integrated browser (DOC/10 §4).
//
// A web page cannot force a site that refuses framing into an iframe, but
// some sites publish dedicated embeddable entry points. The pane rewrites
// the iframe `src` only — the address bar keeps the URL the user typed.
// Everything unmapped falls through to /api/embed-check and, when refused,
// the blocked card. Keep this table small and honest: a wrong mapping is
// worse than the card.
//
// - Google serves its search UI without frame-busting headers when the
//   `igu=1` parameter is present (the embed signal Google itself uses).
// - YouTube's watch pages refuse framing; /embed/<id> is the player URL.
const GOOGLE_HOST = /^(?:www\.)?google\.[a-z]{2,}(?:\.[a-z]{2,})?$/i;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);
const VIDEO_ID = /^[\w-]{6,}$/;

function youtubeEmbed(id: string, start: string | null): string {
  const mapped = new URL(`https://www.youtube.com/embed/${id}`);
  if (start && /^\d+$/.test(start)) mapped.searchParams.set("start", start);
  return mapped.href;
}

// Returns the URL the iframe should load; the input itself when there is
// no known embeddable variant.
export function resolveEmbedSrc(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return raw;

  const host = url.hostname.toLowerCase();

  if (GOOGLE_HOST.test(host)) {
    if (url.pathname === "/" || url.pathname === "/webhp") {
      return "https://www.google.com/search?igu=1";
    }
    if (url.pathname === "/search") {
      // Keep q/tbm/udm/... intact; only add the embed flag.
      const mapped = new URL("https://www.google.com/search");
      url.searchParams.forEach((value, key) => {
        if (key !== "igu") mapped.searchParams.append(key, value);
      });
      mapped.searchParams.set("igu", "1");
      return mapped.href;
    }
    return raw;
  }

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0] ?? "";
    if (!VIDEO_ID.test(id)) return raw;
    return youtubeEmbed(id, url.searchParams.get("t"));
  }

  if (YOUTUBE_HOSTS.has(host)) {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v") ?? "";
      if (!VIDEO_ID.test(id)) return raw;
      return youtubeEmbed(
        id,
        url.searchParams.get("t") ?? url.searchParams.get("start"),
      );
    }
    const short = /^\/(?:shorts|live)\/([\w-]+)/.exec(url.pathname);
    if (short) return youtubeEmbed(short[1], url.searchParams.get("t"));
    return raw;
  }

  return raw;
}
