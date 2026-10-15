import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portfolio — Visual Studio Code",
  description: "A portfolio that looks and behaves exactly like VS Code.",
};

export const viewport: Viewport = {
  themeColor: "#1e1e1e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      {/* #0f0f0f is the workbench backdrop (one-off); promote to a token on 2nd use */}
      <body className="bg-[#0f0f0f] font-vscode-ui text-vscode-fg antialiased">
        <div className="flex h-screen gap-2 p-2">{children}</div>
      </body>
    </html>
  );
}
