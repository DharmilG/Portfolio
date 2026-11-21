// GET /api/profile — the content behind the portfolio pages (About, Resume,
// Experience, Education, Skills, Hackathons, Contact). One public read of the
// anon tables; the browser never needs a service key and no GitHub request is
// spent (DOC/04 §5).
import { NextResponse } from "next/server";
import { getProfileContent } from "@/lib/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const content = await getProfileContent();
    return NextResponse.json(content, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "profile unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
