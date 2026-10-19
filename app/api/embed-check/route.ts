// Pre-flight framing check for the integrated browser (BrowserPreview).
//
// Chrome refuses to render a framed page that sends X-Frame-Options or a
// restrictive frame-ancestors CSP, and the refusal is not observable from
// page JS. The pane therefore asks this route for a verdict before mounting
// the iframe, and shows its own branded card instead of the browser error.
//
// Verdicts:
// - blocked: the response refuses framing (reason names the header)
// - allowed: no framing restrictions in the response headers
// - unknown: local/private URL (never probed), unreachable target or timeout
//
// Only the header block is read; the body is cancelled right after. Headers
// come from the final redirect target, with every hop validated by
// lib/net.ts — a redirect into private space ends as "unknown", not a fetch.
import {
  fetchValidated,
  isPrivateHostname,
  validatePublicUrl,
} from "@/lib/net";

const TIMEOUT_MS = 4_000;
const MAX_REDIRECTS = 3;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

type Verdict = { verdict: "allowed" | "blocked" | "unknown"; reason?: string };

function jsonResponse(body: Verdict, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function xfoVerdict(headers: Headers): Verdict | null {
  const raw = headers.get("x-frame-options");
  if (!raw) return null;
  const first = raw.split(",")[0].trim().toUpperCase();
  if (first === "DENY") {
    return { verdict: "blocked", reason: "X-Frame-Options: DENY" };
  }
  if (first === "SAMEORIGIN") {
    return { verdict: "blocked", reason: "X-Frame-Options: SAMEORIGIN" };
  }
  if (first.startsWith("ALLOW-FROM")) {
    return { verdict: "blocked", reason: "X-Frame-Options: ALLOW-FROM" };
  }
  return null; // unknown values are ignored by browsers
}

// Does one frame-ancestors value admit the pane's own origin?
function ancestorAllows(value: string, appOrigin: string): boolean {
  const tokens = value.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return false; // frame-ancestors with no value = 'none'
  for (const token of tokens) {
    if (token === "*") return true;
    const source =
      token.startsWith("'") && token.endsWith("'") ? token.slice(1, -1) : token;
    if (source === "self") continue; // the framed page's own origin
    try {
      const candidate = source.includes("://")
        ? new URL(source)
        : new URL(`http://${source}`);
      if (candidate.origin === appOrigin) return true;
    } catch {
      continue; // wildcards and garbage never match
    }
  }
  return false;
}

function cspVerdict(headers: Headers, appOrigin: string): Verdict | null {
  const csp = headers.get("content-security-policy");
  if (!csp) return null;
  for (const match of csp.matchAll(/frame-ancestors([^;,]*)/gi)) {
    const value = match[1].replace(/\s+/g, " ").trim();
    if (ancestorAllows(value, appOrigin)) continue;
    return {
      verdict: "blocked",
      reason: `Content-Security-Policy: frame-ancestors ${value || "(none)"}`,
    };
  }
  return null;
}

export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const raw = requestUrl.searchParams.get("url");
  if (!raw) return jsonResponse({ verdict: "unknown" }, 400);

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return jsonResponse({ verdict: "unknown" });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return jsonResponse({ verdict: "unknown" });
  }
  // Local/private targets are never probed; the pane mounts them directly.
  if (isPrivateHostname(url.hostname)) {
    return jsonResponse({ verdict: "unknown" });
  }

  const appOrigin = requestUrl.origin;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const target = await validatePublicUrl(url.href);
    const { response } = await fetchValidated(
      target,
      {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
          "user-agent": USER_AGENT,
        },
      },
      MAX_REDIRECTS,
    );

    const verdict =
      xfoVerdict(response.headers) ??
      cspVerdict(response.headers, appOrigin) ?? { verdict: "allowed" };

    if (response.body) await response.body.cancel().catch(() => {});
    return jsonResponse(verdict);
  } catch {
    return jsonResponse({ verdict: "unknown" });
  } finally {
    clearTimeout(timer);
  }
}
