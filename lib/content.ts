// lib/content.ts — server-side content loaders shared by the public Route
// Handlers and the server-rendered portfolio shell. Both use the anon Supabase
// client so RLS stays the single source of truth for `visible` rows.
import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/db";

export type CachedMetadata = {
  description?: string | null;
  readme?: string | null;
  readme_path?: string | null;
  readme_sha?: string | null;
  stars?: number;
  forks?: number;
  language?: string | null;
  languages?: Record<string, number>;
  tags?: string[];
  default_branch?: string;
  homepage?: string | null;
  updated_at?: string | null;
};

export async function getProfileContent() {
  const [profile, experiences, education, skills, socials, certificates, settings] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("name,avatar_url,bio,location,website,data,about")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("experiences")
        .select(
          "id,company,role,period,summary,highlights,phases,kind,tags,url,location,orders",
        )
        .eq("visible", true)
        .order("orders"),
      supabase
        .from("education")
        .select(
          "id,institution,degree,field,location,period,score,summary,url,orders",
        )
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

  const failed = [
    profile,
    experiences,
    education,
    skills,
    socials,
    certificates,
    settings,
  ]
    .filter((result) => result.error)
    .map((result) => result.error?.message);
  if (failed.length > 0) {
    throw Object.assign(new Error("profile unavailable"), { status: 502 });
  }

  const settingsMap: Record<string, unknown> = {};
  for (const row of settings.data ?? []) settingsMap[row.key] = row.value;

  return {
    profile: profile.data ?? null,
    experiences: experiences.data ?? [],
    education: education.data ?? [],
    skills: skills.data ?? [],
    socials: socials.data ?? [],
    certificates: certificates.data ?? [],
    settings: settingsMap,
  };
}

export async function getProjectsContent() {
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
    throw Object.assign(new Error("projects unavailable"), { status: 502 });
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
      description:
        project.description_override ??
        (fresh ? metadata?.readme : null) ??
        (fresh ? metadata?.description : null) ??
        null,
      readme_path: metadata?.readme_path ?? null,
      readme_sha: fresh ? (metadata?.readme_sha ?? null) : null,
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

  return { projects, groups: groups ?? [] };
}

// Public portfolio content changes rarely. These cached variants back the
// server page and public API routes; the raw loaders remain available to admin
// and sync code that must always read fresh data.
export const getProfileContentCached = unstable_cache(
  getProfileContent,
  ["profile-content"],
  {
    tags: ["profile", "site-settings", "books"],
    revalidate: 300,
  },
);

export const getProjectsContentCached = unstable_cache(
  getProjectsContent,
  ["projects-content"],
  {
    tags: ["projects", "github-cache"],
    revalidate: 300,
  },
);
