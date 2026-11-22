"use client";

// Books — personal bookshelf and reading recommendations. The sections live in
// site_settings.books so the list can be edited in Supabase Studio without a
// deploy; this page only renders whatever is stored there.
import Image from "next/image";
import { useStore, type ProfileContent } from "@/lib/store";
import Codicon from "../Codicon";
import { PageShell } from "./PageShell";

type Book = {
  title: string;
  coverUrl: string;
};

type BookSection = {
  category: string;
  books: Book[];
};

type BooksContent = { sections: BookSection[] };

function readBooks(value: unknown): BookSection[] {
  if (!value || typeof value !== "object") return [];
  const sections = (value as BooksContent).sections;
  if (!Array.isArray(sections)) return [];
  return sections.filter(
    (section): section is BookSection =>
      Boolean(section) &&
      typeof section.category === "string" &&
      Array.isArray(section.books),
  );
}

export default function BooksPage({
  initialProfile,
}: {
  initialProfile?: ProfileContent | null;
}) {
  const storeContent = useStore((s) => s.profile);
  const content = initialProfile ?? storeContent;
  const sections = readBooks(content?.settings.books);

  return (
    <PageShell
      icon="book"
      iconClassName="text-[#e5ba7d]"
      title="Books"
      width="wide"
    >
      {!content ? (
        <p className="text-page-body text-vscode-dim">Loading books…</p>
      ) : sections.length === 0 ? (
        <div className="rounded-control border border-vscode-page-border bg-vscode-page-card p-6">
          <div className="flex items-center gap-2 text-page-body font-medium text-vscode-fg">
            <Codicon name="info" size={14} className="text-vscode-accent" />
            No books yet
          </div>
          <p className="mt-1.5 text-page-meta text-vscode-muted">
            Add a <code className="font-code">books</code> row in Supabase
            Studio to populate this page.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {sections.map((section, sectionIndex) => (
            <section key={section.category} className="space-y-4">
              <h2 className="text-page-body font-semibold uppercase tracking-wider text-vscode-fg-active">
                {section.category}
              </h2>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
                {section.books.map((book, bookIndex) => (
                  <div
                    key={book.title}
                    className="group flex flex-col overflow-hidden rounded-control border border-vscode-page-border bg-vscode-page-card transition-all duration-200 hover:border-vscode-accent/50 hover:bg-vscode-page-card-hover"
                  >
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-vscode-editor">
                      <Image
                        src={book.coverUrl}
                        alt={book.title}
                        fill
                        priority={sectionIndex === 0 && bookIndex === 0}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="flex min-h-[46px] items-center justify-center px-3 py-[5px] text-center">
                      <h3 className="text-page-body font-semibold text-vscode-fg-active">
                        {book.title}
                      </h3>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
