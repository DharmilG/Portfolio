"use client";

// MarkdownPreview — the read-only Markdown view mode inside the editor tab
// (DOC/10 §5). FileViewer passes the same content it shows in source (repo
// blob / drafts / edits / tmp), so toggling modes never refetches or loses a
// buffer. GFM + Mermaid fences render here; there is no split group or second
// tab strip.
import {
  Children,
  isValidElement,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import ReactMarkdown, {
  type Components,
  type Options,
} from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import "highlight.js/styles/github-dark.css";
import MermaidBlock from "./MermaidBlock";

const PREVIEW_LIMIT = 512 * 1024;

type Plugins = NonNullable<Options["remarkPlugins"]>;

const REMARK_PLUGINS: Plugins = [remarkGfm];
const REHYPE_PLUGINS: NonNullable<Options["rehypePlugins"]> = [
  rehypeSlug,
  [rehypeHighlight, { plainText: ["mermaid"], detect: false }],
];

function textOf(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textOf(node.props.children);
  }
  return "";
}

// react-markdown gives <pre> a <code> child. Mermaid is kept out of
// rehype-highlight via plainText, so its text is still intact here.
function mermaidCode(children: ReactNode): string | null {
  const child = Children.toArray(children).find(isValidElement);
  if (!child || child.type !== "code") return null;
  const props = child.props as { className?: unknown; children?: ReactNode };
  const className = typeof props.className === "string" ? props.className : "";
  if (!/(?:^|\s)language-mermaid(?:\s|$)/i.test(className)) return null;
  return textOf(props.children);
}

const COMPONENTS: Components = {
  pre({ children }) {
    const code = mermaidCode(children);
    if (code !== null) return <MermaidBlock code={code} />;
    return <pre>{children}</pre>;
  },
  a({ node: _node, href, children, ...props }) {
    const internal = href?.startsWith("#") ?? false;
    return (
      <a
        {...props}
        href={href}
        target={internal ? undefined : "_blank"}
        rel={internal ? undefined : "noreferrer noopener"}
        onClick={(e) => {
          if (!internal || !href) return;
          e.preventDefault();
          const id = decodeURIComponent(href.slice(1));
          document.getElementById(id)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }}
      >
        {children}
      </a>
    );
  },
  img({ node: _node, alt, ...props }) {
    return (
      <img
        {...props}
        alt={alt ?? ""}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    );
  },
};

type MarkdownPreviewProps = {
  path: string;
  content: string | undefined;
  dirty: "unsaved" | "saved" | null;
};

export default function MarkdownPreview({
  path,
  content,
  dirty,
}: MarkdownPreviewProps) {
  // 300ms debounce keeps typing responsive while diagrams are re-rendered.
  // startTransition is not needed: source and preview are separate trees.
  const [display, setDisplay] = useState<string | undefined>(content);
  useEffect(() => {
    if (content === undefined) {
      setDisplay(undefined);
      return;
    }
    const timer = window.setTimeout(() => setDisplay(content), 300);
    return () => window.clearTimeout(timer);
  }, [content]);

  const preview = display ?? content;
  const tooLarge = preview !== undefined && preview.length > PREVIEW_LIMIT;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-vscode-editor">
      {dirty ? (
        <div className="flex h-[22px] shrink-0 items-center gap-1.5 border-b border-vscode-border bg-vscode-side px-3 text-[11px] text-vscode-muted">
          <span>
            {dirty === "unsaved"
              ? "Previewing unsaved edits"
              : "Previewing local edits"}
          </span>
          <span className="text-vscode-modified">●</span>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto">
        {preview === undefined ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-xs text-vscode-dim">
            Loading file…
          </div>
        ) : tooLarge ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-xs text-vscode-dim">
            This file is too large to preview (max 512 KB).
          </div>
        ) : (
          <article
            className="markdown-body mx-auto w-full max-w-[860px] px-10 py-8"
            aria-label={`Preview ${path}`}
          >
            <ReactMarkdown
              remarkPlugins={REMARK_PLUGINS}
              rehypePlugins={REHYPE_PLUGINS}
              components={COMPONENTS}
            >
              {preview}
            </ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
}
