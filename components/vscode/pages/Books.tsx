"use client";

// Books — personal bookshelf and reading recommendations.
// Displays 3 books per section in responsive grid cards.
// Each card displays book cover image, centered title in white letters,
// author, tag, and key engineering takeaways using rounded-control (5px radius).
import Image from "next/image";
import { PageShell } from "./PageShell";

type Book = {
  title: string;
  author: string;
  tag: string;
  coverUrl: string;
  takeaway: string;
};

type BookSection = {
  category: string;
  description: string;
  books: Book[];
};

const BOOK_SECTIONS: BookSection[] = [
  {
    category: "Distributed Systems & Systems Craft",
    description: "Foundational texts that shaped my approach to resilient architectures, concurrency, and data models.",
    books: [
      {
        title: "Designing Data-Intensive Applications",
        author: "Martin Kleppmann",
        tag: "Distributed Systems",
        coverUrl: "https://covers.openlibrary.org/b/isbn/9781449373320-L.jpg",
        takeaway:
          "Replication, partitioning, idempotency, and event-driven consistency in high-throughput Go backends.",
      },
      {
        title: "Concurrency in Go",
        author: "Katherine Cox-Buday",
        tag: "Backend & Go",
        coverUrl: "https://covers.openlibrary.org/b/isbn/9781491941195-L.jpg",
        takeaway:
          "Clean goroutine lifecycles, pipeline worker pools, backpressure, and race-free concurrent patterns.",
      },
      {
        title: "The Pragmatic Programmer",
        author: "Andrew Hunt & David Thomas",
        tag: "Engineering Craft",
        coverUrl: "https://covers.openlibrary.org/b/isbn/9780135957059-L.jpg",
        takeaway:
          'Where my habit of "testing what I ship" and owning end-to-end reliability from database schema to UI comes from.',
      },
    ],
  },
  {
    category: "Architecture & Engineering Habits",
    description: "Principles for clean code design, scalable system trade-offs, and disciplined software craft.",
    books: [
      {
        title: "Clean Code",
        author: "Robert C. Martin",
        tag: "Clean Architecture",
        coverUrl: "https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg",
        takeaway:
          "Self-documenting code, small focused functions, meaningful naming, and maintainable module boundaries.",
      },
      {
        title: "System Design Interview",
        author: "Alex Xu",
        tag: "System Design",
        coverUrl: "https://covers.openlibrary.org/b/isbn/9798664653403-L.jpg",
        takeaway:
          "Practical blueprints for scaling databases, caching layers, rate limiting, and asynchronous message queues.",
      },
      {
        title: "Atomic Habits",
        author: "James Clear",
        tag: "Mindset",
        coverUrl: "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg",
        takeaway:
          "Small daily compounding: writing one clean module, fixing one edge case, and shipping consistently.",
      },
    ],
  },
];

export default function BooksPage() {
  return (
    <PageShell
      icon="book"
      iconClassName="text-white"
      title="Books"
      width="wide"
    >
      <div className="space-y-10">
        {BOOK_SECTIONS.map((section) => (
          <section key={section.category} className="space-y-4">
            <div>
              <h2 className="text-page-body font-semibold uppercase tracking-wider text-vscode-fg-active">
                {section.category}
              </h2>
              <p className="mt-1 text-page-meta text-vscode-muted">
                {section.description}
              </p>
            </div>

            {/* 3 Books Per Section Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
              {section.books.map((book) => (
                <div
                  key={book.title}
                  className="flex flex-col items-center rounded-control border border-vscode-page-border bg-vscode-page-card p-5 text-center transition-colors hover:border-vscode-accent/50 hover:bg-vscode-page-card-hover"
                >
                  {/* Book Cover Image */}
                  <div className="relative h-56 w-38 shrink-0 overflow-hidden rounded-control border border-vscode-border/50 bg-[#121314] shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  {/* Book Title Centered in White */}
                  <h3 className="mt-4 text-page-body font-bold text-white text-center">
                    {book.title}
                  </h3>

                  {/* Author Centered */}
                  <div className="mt-1 text-page-meta text-vscode-muted text-center">
                    {book.author}
                  </div>

                  {/* Tag Badge Centered */}
                  <span className="mt-2.5 inline-flex items-center rounded-control border border-vscode-page-border bg-[#141516] px-2.5 py-0.5 text-page-micro font-medium text-vscode-quick-match">
                    {book.tag}
                  </span>

                  {/* Key Takeaway / Description */}
                  <p className="mt-3 text-page-meta leading-relaxed text-vscode-dim text-center">
                    {book.takeaway}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}

