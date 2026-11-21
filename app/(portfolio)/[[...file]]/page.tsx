// Server page — loads the public portfolio content before hydration and hands
// it to the interactive client shell. The optional catch-all also gives each
// section a real URL (/about, /projects, ...) so metadata and canonical tags
// can be unique per page.
import type { Metadata } from "next";
import PortfolioShell from "@/components/vscode/PortfolioShell";
import { getProfileContent, getProjectsContent } from "@/lib/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SLUGS = new Set([
  "about",
  "resume",
  "experience",
  "education",
  "skills",
  "hackathons",
  "contact",
  "books",
  "projects",
  "certificates",
]);

const PAGE_TITLES: Record<string, string> = {
  about: "About",
  resume: "Resume",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  hackathons: "Hackathons",
  contact: "Contact",
  books: "Books",
  projects: "Projects",
  certificates: "Certificates",
};

function pageFromParams(file?: string[]): string {
  const slug = file?.[0] ?? "about";
  return PAGE_SLUGS.has(slug) ? slug : "about";
}

const DESCRIPTIONS: Record<string, string> = {
  about:
    "Dharmil Gajjar is a full-stack and backend engineer building with Go, Next.js, PostgreSQL and AWS.",
  projects:
    "Selected projects by Dharmil Gajjar: Go Commerce, Stock Direction Predictor, a VS Code-styled portfolio and more.",
  resume:
    "Resume, experience, education and skills of Dharmil Gajjar, full-stack and backend engineer.",
  books: "Books and reading recommendations from Dharmil Gajjar.",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ file?: string[] }>;
}): Promise<Metadata> {
  const { file } = await params;
  const page = pageFromParams(file);
  const title = PAGE_TITLES[page] ?? "About";
  const description =
    DESCRIPTIONS[page] ??
    `${title} — portfolio of Dharmil Gajjar, full-stack and backend engineer.`;
  return {
    // The root layout appends the site name through the title template.
    title,
    description,
    alternates: { canonical: page === "about" ? "/" : `/${page}` },
    openGraph: { title: `${title} — Dharmil Gajjar`, description, url: page === "about" ? "/" : `/${page}` },
  };
}

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ file?: string[] }>;
}) {
  const { file } = await params;
  const initialPage = pageFromParams(file);

  const [profile, projects] = await Promise.all([
    getProfileContent().catch(() => null),
    getProjectsContent().catch(() => null),
  ]);

  return (
    <PortfolioShell
      initialProfile={profile}
      initialProjects={projects}
      initialPage={initialPage}
    />
  );
}
