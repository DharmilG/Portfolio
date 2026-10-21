"use client";

// Contact — the way to reach me (DOC/04 §1). The email is copied to the
// clipboard on click; the links open in a new tab.
import { useState } from "react";
import { useStore } from "@/lib/store";
import Codicon from "../Codicon";
import { PageCard, PageShell } from "./PageShell";

export default function ContactPage() {
  const content = useStore((s) => s.profile);
  const pushToast = useStore((s) => s.pushToast);
  const [copied, setCopied] = useState(false);
  const data = content?.profile?.data ?? {};
  const email = String(data.email ?? "");
  const socials = content?.socials ?? [];
  const location = content?.profile?.location ?? "";

  const copy = async () => {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      pushToast("Email copied to the clipboard", "success");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      pushToast("Could not copy the email", "warning");
    }
  };

  return (
    <PageShell
      icon="mail"
      title="Contact"
      subtitle="Open to work, collaborations and interesting problems."
      footer="Prefer the terminal? `open --preview <url>` opens any link in the integrated browser."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <PageCard>
          <div className="text-[12px] text-vscode-dim">Email</div>
          {email ? (
            <div className="mt-1.5 flex items-center gap-2">
              <a
                href={`mailto:${email}`}
                className="truncate text-[14px] text-vscode-quick-match hover:underline"
              >
                {email}
              </a>
              <button
                type="button"
                onClick={copy}
                className="ml-auto flex h-6 shrink-0 items-center gap-1 rounded-control border border-vscode-page-border bg-vscode-page-chip px-2 text-[11px] text-vscode-muted hover:border-vscode-accent/60 hover:text-vscode-fg"
              >
                <Codicon name={copied ? "check" : "copy"} size={12} />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          ) : (
            <p className="mt-1.5 text-[13px] text-vscode-dim">
              Add your email to the profile ({"`profiles.data.email`"}) to show
              it here.
            </p>
          )}
          {location ? (
            <>
              <div className="mt-4 text-[12px] text-vscode-dim">Location</div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-vscode-fg">
                <Codicon name="location" size={13} className="text-vscode-dim" />
                {location}
              </div>
            </>
          ) : null}
        </PageCard>

        <PageCard>
          <div className="text-[12px] text-vscode-dim">Elsewhere</div>
          {socials.length === 0 ? (
            <p className="mt-1.5 text-[13px] text-vscode-dim">
              No links yet — add them to the <code>social_links</code> table.
            </p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {socials.map((social) => (
                <a
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-2 rounded-control px-1 py-1 text-[13px] text-vscode-fg hover:bg-vscode-page-card-hover"
                >
                  <Codicon name={social.icon} size={13} className="text-vscode-dim" />
                  <span className="truncate">{social.label}</span>
                  <Codicon
                    name="link-external"
                    size={11}
                    className="ml-auto text-vscode-dim"
                  />
                </a>
              ))}
            </div>
          )}
        </PageCard>
      </div>
    </PageShell>
  );
}
