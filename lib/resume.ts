// lib/resume.ts — one place that turns `site_settings.resume` into the public
// download URL. The PDF lives in the public `resumes` storage bucket; the
// setting stores the object path (not an absolute URL), so the same row works
// against the local stack and the cloud project.
export type ResumeSetting = {
  path?: string | null;
  url?: string | null;
  label?: string | null;
  updated_at?: string | null;
};

export function resumeSetting(value: unknown): ResumeSetting | null {
  if (!value || typeof value !== "object") return null;
  return value as ResumeSetting;
}

export function resumeUrl(value: unknown): string | null {
  const setting = resumeSetting(value);
  if (!setting) return null;
  if (setting.url) return setting.url;
  if (!setting.path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/resumes/${encodeURIComponent(setting.path)}`;
}

// `?download=` makes Supabase answer with Content-Disposition: attachment, so
// the browser saves the file instead of opening the PDF viewer.
export function resumeDownloadUrl(value: unknown): string | null {
  const url = resumeUrl(value);
  if (!url) return null;
  const setting = resumeSetting(value);
  return `${url}?download=${encodeURIComponent(setting?.label ?? "resume.pdf")}`;
}
