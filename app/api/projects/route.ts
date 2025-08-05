// GET /api/projects — visible project folders for the Explorer.
// Public read only (RLS also enforces visible=true); owner/repo names stay
// backend fields and are never rendered directly by the Explorer.
import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabase
    .from("projects")
    .select(
      "id,repo_owner,repo_name,title_override,preview_url,preview_embeddable,orders,featured",
    )
    .eq("visible", true)
    .order("orders", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "projects unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { projects: data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
