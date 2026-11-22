"use client";

// PageSurface — editor surface for portfolio pages.
// The active page receives the server-loaded content as props so its real
// content is present in the initial HTML (LCP/SEO), while the store still
// drives all client-side navigation afterward.
import { useStore, type ProfileContent } from "@/lib/store";
import BooksPage from "./pages/Books";
import CertificatesPage from "./pages/Certificates";
import ProjectsPage from "./pages/Projects";
import UnifiedResume from "./pages/UnifiedResume";

type ProjectsPayload = { projects?: unknown; groups?: unknown };

type PageSurfaceProps = {
  initialPage?: string;
  initialProfile?: ProfileContent | null;
  initialProjects?: ProjectsPayload | null;
};

export default function PageSurface({
  initialPage,
  initialProfile,
  initialProjects,
}: PageSurfaceProps) {
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const tab = tabs.find((t) => t.id === activeTabId);
  if (tab && tab.kind !== "page") return null;
  const path = tab?.kind === "page" ? tab.path : initialPage;
  if (!path) return null;

  switch (path) {
    case "about":
    case "resume":
    case "experience":
    case "education":
    case "skills":
    case "hackathons":
    case "contact":
      return <UnifiedResume initialProfile={initialProfile} />;
    case "books":
      return <BooksPage initialProfile={initialProfile} />;
    case "projects":
      return <ProjectsPage initialProjects={initialProjects} />;
    case "certificates":
      return <CertificatesPage initialProfile={initialProfile} />;
    default:
      return null;
  }
}
