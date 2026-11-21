// GET /api/projects — visible project folders + groups for the Explorer.
// Public read only (RLS also enforces visible=true); owner/repo names stay
// backend fields and are never rendered directly by the Explorer. The cached
// GitHub snapshot (github_cache) joins in for tags and counters — no GitHub
// request on the hot path (DOC/09 §1). A project's `description_override`
// (owner-written, resume-grade copy) wins over the auto README excerpt.
import { NextResponse } from "next/server";
import { getProjectsContent } from "@/lib/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const content = await getProjectsContent();
    return NextResponse.json(content, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "projects unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
