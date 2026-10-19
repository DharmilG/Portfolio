import type { Metadata, Viewport } from "next";
import "@vscode/codicons/dist/codicon.css";
import "@fontsource/cascadia-code/400.css";
import "@fontsource/cascadia-code/400-italic.css";
import "@fontsource/cascadia-code/700.css";
import "@fontsource/cascadia-code/700-italic.css";
import "@fontsource/fira-code/400.css";
import "./globals.css";

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
    <html lang="en" className="dark">
      <body className="bg-vscode-bg font-vscode-ui text-vscode-fg antialiased">
        {/* h-dvh: stable on mobile (URL bar) — the shell never exceeds the
            viewport, panes own their scrolling (see globals.css). */}
        <div className="flex h-dvh min-h-0 min-w-0 overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
