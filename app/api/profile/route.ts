// GET /api/profile — the content behind the portfolio pages (About, Resume,
// Experience, Education, Skills, Hackathons, Contact). One public read of the
// anon tables; the browser never needs a service key and no GitHub request is
// spent (DOC/04 §5).
import { NextResponse } from "next/server";
import { getProfileContentCached } from "@/lib/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const content = await getProfileContentCached();
    return NextResponse.json(content, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "profile unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
