"use client";

// PageSurface — editor surface for portfolio pages.
// Mounts UnifiedResume for the continuous single-page scroll resume (About through Contact),
// BooksPage for the dedicated Books bookshelf, and ProjectsPage for the visual projects grid.
// Page modules are loaded on demand; only the active tab's bundle is fetched.
import dynamic from "next/dynamic";
import { useStore } from "@/lib/store";

function PageLoading() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-vscode-editor text-xs text-vscode-dim">
      Loading page…
    </div>
  );
}

const UnifiedResume = dynamic(() => import("./pages/UnifiedResume"), {
  ssr: false,
  loading: PageLoading,
});
const BooksPage = dynamic(() => import("./pages/Books"), {
  ssr: false,
  loading: PageLoading,
});
const ProjectsPage = dynamic(() => import("./pages/Projects"), {
  ssr: false,
  loading: PageLoading,
});
const CertificatesPage = dynamic(() => import("./pages/Certificates"), {
  ssr: false,
  loading: PageLoading,
});

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
