"use client";

// Resume — download only (no embedded viewer). The PDF lives in the public
// `resumes` bucket; `site_settings.resume` stores its object path, so the same
// row resolves against the local stack and the cloud project. `?download=`
// makes the response an attachment.
import { useStore } from "@/lib/store";
import {
  resumeDownloadUrl,
  resumeSetting,
  resumeUrl,
} from "@/lib/resume";
import Codicon from "../Codicon";
import { PageSection, PageShell } from "./PageShell";

export default function ResumePage() {
  const content = useStore((s) => s.profile);
  const openTab = useStore((s) => s.openTab);
  const setting = resumeSetting(content?.settings?.resume);
  const url = resumeUrl(content?.settings?.resume);
  const download = resumeDownloadUrl(content?.settings?.resume);
  const label = setting?.label ?? "Resume (PDF)";
  const updated = setting?.updated_at ?? null;

  const openPage = (slug: string) =>
    openTab({ kind: "page", path: slug, sha: null });

  return (
    <PageShell
      icon="file-pdf"
      title="Resume"
      subtitle="One page, the whole story — grab the PDF, or read the same details across these pages."
      footer="PDF served from the public `resumes` bucket in Supabase Storage — never committed to git."
    >
      {url && download ? (
        <div className="rounded-control border border-vscode-page-border bg-vscode-page-card p-6">
          <div className="flex flex-wrap items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-vscode-activity-active-bg text-vscode-accent">
              <Codicon name="file-pdf" size={24} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-medium text-vscode-fg-active">
                {label}
              </div>
              <div className="mt-1 text-[12px] text-vscode-muted">
                PDF
                {updated
                  ? ` · updated ${new Date(updated).toLocaleDateString(
                      undefined,
                      { year: "numeric", month: "short", day: "numeric" },
                    )}`
                  : ""}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a
                  href={download}
                  className="flex h-7 items-center gap-1.5 rounded-control bg-vscode-accent px-3 text-[12px] text-vscode-badge-fg hover:bg-vscode-accent-hover"
                >
                  <Codicon name="cloud-download" size={13} />
                  Download resume
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
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-control border border-vscode-page-border bg-vscode-page-card p-6">
          <div className="flex items-center gap-2 text-[13px] font-medium text-vscode-fg">
            <Codicon name="info" size={14} className="text-vscode-accent" />
            The PDF is not uploaded yet
          </div>
          <p className="mt-2 max-w-[70ch] text-[12px] leading-relaxed text-vscode-muted">
            Upload <code>private/</code> to the public <code>resumes</code>{" "}
            bucket and point <code>site_settings.resume</code> at it:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-control bg-vscode-editor px-3 py-2 font-code text-[11px] text-vscode-fg">
            node scripts/upload-resume.mjs
          </pre>
          <p className="mt-2 text-[11px] leading-relaxed text-vscode-dim">
            The script uploads the PDF and writes{" "}
            <code>{`{"path","label","updated_at"}`}</code> into the setting — run
            it again after a <code>supabase db reset</code>.
          </p>
        </div>
      )}

      <PageSection title="Prefer reading it here?">
        <p className="max-w-[70ch] text-[13px] leading-relaxed text-vscode-muted">
          Everything on the resume has a page in this workspace.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { slug: "experience", label: "Experience", icon: "briefcase" },
            { slug: "education", label: "Education", icon: "mortar-board" },
            { slug: "skills", label: "Skills", icon: "code" },
            { slug: "hackathons", label: "Hackathons", icon: "trophy" },
          ].map((page) => (
            <button
              key={page.slug}
              type="button"
              onClick={() => openPage(page.slug)}
              className="flex h-7 items-center gap-1.5 rounded-control border border-vscode-page-border bg-vscode-page-card px-3 text-[12px] text-vscode-fg hover:border-vscode-accent/60 hover:bg-vscode-page-card-hover"
            >
              <Codicon name={page.icon} size={13} />
              {page.label}
            </button>
          ))}
        </div>
      </PageSection>
    </PageShell>
  );
}
