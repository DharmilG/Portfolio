// POST /api/revalidate?repo=owner/name — protected by REVALIDATE_SECRET.
// Marks one repository's Next.js cache tag stale so the next request refreshes
// it (DOC/09 §6). Next 16 wants the two-argument revalidateTag.
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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

  const repo = new URL(request.url).searchParams.get("repo") ?? "";
  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repo)) {
    return NextResponse.json(
      { error: "invalid repo" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const tag = `repo:${repo}`;
  revalidateTag(tag, "max");
  return NextResponse.json(
    { revalidated: tag, at: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
