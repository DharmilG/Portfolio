// GET /api/projects — visible project folders + groups for the Explorer.
// Public read only (RLS also enforces visible=true); owner/repo names stay
// backend fields and are never rendered directly by the Explorer. The cached
// GitHub snapshot (github_cache) joins in for tags and counters — no GitHub
// request on the hot path (DOC/09 §1). A project's `description_override`
// (owner-written, resume-grade copy) wins over the auto README excerpt.
import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CachedMetadata = {
  description?: string | null;
  readme?: string | null;
  stars?: number;
  forks?: number;
  language?: string | null;
  languages?: Record<string, number>;
  tags?: string[];
  default_branch?: string;
  homepage?: string | null;
  updated_at?: string | null;
};

export async function GET() {
  const [
    { data, error },
    { data: groups, error: groupsError },
    { data: cache },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id,repo_owner,repo_name,title_override,description_override,group_slug,highlights,tags,preview_url,preview_embeddable,orders,featured",
      )
      .eq("visible", true)
      .order("orders", { ascending: true }),
    supabase
      .from("project_groups")
      .select("id,slug,title,description,highlights,icon,orders,featured")
      .eq("visible", true)
      .order("orders", { ascending: true }),
    supabase
      .from("github_cache")
      .select("repo_full_name,branch,sha,metadata,expires_at"),
  ]);

  if (error || groupsError) {
    return NextResponse.json(
      { error: "projects unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  const byRepo = new Map(
    (cache ?? []).map((row) => [row.repo_full_name as string, row]),
  );

  const projects = (data ?? []).map((project) => {
    const key = `${project.repo_owner}/${project.repo_name}`;
    const snapshot = byRepo.get(key);
    const metadata = (snapshot?.metadata ?? null) as CachedMetadata | null;
    const fresh = Boolean(
      snapshot?.expires_at &&
        new Date(snapshot.expires_at).getTime() > Date.now(),
    );
    return {
      ...project,
      // Owner-written copy wins, then the README excerpt, then the GitHub
      // repository description.
      description:
        project.description_override ??
        (fresh ? metadata?.readme : null) ??
        (fresh ? metadata?.description : null) ??
        null,
      highlights: project.highlights ?? [],
      group_slug: project.group_slug ?? null,
      tags: (fresh ? metadata?.tags : null) ?? project.tags ?? [],
      stars: (fresh ? metadata?.stars : 0) ?? 0,
      forks: (fresh ? metadata?.forks : 0) ?? 0,
      language: (fresh ? metadata?.language : null) ?? null,
      languages: (fresh ? metadata?.languages : null) ?? {},
      branch:
        (fresh ? snapshot?.branch : null) ??
        metadata?.default_branch ??
        "main",
      sha: (fresh ? snapshot?.sha : null) ?? null,
    };
  });

  return NextResponse.json(
    { projects, groups: groups ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
