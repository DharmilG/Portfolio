// Read-only text proxy for the browser terminal's `curl` command.
//
// The terminal is a browser-only demo, so it cannot open a socket itself.
// This route fetches public http(s) URLs and returns a small text body.
//
// Safety model lives in lib/net.ts (shared with /api/embed-check and
// /api/embed): public http(s) only, no credentials, DNS-checked hosts, and
// manually followed redirects with every hop validated again. This route
// adds the text-only rules and the 20 KB response cap.
//
// DNS is checked before `fetch`; a determined DNS-rebinding attack could
// still race the resolver. This is a portfolio demo, not a general proxy.
import {
  fetchValidated,
  NetError,
  readCapped,
  validatePublicUrl,
} from "@/lib/net";

const MAX_BYTES = 20_000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8_000;

function isTextContentType(value: string): boolean {
  const type = value.split(";")[0].trim().toLowerCase();
  if (!type || type === "text/event-stream") return false;
  if (type.startsWith("text/")) return true;
  if (type === "image/svg+xml" || type === "application/graphql") return true;
  return /^application\/(?:.+\+)?(?:json|xml|yaml|x-yaml|javascript|ecmascript|x-www-form-urlencoded)$/.test(
    type,
  );
}

async function fetchText(
  start: URL,
  signal: AbortSignal,
): Promise<{ status: number; finalUrl: string; text: string; truncated: boolean }> {
  const { response, finalUrl } = await fetchValidated(
    start,
    {
      method: "GET",
      cache: "no-store",
      signal,
      headers: {
        accept:
          "text/html, text/plain;q=0.9, application/json;q=0.8, */*;q=0.1",
        "user-agent": "PortfolioTerminal/1.0 (curl preview)",
      },
    },
    MAX_REDIRECTS,
  );

  if (response.status === 204 || response.status === 304) {
    if (response.body) await response.body.cancel().catch(() => {});
    return {
      status: response.status,
      finalUrl: finalUrl.href,
      text: "",
      truncated: false,
    };
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!isTextContentType(contentType)) {
    if (response.body) await response.body.cancel().catch(() => {});
    throw new NetError(415, "Upstream response is not text");
  }

  const { text, truncated } = await readCapped(response, MAX_BYTES);
  return { status: response.status, finalUrl: finalUrl.href, text, truncated };
}

function textResponse(
  status: number,
  body: string | null,
  headers: Record<string, string> = {},
): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  const target = new URL(request.url).searchParams.get("url");
  if (!target) {
    return textResponse(400, "Missing ?url=", { "x-proxy-error": "1" });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = await validatePublicUrl(target);
    const result = await fetchText(url, controller.signal);
    return textResponse(result.status, result.text || null, {
      "x-proxy-final-url": result.finalUrl,
      ...(result.truncated ? { "x-proxy-truncated": "1" } : {}),
    });
  } catch (error) {
    if (error instanceof NetError) {
      return textResponse(error.status, error.message, {
        "x-proxy-error": "1",
      });
    }
    if (error instanceof Error && error.name === "AbortError") {
      return textResponse(504, "Upstream timed out", {
        "x-proxy-error": "1",
      });
    }
    return textResponse(502, "Upstream fetch failed", {
      "x-proxy-error": "1",
    });
  } finally {
    clearTimeout(timer);
  }
}
