"use client";

// PageSurface — editor surface for portfolio pages.
// Mounts UnifiedResume for the continuous single-page scroll resume (About through Contact),
// BooksPage for the dedicated Books bookshelf, and ProjectsPage for the visual projects grid.
import { useStore } from "@/lib/store";
import BooksPage from "./pages/Books";
import CertificatesPage from "./pages/Certificates";
import ProjectsPage from "./pages/Projects";
import UnifiedResume from "./pages/UnifiedResume";

export default function PageSurface() {
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const tab = tabs.find((t) => t.id === activeTabId);
  if (!tab || tab.kind !== "page") return null;

  switch (tab.path) {
    case "about":
    case "resume":
    case "experience":
    case "education":
    case "skills":
    case "hackathons":
    case "contact":
      return <UnifiedResume />;
    case "books":
      return <BooksPage />;
    case "projects":
      return <ProjectsPage />;
    case "certificates":
      return <CertificatesPage />;
    default:
      return null;
  }
}
