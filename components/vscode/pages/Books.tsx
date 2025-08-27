"use client";

// Books — personal bookshelf and reading recommendations.
// Displays 3 books per section in responsive grid cards.
// Each card displays full-fit book cover in the card rectangle, with the book title
// centered in white letters with 5px padding top and bottom (rounded-control 5px radius).
import { PageShell } from "./PageShell";

type Book = {
  title: string;
  coverUrl: string;
};

type BookSection = {
  category: string;
  books: Book[];
};

const BOOK_SECTIONS: BookSection[] = [
  {
    category: "Distributed Systems & Systems Craft",
    books: [
      {
        title: "Designing Data-Intensive Applications",
        coverUrl: "https://covers.openlibrary.org/b/isbn/9781449373320-L.jpg",
      },
      {
        title: "Concurrency in Go",
        coverUrl: "https://covers.openlibrary.org/b/isbn/9781491941195-L.jpg",
      },
      {
        title: "The Pragmatic Programmer",
        coverUrl: "https://covers.openlibrary.org/b/isbn/9780135957059-L.jpg",
      },
    ],
  },
  {
    category: "Architecture & Engineering Habits",
    books: [
      {
        title: "Clean Code",
        coverUrl: "https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg",
      },
      {
        title: "System Design Interview",
        coverUrl: "https://covers.openlibrary.org/b/isbn/9798664653403-L.jpg",
      },
      {
        title: "Atomic Habits",
        coverUrl: "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg",
      },
    ],
  },
];

export default function BooksPage() {
  return (
    <PageShell
      icon="book"
      iconClassName="text-[#e5ba7d]"
      title="Books"
      width="wide"
    >
      <div className="space-y-10">
        {BOOK_SECTIONS.map((section) => (
          <section key={section.category} className="space-y-4">
            <h2 className="text-page-body font-semibold uppercase tracking-wider text-vscode-fg-active">
              {section.category}
            </h2>

            {/* 3 Books Per Section Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
              {section.books.map((book) => (
                <div
                  key={book.title}
                  className="group flex flex-col overflow-hidden rounded-control border border-vscode-page-border bg-vscode-page-card transition-all duration-200 hover:border-vscode-accent/50 hover:bg-vscode-page-card-hover"
                >
                  {/* Book Cover Image fitting the card rectangle */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#121314]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  {/* Centered book title in white with 5px top and bottom padding */}
                  <div className="flex min-h-[46px] items-center justify-center px-3 py-[5px] text-center">
                    <h3 className="text-page-body font-semibold text-white">
                      {book.title}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
