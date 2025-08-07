// lib/allowlist.ts — every repo route must prove the repository is a visible
// project row before spending a GitHub request (DOC/09 §0).
import { supabase } from "@/lib/db";

export type AllowlistedProject = {
  id: string;
  repo_owner: string;
  repo_name: string;
  title_override: string | null;
  folder_slug: string;
};

export async function assertAllowlisted(
  owner: string,
  repo: string,
): Promise<AllowlistedProject> {
  const { data, error } = await supabase
    .from("projects")
    .select("id,repo_owner,repo_name,title_override,folder_slug")
    .eq("repo_owner", owner)
    .eq("repo_name", repo)
    .eq("visible", true)
    .maybeSingle();

  if (error) {
    throw Object.assign(new Error("project lookup failed"), { status: 503 });
  }
  if (!data) {
    throw Object.assign(new Error("repo not allowlisted"), { status: 404 });
  }
  return data as AllowlistedProject;
}
