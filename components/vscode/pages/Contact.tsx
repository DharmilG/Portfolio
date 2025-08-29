"use client";

// Contact — the way to reach me (DOC/04 §1). Email and phone are copied to
// the clipboard on click; the social links open in a new tab. Availability and
// location come from the profile, not from hardcoded copy.
import { useState } from "react";
import { BrandIcon } from "@/lib/iconThemes";
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
        `${kind === "email" ? "Email" : "Phone number"} ${value} copied to clipboard`,
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
      iconClassName="text-[#facc15]"
      title="Contact"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <PageCard className="p-5">
          <div className="text-page-micro font-medium text-vscode-dim">Email</div>
          {email ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <a
                href={`mailto:${email}`}
                className="truncate font-mono text-page-body font-medium text-vscode-quick-match hover:underline"
              >
                {email}
              </a>
              <button
                type="button"
                onClick={() => copy(email, "email")}
                className="flex shrink-0 items-center gap-1.5 rounded-control border border-vscode-page-border bg-vscode-page-chip px-3 py-1 text-page-micro text-vscode-fg transition-colors hover:border-vscode-accent/60 hover:bg-vscode-page-card-hover"
              >
                <Codicon
                  name={copied === "email" ? "check" : "copy"}
                  size={12}
                  className={copied === "email" ? "text-vscode-added" : "text-vscode-dim"}
                />
                <span>{copied === "email" ? "Copied" : "Copy"}</span>
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
              <div className="mt-5 text-page-micro font-medium text-vscode-dim">Phone</div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <a
                  href={`tel:${phone.replace(/\s+/g, "")}`}
                  className="truncate text-page-body font-medium text-vscode-fg-active hover:underline"
                >
                  {phone}
                </a>
                <button
                  type="button"
                  onClick={() => copy(phone, "phone")}
                  className="flex shrink-0 items-center gap-1.5 rounded-control border border-vscode-page-border bg-vscode-page-chip px-3 py-1 text-page-micro text-vscode-fg transition-colors hover:border-vscode-accent/60 hover:bg-vscode-page-card-hover"
                >
                  <Codicon
                    name={copied === "phone" ? "check" : "copy"}
                    size={12}
                    className={copied === "phone" ? "text-vscode-added" : "text-vscode-dim"}
                  />
                  <span>{copied === "phone" ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </>
          ) : null}

          {location ? (
            <>
              <div className="mt-5 text-page-micro font-medium text-vscode-dim">Location</div>
              <div className="mt-2 flex items-center gap-2 text-page-body text-vscode-fg">
                <Codicon name="location" size={14} className="text-vscode-dim" />
                <span>{location}</span>
              </div>
            </>
          ) : null}
        </PageCard>

        <PageCard className="p-5">
          <div className="text-page-micro font-medium text-vscode-dim">Elsewhere</div>
          {socials.length === 0 ? (
            <p className="mt-2 text-page-body text-vscode-dim">
              No links yet — add them to the <code>social_links</code> table.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {socials.map((social) => {
                const isGitHub = /github/i.test(social.label) || social.icon === "github";
                const isLinkedIn =
                  /linkedin/i.test(social.label) ||
                  social.icon === "linkedin" ||
                  social.icon === "globe";

                return (
                  <a
                    key={social.id}
                    href={social.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-3 rounded-control border border-vscode-page-border bg-vscode-page-chip px-4 py-2.5 text-page-body text-vscode-fg transition-colors hover:border-vscode-accent/60 hover:bg-vscode-page-card-hover"
                  >
                    {isGitHub ? (
                      <BrandIcon name="github" size={16} />
                    ) : isLinkedIn ? (
                      <BrandIcon name="linkedin" size={16} />
                    ) : (
                      <Codicon
                        name={social.icon}
                        size={15}
                        className="text-vscode-dim"
                      />
                    )}
                    <span className="truncate font-medium text-vscode-fg-active">
                      {social.label}
                    </span>
                    <Codicon
                      name="link-external"
                      size={13}
                      className="ml-auto text-vscode-dim"
                    />
                  </a>
                );
              })}
            </div>
          )}

          {availability ? (
            <div className="mt-4 flex items-center gap-2 rounded-control border border-emerald-600/30 bg-emerald-500/10 px-3.5 py-2.5 text-page-micro font-medium text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              <span>{availability}</span>
            </div>
          ) : null}
        </PageCard>
      </div>
    </PageShell>
  );
}
