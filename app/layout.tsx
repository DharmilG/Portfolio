import type { Metadata, Viewport } from "next";
import "@vscode/codicons/dist/codicon.css";
import "@fontsource/cascadia-code/400.css";
import "@fontsource/cascadia-code/400-italic.css";
import "@fontsource/cascadia-code/700.css";
import "@fontsource/cascadia-code/700-italic.css";
import "@fontsource/fira-code/400.css";
import "./globals.css";
import { ThemeProvider } from "@/components/vscode/ThemeContext";

export const metadata: Metadata = {
  title: "Portfolio — Visual Studio Code",
  description: "A portfolio that looks and behaves exactly like VS Code.",
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
