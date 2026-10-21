"use client";

// Contact — the way to reach me (DOC/04 §1). Email and phone are copied to
// the clipboard on click; the social links open in a new tab. Availability and
// location come from the profile, not from hardcoded copy.
import { useState } from "react";
import { useStore } from "@/lib/store";
import Codicon from "../Codicon";
import { PageCard, PageShell } from "./PageShell";

export default function ContactPage() {
  const content = useStore((s) => s.profile);
  const pushToast = useStore((s) => s.pushToast);
  const [copied, setCopied] = useState<"email" | "phone" | null>(null);
  const data = content?.profile?.data ?? {};
  const email = String(data.email ?? "");
  const phone = String(data.phone ?? "");
  const availability = String(data.availability ?? "");
  const socials = content?.socials ?? [];
  const location = content?.profile?.location ?? "";

  const copy = async (value: string, kind: "email" | "phone") => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      pushToast(
        `${kind === "email" ? "Email" : "Phone"} copied to the clipboard`,
        "success",
      );
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      pushToast(`Could not copy the ${kind}`, "warning");
    }
  };

  return (
    <PageShell
      icon="mail"
      title="Contact"
      subtitle={
        availability || "Open to work, collaborations and interesting problems."
      }
      footer="Prefer the terminal? `open --preview <url>` opens any link in the integrated browser."
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <PageCard>
          <div className="text-page-micro text-vscode-dim">Email</div>
          {email ? (
            <div className="mt-1.5 flex items-center gap-2">
              <a
                href={`mailto:${email}`}
                className="truncate text-page-body text-vscode-quick-match hover:underline"
              >
                {email}
              </a>
              <button
                type="button"
                onClick={() => copy(email, "email")}
                className="ml-auto flex h-6 shrink-0 items-center gap-1 rounded-control border border-vscode-page-border bg-vscode-page-chip px-2 text-page-micro text-vscode-muted hover:border-vscode-accent/60 hover:text-vscode-fg"
              >
                <Codicon
                  name={copied === "email" ? "check" : "copy"}
                  size={12}
                />
                {copied === "email" ? "Copied" : "Copy"}
              </button>
            </div>
          ) : (
            <p className="mt-1.5 text-page-body text-vscode-dim">
              Add your email to the profile ({"`profiles.data.email`"}) to show
              it here.
            </p>
          )}

          {phone ? (
            <>
              <div className="mt-4 text-page-micro text-vscode-dim">Phone</div>
              <div className="mt-1.5 flex items-center gap-2">
                <a
                  href={`tel:${phone.replace(/\s+/g, "")}`}
                  className="truncate text-page-body text-vscode-fg hover:underline"
                >
                  {phone}
                </a>
                <button
                  type="button"
                  onClick={() => copy(phone, "phone")}
                  className="ml-auto flex h-6 shrink-0 items-center gap-1 rounded-control border border-vscode-page-border bg-vscode-page-chip px-2 text-page-micro text-vscode-muted hover:border-vscode-accent/60 hover:text-vscode-fg"
                >
                  <Codicon
                    name={copied === "phone" ? "check" : "copy"}
                    size={12}
                  />
                  {copied === "phone" ? "Copied" : "Copy"}
                </button>
              </div>
            </>
          ) : null}

          {location ? (
            <>
              <div className="mt-4 text-page-micro text-vscode-dim">Location</div>
              <div className="mt-1.5 flex items-center gap-1.5 text-page-body text-vscode-fg">
                <Codicon name="location" size={13} className="text-vscode-dim" />
                {location}
              </div>
            </>
          ) : null}
        </PageCard>

        <PageCard>
          <div className="text-page-micro text-vscode-dim">Elsewhere</div>
          {socials.length === 0 ? (
            <p className="mt-1.5 text-page-body text-vscode-dim">
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
                  className="flex items-center gap-2 rounded-control px-1 py-1 text-page-body text-vscode-fg hover:bg-vscode-page-card-hover"
                >
                  <Codicon
                    name={social.icon}
                    size={13}
                    className="text-vscode-dim"
                  />
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
          {availability ? (
            <div className="mt-4 flex items-center gap-1.5 rounded-control bg-vscode-page-chip px-2.5 py-1.5 text-page-micro text-vscode-added">
              <Codicon name="circle-filled" size={10} />
              {availability}
            </div>
          ) : null}
        </PageCard>
      </div>
    </PageShell>
  );
}
