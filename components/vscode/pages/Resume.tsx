"use client";

// Resume — the PDF resume (DOC/04 §3). The file lives in the public
// `resumes` storage bucket; `site_settings.resume` carries its URL. Until a
// PDF is uploaded the page explains how to add one instead of pretending.
import { useStore } from "@/lib/store";
import Codicon from "../Codicon";
import { PageShell } from "./PageShell";

type ResumeSetting = {
  url?: string | null;
  label?: string | null;
  updated_at?: string | null;
};

export default function ResumePage() {
  const content = useStore((s) => s.profile);
  const setting = (content?.settings?.resume ?? null) as ResumeSetting | null;
  const url = setting?.url ?? null;
  const label = setting?.label ?? "Resume (PDF)";
  const updated = setting?.updated_at ?? null;

  return (
    <PageShell
      icon="file-pdf"
      title="Resume"
      subtitle={
        url
          ? "Open it, download it, or keep reading while you browse the code."
          : "Your resume PDF is the one document that has to be uploaded by hand."
      }
      footer={
        updated
          ? `Last updated ${new Date(updated).toLocaleDateString()}`
          : "PDF served from the public `resumes` bucket in Supabase Storage."
      }
    >
      {url ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="flex h-7 items-center gap-1.5 rounded-control bg-vscode-accent px-3 text-[12px] text-vscode-badge-fg hover:bg-vscode-accent-hover"
            >
              <Codicon name="cloud-download" size={13} />
              Download {label}
            </a>
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="flex h-7 items-center gap-1.5 rounded-control border border-vscode-page-border bg-vscode-page-card px-3 text-[12px] text-vscode-fg hover:border-vscode-accent/60 hover:bg-vscode-page-card-hover"
            >
              <Codicon name="link-external" size={13} />
              Open in a new tab
            </a>
          </div>
          <div className="overflow-hidden rounded-control border border-vscode-page-border bg-vscode-page-card">
            <iframe
              src={url}
              title="Resume"
              className="h-[70vh] w-full bg-white"
            />
          </div>
        </div>
      ) : (
        <div className="rounded-control border border-vscode-page-border bg-vscode-page-card p-6">
          <div className="flex items-center gap-2 text-[13px] font-medium text-vscode-fg">
            <Codicon name="info" size={14} className="text-vscode-accent" />
            No resume uploaded yet
          </div>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[12px] leading-relaxed text-vscode-muted">
            <li>
              Upload the PDF to the public <code>resumes</code> bucket in
              Supabase Storage.
            </li>
            <li>
              Point <code>site_settings</code> key{" "}
              <code>resume</code> at it:{" "}
              <code>{`{"url": "https://…/resumes/your-file.pdf"}`}</code>.
            </li>
            <li>
              Reload — this page embeds the file and offers the download.
            </li>
          </ol>
        </div>
      )}
    </PageShell>
  );
}
