// Read-only text proxy for the browser terminal's `curl` command.
//
// The terminal is a browser-only demo, so it cannot open a socket itself.
// This route fetches public http(s) URLs and returns a small text body.
//
// Safety model:
// - GET only, http(s) only, no credentials in the URL.
// - Loopback, private, link-local, CGNAT, multicast, documentation and
//   metadata addresses are rejected, both as literals and after DNS lookup.
// - Redirects are followed manually and every hop is validated again.
// - 8s total deadline, 20 KB response cap, text content types only.
//
// DNS is checked before `fetch`; a determined DNS-rebinding attack could
// still race the resolver. This is a portfolio demo, not a general proxy.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BYTES = 20_000;
const MAX_REDIRECTS = 3;
const MAX_URL_LENGTH = 2_048;
const TIMEOUT_MS = 8_000;
const DNS_TIMEOUT_MS = 2_500;

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata",
  "metadata.google.internal",
  "instance-data",
]);

const REDIRECTS = new Set([301, 302, 303, 307, 308]);

class ProxyError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    // Reject leading zeros and shorthand forms; WHATWG URL normally
    // normalizes them, but fail closed if an odd literal slips through.
    if (!/^(?:0|[1-9]\d{0,2})$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value;
}

function cidr4(cidr: string): readonly [number, number] {
  const [base, bitsText] = cidr.split("/");
  const bits = Number(bitsText);
  const baseValue = ipv4ToInt(base);
  if (baseValue === null || !Number.isInteger(bits) || bits < 0 || bits > 32) {
    throw new Error(`Invalid IPv4 range: ${cidr}`);
  }
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  const start = (baseValue & mask) >>> 0;
  const end = (start | (~mask >>> 0)) >>> 0;
  return [start, end] as const;
}

const BLOCKED_IPV4_RANGES = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.0.2.0/24",
  "192.88.99.0/24",
  "192.168.0.0/16",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "224.0.0.0/4",
  "240.0.0.0/4",
].map(cidr4);

function isBlockedIpv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  if (value === null) return true;
  return BLOCKED_IPV4_RANGES.some(([start, end]) => value >= start && value <= end);
}

function expandIpv6(ip: string): number[] | null {
  const halves = ip.split("::");
  if (halves.length > 2) return null;

  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;

  if (halves.length === 1 && head.length !== 8) return null;
  if (halves.length === 2 && missing < 1) return null;

  const groups = [
    ...head,
    ...Array<string>(missing).fill("0"),
    ...tail,
  ];
  if (groups.length !== 8) return null;

  const out: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
    out.push(parseInt(group, 16));
  }
  return out;
}

function isBlockedIpv6(raw: string): boolean {
  let ip = raw.toLowerCase().split("%")[0];
  if (ip === "::" || ip === "::1") return true;

  // Catch dotted-quad embeddings such as ::ffff:127.0.0.1. Check the
  // embedded IPv4 first, then keep the IPv6 prefix checks below intact:
  // fe80::8.8.8.8 is still link-local even though 8.8.8.8 is public.
  const dotted = /(?:^|:)(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip);
  if (dotted) {
    if (isBlockedIpv4(dotted[1])) return true;
    const [a, b, c, d] = dotted[1].split(".").map(Number);
    const high = ((a << 8) | b).toString(16);
    const low = ((c << 8) | d).toString(16);
    ip = `${ip.slice(0, dotted.index)}:${high}:${low}`;
  }

  const groups = expandIpv6(ip);
  if (!groups) return true;

  // IPv4-mapped addresses in hex form: ::ffff:7f00:1.
  if (
    groups.slice(0, 5).every((group) => group === 0) &&
    groups[5] === 0xffff
  ) {
    const embedded = `${groups[6] >>> 8}.${groups[6] & 0xff}.${
      groups[7] >>> 8
    }.${groups[7] & 0xff}`;
    return isBlockedIpv4(embedded);
  }

  const first = groups[0];
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
  if ((first & 0xffc0) === 0xfec0) return true; // fec0::/10 site local
  if ((first & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (first === 0x2001 && groups[1] === 0x0db8) return true; // documentation
  if (first === 0x2001 && groups[1] === 0x0000) return true; // Teredo
  if (first === 0x2002) return true; // 6to4
  if (first === 0x0100 && groups[1] === 0) return true; // discard-only

  if (first === 0x0064 && groups[1] === 0xff9b) {
    // 64:ff9b::/96 embeds a public IPv4 address in the last 32 bits.
    // 64:ff9b:1::/48 is the local-use NAT64 prefix and is not routable.
    if (groups.slice(2, 6).some((group) => group !== 0)) return true;
    const embedded = `${groups[6] >>> 8}.${groups[6] & 0xff}.${
      groups[7] >>> 8
    }.${groups[7] & 0xff}`;
    return isBlockedIpv4(embedded);
  }
  return false;
}

function isBlockedHostname(host: string): boolean {
  const name = host.toLowerCase().replace(/\.$/, "");
  if (!name) return true;
  if (BLOCKED_HOSTS.has(name)) return true;
  return (
    name === "localhost" ||
    name.endsWith(".localhost") ||
    name.endsWith(".local") ||
    name.endsWith(".internal") ||
    name.endsWith(".home.arpa")
  );
}

async function lookupAddresses(
  host: string,
): Promise<Array<{ address: string; family: number }>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new ProxyError(504, "DNS lookup timed out")),
      DNS_TIMEOUT_MS,
    );
  });

  try {
    return await Promise.race([
      lookup(host, { all: true, verbatim: true }),
      timeout,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function assertPublicHost(host: string): Promise<void> {
  const bare =
    host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
  const literal = isIP(bare);

  if (literal === 4) {
    if (isBlockedIpv4(bare)) {
      throw new ProxyError(403, "Private or local addresses are blocked");
    }
    return;
  }
  if (literal === 6) {
    if (isBlockedIpv6(bare)) {
      throw new ProxyError(403, "Private or local addresses are blocked");
    }
    return;
  }
  if (isBlockedHostname(bare)) {
    throw new ProxyError(403, "Private or local addresses are blocked");
  }

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookupAddresses(bare);
  } catch (error) {
    if (error instanceof ProxyError) throw error;
    throw new ProxyError(502, "Could not resolve host");
  }
  if (!addresses.length) throw new ProxyError(502, "Could not resolve host");

  for (const address of addresses) {
    if (address.family === 4 && isBlockedIpv4(address.address)) {
      throw new ProxyError(403, "Private or local addresses are blocked");
    }
    if (address.family === 6 && isBlockedIpv6(address.address)) {
      throw new ProxyError(403, "Private or local addresses are blocked");
    }
  }
}

async function validatePublicUrl(raw: string): Promise<URL> {
  if (!raw || raw.length > MAX_URL_LENGTH) {
    throw new ProxyError(400, "Missing or oversized url");
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ProxyError(400, "Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ProxyError(400, "Only http(s) URLs are supported");
  }
  if (url.username || url.password) {
    throw new ProxyError(400, "Credentials in URLs are not allowed");
  }
  if (!url.hostname) throw new ProxyError(400, "Invalid URL");

  await assertPublicHost(url.hostname);
  return url;
}

function isTextContentType(value: string): boolean {
  const type = value.split(";")[0].trim().toLowerCase();
  if (!type || type === "text/event-stream") return false;
  if (type.startsWith("text/")) return true;
  if (type === "image/svg+xml" || type === "application/graphql") return true;
  return /^application\/(?:.+\+)?(?:json|xml|yaml|x-yaml|javascript|ecmascript|x-www-form-urlencoded)$/.test(
    type,
  );
}

function charsetFrom(contentType: string): string {
  return /charset\s*=\s*"?([^";\s]+)/i.exec(contentType)?.[1] ?? "utf-8";
}

async function readCapped(
  response: Response,
): Promise<{ text: string; truncated: boolean }> {
  if (!response.body) return { text: "", truncated: false };

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  let finished = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        finished = true;
        break;
      }
      if (!value) continue;

      if (total + value.byteLength > MAX_BYTES) {
        chunks.push(value.slice(0, MAX_BYTES - total));
        total = MAX_BYTES;
        truncated = true;
        break;
      }

      chunks.push(value);
      total += value.byteLength;
    }
  } finally {
    if (!finished) await reader.cancel().catch(() => {});
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const charset = charsetFrom(
    response.headers.get("content-type") ?? "",
  );
  let text: string;
  try {
    text = new TextDecoder(charset).decode(bytes);
  } catch {
    text = new TextDecoder("utf-8").decode(bytes);
  }
  return { text, truncated };
}

async function fetchText(
  start: URL,
  signal: AbortSignal,
): Promise<{ status: number; finalUrl: string; text: string; truncated: boolean }> {
  let current = start;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await fetch(current, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal,
      headers: {
        accept:
          "text/html, text/plain;q=0.9, application/json;q=0.8, */*;q=0.1",
        "user-agent": "PortfolioTerminal/1.0 (curl preview)",
      },
    });

    if (REDIRECTS.has(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new ProxyError(502, "Upstream redirect without Location");
      }
      if (hop === MAX_REDIRECTS) {
        throw new ProxyError(502, "Too many redirects");
      }

      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        throw new ProxyError(502, "Invalid redirect location");
      }
      current = await validatePublicUrl(next.href);
      if (response.body) await response.body.cancel().catch(() => {});
      continue;
    }

    if (response.status === 204 || response.status === 304) {
      return {
        status: response.status,
        finalUrl: current.href,
        text: "",
        truncated: false,
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!isTextContentType(contentType)) {
      if (response.body) await response.body.cancel().catch(() => {});
      throw new ProxyError(415, "Upstream response is not text");
    }

    const { text, truncated } = await readCapped(response);
    return {
      status: response.status,
      finalUrl: current.href,
      text,
      truncated,
    };
  }

  throw new ProxyError(502, "Too many redirects");
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
  if (!target) return textResponse(400, "Missing ?url=");

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
    if (error instanceof ProxyError) {
      return textResponse(error.status, error.message);
    }
    if (error instanceof Error && error.name === "AbortError") {
      return textResponse(504, "Upstream timed out");
    }
    return textResponse(502, "Upstream fetch failed");
  } finally {
    clearTimeout(timer);
  }
}
