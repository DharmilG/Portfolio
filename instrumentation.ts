// instrumentation.ts — server-side observability. Registered once per server
// instance; production-only so local development stays quiet.
import { registerOTel } from "@vercel/otel";

export function register() {
  if (process.env.NODE_ENV !== "production") return;
  registerOTel("dharmil-portfolio");
}
