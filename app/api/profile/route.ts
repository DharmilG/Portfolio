// GET /api/profile — the content behind the portfolio pages (About, Resume,
// Certificates, Experience, Skills, Contact). One public read of the anon
// tables; the browser never needs a service key and no GitHub request is
// spent (DOC/04 §5).
import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [profile, experiences, skills, socials, certificates, settings] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("name,avatar_url,bio,location,website,data")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("experiences")
        .select("id,company,role,period,summary,orders")
        .eq("visible", true)
        .order("orders"),
      supabase
        .from("skills")
        .select("id,category,items,orders")
        .eq("visible", true)
        .order("orders"),
      supabase
        .from("social_links")
        .select("id,label,url,icon,orders")
        .eq("visible", true)
        .order("orders"),
      supabase
        .from("certificates")
        .select(
          "id,title,issuer,issued_at,credential_id,url,summary,icon,orders",
        )
        .eq("visible", true)
        .order("orders"),
      supabase.from("site_settings").select("key,value"),
    ]);

  const failed = [profile, experiences, skills, socials, certificates, settings]
    .filter((r) => r.error)
    .map((r) => r.error?.message);
  if (failed.length > 0) {
    return NextResponse.json(
      { error: "profile unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  const settingsMap: Record<string, unknown> = {};
  for (const row of settings.data ?? []) settingsMap[row.key] = row.value;

  return NextResponse.json(
    {
      profile: profile.data ?? null,
      experiences: experiences.data ?? [],
      skills: skills.data ?? [],
      socials: socials.data ?? [],
      certificates: certificates.data ?? [],
      settings: settingsMap,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
