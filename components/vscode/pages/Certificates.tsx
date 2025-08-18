"use client";

// Certificates — the credentials table (DOC/04 §1). Each card carries the
// issuer, the date, the credential id and a link to the issuer's page.
import { useStore } from "@/lib/store";
import Codicon from "../Codicon";
import { PageCard, PageShell } from "./PageShell";

export default function CertificatesPage() {
  const content = useStore((s) => s.profile);
  const certificates = content?.certificates ?? [];

  return (
    <PageShell
      icon="verified"
      title="Certificates"
      subtitle="Credentials I hold and where you can verify them."
      footer="Rows live in the `certificates` table — add them in Supabase Studio."
    >
      {certificates.length === 0 ? (
        <div className="rounded-control border border-vscode-page-border bg-vscode-page-card p-6">
          <div className="flex items-center gap-2 text-[13px] font-medium text-vscode-fg">
            <Codicon name="info" size={14} className="text-vscode-accent" />
            No certificates yet
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-vscode-muted">
            Add rows to the <code>certificates</code> table (title, issuer,
            issued_at, credential_id, url) and they appear here as cards.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {certificates.map((cert) => (
            <PageCard key={cert.id}>
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-vscode-activity-active-bg text-vscode-fg">
                  <Codicon name={cert.icon ?? "verified"} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-vscode-fg">
                    {cert.title}
                  </div>
                  <div className="mt-0.5 text-[12px] text-vscode-muted">
                    {cert.issuer}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-vscode-dim">
                    {cert.issued_at ? (
                      <span>
                        {new Date(cert.issued_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                        })}
                      </span>
                    ) : null}
                    {cert.credential_id ? (
                      <span className="font-code">{cert.credential_id}</span>
                    ) : null}
                  </div>
                  {cert.summary ? (
                    <p className="mt-2 text-[12px] leading-relaxed text-vscode-muted">
                      {cert.summary}
                    </p>
                  ) : null}
                  {cert.url ? (
                    <a
                      href={cert.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-3 inline-flex items-center gap-1 text-[11px] text-vscode-quick-match hover:underline"
                    >
                      <Codicon name="link-external" size={11} />
                      Verify
                    </a>
                  ) : null}
                </div>
              </div>
            </PageCard>
          ))}
        </div>
      )}
    </PageShell>
  );
}
