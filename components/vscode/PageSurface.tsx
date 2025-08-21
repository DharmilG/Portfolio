"use client";

// PageSurface — the editor surface for the portfolio pages. A `page` tab
// (kind: "page", path = the section slug) renders the matching designed
// page; anything else renders nothing (the FileViewer owns code tabs).
import { useStore } from "@/lib/store";
import AboutPage from "./pages/About";
import CertificatesPage from "./pages/Certificates";
import ContactPage from "./pages/Contact";
import EducationPage from "./pages/Education";
import ExperiencePage from "./pages/Experience";
import HackathonsPage from "./pages/Hackathons";
import ResumePage from "./pages/Resume";
import SkillsPage from "./pages/Skills";

export default function PageSurface() {
  const tabs = useStore((s) => s.tabs);
  const activeTabId = useStore((s) => s.activeTabId);
  const tab = tabs.find((t) => t.id === activeTabId);
  if (!tab || tab.kind !== "page") return null;

  switch (tab.path) {
    case "about":
      return <AboutPage />;
    case "resume":
      return <ResumePage />;
    case "certificates":
      return <CertificatesPage />;
    case "experience":
      return <ExperiencePage />;
    case "education":
      return <EducationPage />;
    case "skills":
      return <SkillsPage />;
    case "hackathons":
      return <HackathonsPage />;
    case "contact":
      return <ContactPage />;
    default:
      return null;
  }
}
