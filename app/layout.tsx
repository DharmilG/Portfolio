import type { Metadata, Viewport } from "next";
import "@vscode/codicons/dist/codicon.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portfolio — Visual Studio Code",
  description: "A portfolio that looks and behaves exactly like VS Code.",
};

export const viewport: Viewport = {
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
        <div className="flex h-screen">{children}</div>
      </body>
    </html>
  );
}
