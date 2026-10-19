// Read-only view for pages that refuse framing (DOC/10 §4).
//
// BrowserPreview's fallback when /api/embed-check reports a refusal: fetch
// the page server-side, drop active content (scripts, inline handlers, nested
// frames, meta refresh), keep the markup plus styles/images (loaded from the
// origin via <base>), and serve the result as an opaque-origin document.
// Static pages render close to the real thing; JS apps lose interactivity by
// design. Links are rewritten through this route so the read-only surface
// stays browseable inside the pane.
//
// Safety (on top of the shared guards in lib/net.ts):
// - the response carries `Content-Security-Policy: sandbox` (unique origin,
//   no scripts) and the pane mounts it with `sandbox=""`;
// - scripts/handlers/frames are stripped before the document leaves the
//   server — defense in depth, not the security boundary;
// - only HTML documents are proxied; assets come straight from the origin.
import {
  fetchValidated,
  NetError,
  readCapped,
  validatePublicUrl,
} from "@/lib/net";

const MAX_BYTES = 3_000_000; // 3 MB of HTML
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8_000;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// No scripts, no plugins, no nested frames; inline styles and remote
// images/fonts stay so the page keeps its look.
const DOCUMENT_CSP =
  "sandbox; default-src 'none'; img-src http: https: data:; media-src http: https:; style-src http: https: 'unsafe-inline'; font-src http: https: data:;";

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Links inside the read-only document navigate page-by-page through this
// route instead of escaping to the live site (which would be refused again).
function rewriteAnchors(html: string, base: URL): string {
  return html.replace(/<a\b[^>]*>/gi, (tag) =>
    tag
      .replace(/\starget\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(
        /(\shref\s*=\s*)("([^"]*)"|'([^']*)'|([^\s>]+))/i,
        (match, prefix: string, _all: string, dq?: string, sq?: string, bare?: string) => {
          const value = (dq ?? sq ?? bare ?? "").trim();
          if (!value || value.startsWith("#")) return match;
          if (/^(?:javascript|mailto|tel|data|blob):/i.test(value)) return match;
          let resolved: URL;
          try {
            resolved = new URL(value, base);
          } catch {
            return match;
          }
          if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
            return match;
          }
          return `${prefix}"/api/embed?url=${encodeURIComponent(resolved.href)}"`;
        },
      ),
  );
}

// Best-effort HTML surgery. The CSP sandbox is the security boundary; these
// rewrites are cosmetic and deliberately conservative.
function prepareDocument(html: string, finalUrl: URL): string {
  let out = html;
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
  out = out.replace(/<script\b[^>]*\/?>/gi, "");
  out = out.replace(
    /<meta\b[^>]*http-equiv\s*=\s*["']?(?:content-security-policy|refresh)["']?[^>]*>/gi,
    "",
  );
  out = out.replace(/<base\b[^>]*>/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = out.replace(
    /<(iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
    "",
  );
  out = out.replace(/<(iframe|object|embed)\b[^>]*\/?>/gi, "");
  out = rewriteAnchors(out, finalUrl);

  const baseTag = `<base href="${escapeAttribute(finalUrl.href)}">`;
  if (/<head\b[^>]*>/i.test(out)) {
    out = out.replace(/<head\b[^>]*>/i, (match) => match + baseTag);
  } else if (/<html\b[^>]*>/i.test(out)) {
    out = out.replace(/<html\b[^>]*>/i, (match) => match + baseTag);
  } else if (/^\s*<!doctype[^>]*>/i.test(out)) {
    out = out.replace(/^\s*<!doctype[^>]*>/i, (match) => match + baseTag);
  } else {
    out = baseTag + out;
  }
  return out;
}

function documentResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": DOCUMENT_CSP,
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}

function errorResponse(
  status: number,
  title: string,
  detail: string,
  url: string,
): Response {
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(
    title,
  )}</title><style>body{margin:0;padding:48px 40px;background:#1f1f1f;color:#ccc;font:13px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}h1{margin:0 0 12px;font-size:18px;font-weight:600;color:#f48771}p{margin:0 0 8px;max-width:640px}.muted{color:#9d9d9d}.url{margin-top:16px;color:#3b8eea;word-break:break-all}</style></head><body><h1>${escapeHtml(
    title,
  )}</h1><p class="muted">${escapeHtml(detail)}</p><p class="url">${escapeHtml(
    url,
  )}</p></body></html>`;
  return new Response(page, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy": DOCUMENT_CSP,
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) {
    return errorResponse(400, "Read-Only View", "Missing ?url=.", "");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = await validatePublicUrl(raw);
    const { response, finalUrl } = await fetchValidated(
      url,
      {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
          "accept-language": "en-US,en;q=0.9",
          "user-agent": USER_AGENT,
        },
      },
      MAX_REDIRECTS,
    );

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("application/xhtml+xml")
    ) {
      if (response.body) await response.body.cancel().catch(() => {});
      return errorResponse(
        415,
        "Not a Page",
        "The read-only view only renders HTML documents. Open this URL in a browser tab instead.",
        url.href,
      );
    }

    const { text } = await readCapped(response, MAX_BYTES);
    return documentResponse(prepareDocument(text, finalUrl));
  } catch (error) {
    if (error instanceof NetError) {
      return errorResponse(error.status, "Read-Only View", error.message, raw);
    }
    if (error instanceof Error && error.name === "AbortError") {
      return errorResponse(
        504,
        "Read-Only View",
        "The site took too long to respond.",
        raw,
      );
    }
    return errorResponse(
      502,
      "Read-Only View",
      "The site could not be fetched.",
      raw,
    );
  } finally {
    clearTimeout(timer);
  }
}
