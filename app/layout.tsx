import type { Metadata, Viewport } from "next";
import "@vscode/codicons/dist/codicon.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/cascadia-code/400.css";
import "@fontsource/cascadia-code/400-italic.css";
import "@fontsource/cascadia-code/700.css";
import "@fontsource/cascadia-code/700-italic.css";
import "@fontsource/fira-code/400.css";
import "./globals.css";
import { ThemeProvider } from "@/components/vscode/ThemeContext";

const SITE_URL = "https://info-dharmil-gajjar.vercel.app";
const SITE_NAME = "Dharmil Gajjar";
const SITE_DESCRIPTION =
  "Portfolio of Dharmil Gajjar — full-stack and backend engineer building with Go, Next.js, PostgreSQL and AWS. Projects, experience, skills and resume.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Full-stack & Backend Engineer`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: `${SITE_NAME} Portfolio`,
  keywords: [
    "Dharmil Gajjar",
    "full-stack engineer",
    "backend engineer",
    "Go developer",
    "Next.js developer",
    "PostgreSQL",
    "AWS",
    "portfolio",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: `${SITE_NAME} Portfolio`,
    title: `${SITE_NAME} — Full-stack & Backend Engineer`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Full-stack & Backend Engineer`,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
  category: "technology",
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: SITE_NAME,
      url: SITE_URL,
      jobTitle: "Full-stack & Backend Engineer",
      description: SITE_DESCRIPTION,
      sameAs: ["https://github.com/DharmilG", SITE_URL],
      knowsAbout: [
        "Go",
        "TypeScript",
        "Next.js",
        "PostgreSQL",
        "AWS",
        "Backend engineering",
      ],
    },
    {
      "@type": "ProfilePage",
      "@id": `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: `${SITE_NAME} — Full-stack & Backend Engineer`,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      mainEntity: { "@id": `${SITE_URL}/#person` },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: `${SITE_NAME} Portfolio`,
      publisher: { "@id": `${SITE_URL}/#person` },
    },
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#191a1b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem('vscode-local-v1');
                var mode = 'dark';
                if (stored) {
                  var parsed = JSON.parse(stored);
                  if (parsed && parsed.state && parsed.state.mode) {
                    mode = parsed.state.mode;
                  }
                }
                var doc = document.documentElement;
                doc.setAttribute('data-theme', mode);
                doc.classList.add(mode);
                if (mode === 'light') {
                  doc.classList.remove('dark');
                } else {
                  doc.classList.remove('light');
                }
              } catch (e) {}
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="bg-vscode-bg font-vscode-ui text-vscode-fg antialiased">
        <ThemeProvider>
          {/* h-dvh: stable on mobile (URL bar) — the shell never exceeds the
              viewport, panes own their scrolling (see globals.css). */}
          <div className="flex h-dvh min-h-0 min-w-0 overflow-hidden">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
