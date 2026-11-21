import type { MetadataRoute } from "next";

const BASE_URL = "https://info-dharmil-gajjar.vercel.app";

const PAGES = [
  "about",
  "resume",
  "projects",
  "experience",
  "education",
  "skills",
  "hackathons",
  "books",
  "contact",
  "certificates",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((page) => ({
    url: page === "about" ? BASE_URL : `${BASE_URL}/${page}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: page === "about" ? 1 : page === "projects" ? 0.9 : 0.7,
  }));
}
