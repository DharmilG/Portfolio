// POST /api/revalidate/content — invalidate every cached public content group
// after a Supabase Studio edit. Protected by REVALIDATE_SECRET; bypassing the
// five-minute TTL makes content changes visible on the next request.
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TAGS = [
  "profile-content",
  "profile",
  "site-settings",
  "books",
  "projects-content",
  "projects",
  "github-cache",
] as const;

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "revalidate not configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (request.headers.get("x-secret") !== secret) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  for (const tag of CONTENT_TAGS) {
    revalidateTag(tag, "max");
  }

  return NextResponse.json(
    { revalidated: [...CONTENT_TAGS], at: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
