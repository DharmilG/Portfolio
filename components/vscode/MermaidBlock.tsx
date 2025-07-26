"use client";

// MermaidBlock — one fenced ```mermaid block inside MarkdownPreview.
// Mermaid is deliberately lazy: the multi-megabyte diagram engine is imported
// only after the first diagram mounts, and never during SSR. Rendering is
// serialized through a module-level queue (Mermaid's parser/render pipeline is
// global state), uses sanitized unique ids, and catches errors per block so one
// bad diagram cannot break the rest of the preview.
import { useEffect, useId, useRef, useState } from "react";

type MermaidApi = (typeof import("mermaid"))["default"];

type RenderState =
  | { status: "loading" }
  | { status: "ready"; svg: string }
  | { status: "error"; message: string };

let mermaidPromise: Promise<MermaidApi> | null = null;
let renderQueue: Promise<void> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = renderQueue.then(task, task);
  renderQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function token(root: CSSStyleDeclaration, name: string, fallback: string): string {
  return root.getPropertyValue(name).trim() || fallback;
}

function loadMermaid(): Promise<MermaidApi> {
  mermaidPromise ??= import("mermaid")
    .then(({ default: mermaid }) => {
      const root = getComputedStyle(document.documentElement);
      const font = token(
        root,
        "--font-vscode-ui",
        '"Segoe UI", system-ui, sans-serif',
      );
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        darkMode: true,
        htmlLabels: false,
        maxTextSize: 50_000,
        maxEdges: 500,
        suppressErrorRendering: true,
        fontFamily: font,
        themeVariables: {
          darkMode: true,
          background: token(root, "--color-vscode-editor", "#121314"),
          fontFamily: font,
          fontSize: "14px",
          primaryColor: token(root, "--color-vscode-widget-bg", "#252526"),
          primaryTextColor: token(root, "--color-vscode-fg", "#cccccc"),
          primaryBorderColor: token(root, "--color-vscode-widget-border", "#454545"),
          secondaryColor: token(root, "--color-vscode-side", "#181818"),
          secondaryTextColor: token(root, "--color-vscode-fg", "#cccccc"),
          secondaryBorderColor: token(root, "--color-vscode-border", "#2b2b2b"),
          tertiaryColor: token(root, "--color-vscode-tab", "#181818"),
          tertiaryTextColor: token(root, "--color-vscode-fg", "#cccccc"),
          tertiaryBorderColor: token(root, "--color-vscode-border", "#2b2b2b"),
          textColor: token(root, "--color-vscode-fg", "#cccccc"),
          lineColor: token(root, "--color-vscode-muted", "#9d9d9d"),
          defaultLinkColor: token(root, "--color-vscode-muted", "#9d9d9d"),
          mainBkg: token(root, "--color-vscode-widget-bg", "#252526"),
          nodeBorder: token(root, "--color-vscode-widget-border", "#454545"),
          clusterBkg: token(root, "--color-vscode-side", "#181818"),
          clusterBorder: token(root, "--color-vscode-border", "#2b2b2b"),
          edgeLabelBackground: token(root, "--color-vscode-editor", "#121314"),
          titleColor: token(root, "--color-vscode-fg", "#cccccc"),
        },
      });
      return mermaid;
    })
    .catch((error: unknown) => {
      // Let a later mount retry the lazy import instead of caching the failure.
      mermaidPromise = null;
      throw error;
    });
  return mermaidPromise;
}

function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return (
    raw
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean)
      ?.slice(0, 240) || "Invalid Mermaid diagram"
  );
}

type MermaidBlockProps = {
  code: string;
};

export default function MermaidBlock({ code }: MermaidBlockProps) {
  const reactId = useId();
  const sequence = useRef(0);
  const [state, setState] = useState<RenderState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const source = code.trim();
    if (!source) {
      setState({ status: "error", message: "Empty Mermaid diagram" });
      return;
    }

    const safeId = reactId.replace(/[^a-zA-Z0-9_-]/g, "") || "diagram";
    const id = `mermaid-${safeId}-${sequence.current++}`;
    setState({ status: "loading" });

    void enqueue(async () => {
      const mermaid = await loadMermaid();
      const { svg } = await mermaid.render(id, source);
      return svg;
    })
      .then((svg) => {
        if (!cancelled) setState({ status: "ready", svg });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: "error", message: errorMessage(error) });
        }
      })
      .finally(() => {
        // Mermaid can leave its temporary measuring node behind on failure.
        document.getElementById(id)?.remove();
        document.getElementById(`d${id}`)?.remove();
      });

    return () => {
      cancelled = true;
    };
  }, [code, reactId]);

  if (state.status === "loading") {
    return (
      <div className="mermaid-block mermaid-loading" role="status">
        Rendering diagram…
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mermaid-error" role="alert">
        <div className="mermaid-error-title">
          Unable to render Mermaid diagram
        </div>
        <div className="mermaid-error-message">{state.message}</div>
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <div
      className="mermaid-block"
      role="img"
      aria-label="Mermaid diagram"
      dangerouslySetInnerHTML={{ __html: state.svg }}
    />
  );
}
