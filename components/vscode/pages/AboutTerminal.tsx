"use client";

// AboutTerminal — the About page as a small, self-contained terminal.
// It is deliberately not xterm: the transcript is regular DOM so the page
// links, project reveals, mail/phone and resume download stay accessible.
// The transcript lives in the session-only store slice, so opening Experience
// or Projects and coming back keeps the session intact.
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  ABOUT_TERMINAL_HINTS,
  completeAboutInput,
  runAboutCommand,
  terminalUser,
  type AboutTerminalAction,
  type AboutTerminalData,
  type AboutTerminalEffect,
  type AboutTerminalEntry,
  type AboutTerminalLine,
  type AboutTerminalTone,
} from "@/lib/about-terminal";
import { useStore } from "@/lib/store";
import Codicon from "../Codicon";

const TONE_CLASS: Record<AboutTerminalTone, string> = {
  default: "text-vscode-panel-fg",
  name: "font-semibold text-vscode-fg-active",
  dim: "text-vscode-dim",
  success: "text-vscode-term-green",
  warning: "text-vscode-modified",
  error: "text-vscode-error",
  accent: "text-vscode-term-blue",
};

let entrySeq = 0;

function nextEntryId(): string {
  entrySeq += 1;
  return `about-term-${Date.now()}-${entrySeq}`;
}

function Prompt({ user }: { user: string }) {
  return (
    <span className="shrink-0 select-none" aria-hidden="true">
      <span className="text-vscode-term-green">{user}@portfolio</span>
      <span className="text-vscode-dim">:</span>
      <span className="text-vscode-term-blue">~</span>
      <span className="text-vscode-dim">$</span>
    </span>
  );
}

function Line({ line }: { line: AboutTerminalLine }) {
  if (!line.text) return <div className="h-2" aria-hidden="true" />;
  return (
    <div
      className={`whitespace-pre-wrap break-words ${
        TONE_CLASS[line.tone ?? "default"]
      }`}
    >
      {line.text}
    </div>
  );
}

function ActionLink({
  action,
  index,
  onRun,
}: {
  action: AboutTerminalAction;
  index: number;
  onRun: (action: AboutTerminalAction) => void;
}) {
  const className =
    "cursor-pointer text-left text-vscode-markdown-link hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-vscode-accent";

  return (
    <span
      key={`${action.kind}-${index}-${action.label}`}
      className="inline-flex items-baseline gap-1.5"
    >
      <span aria-hidden="true" className="text-vscode-dim">
        ↳
      </span>
      {action.kind === "href" ? (
        <a
          href={action.href}
          target={action.external ? "_blank" : undefined}
          rel={action.external ? "noreferrer noopener" : undefined}
          download={action.download ? "" : undefined}
          className={className}
        >
          {action.label}
          {action.external ? (
            <span className="sr-only"> (opens in a new tab)</span>
          ) : null}
          {action.download ? (
            <span className="sr-only"> (downloads the PDF)</span>
          ) : null}
        </a>
      ) : (
        <button type="button" onClick={() => onRun(action)} className={className}>
          {action.label}
        </button>
      )}
    </span>
  );
}

function Entry({
  entry,
  user,
  onAction,
}: {
  entry: AboutTerminalEntry;
  user: string;
  onAction: (action: AboutTerminalAction) => void;
}) {
  return (
    <div>
      <div className="flex gap-2">
        <Prompt user={user} />
        <span className="min-w-0 whitespace-pre-wrap break-words text-vscode-panel-fg">
          {entry.command}
        </span>
      </div>
      {entry.lines.length > 0 ? (
        <div className="mt-1">
          {entry.lines.map((line, index) => (
            <Line key={index} line={line} />
          ))}
        </div>
      ) : null}
      {entry.actions.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {entry.actions.map((action, index) => (
            <ActionLink
              key={`${entry.id}-${action.kind}-${index}-${action.label}`}
              action={action}
              index={index}
              onRun={onAction}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function AboutTerminal({ data }: { data: AboutTerminalData }) {
  const entries = useStore((s) => s.aboutTerminalEntries);
  const history = useStore((s) => s.aboutTerminalHistory);
  const seededInStore = useStore((s) => s.aboutTerminalSeeded);
  const appendEntry = useStore((s) => s.appendAboutTerminal);
  const pushHistory = useStore((s) => s.pushAboutTerminalHistory);
  const markSeeded = useStore((s) => s.markAboutTerminalSeeded);
  const clearEntries = useStore((s) => s.clearAboutTerminal);
  const openTab = useStore((s) => s.openTab);
  const showView = useStore((s) => s.showView);
  const revealPath = useStore((s) => s.revealPath);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const seeded = useRef(false);
  const draftRef = useRef("");
  const [input, setInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);

  const user = terminalUser(data.name) || "user";

  const applyEffect = (effect: AboutTerminalEffect) => {
    if (effect.kind === "page") {
      openTab({ kind: "page", path: effect.path, sha: null });
      return;
    }
    showView("explorer");
    revealPath(effect.path);
  };

  const runAction = (action: AboutTerminalAction) => {
    if (action.kind === "page") {
      openTab({ kind: "page", path: action.path, sha: null });
    } else if (action.kind === "explorer") {
      showView("explorer");
      revealPath(action.path);
    }
  };

  const setPromptValue = (value: string, remember = false) => {
    setInput(value);
    if (remember) draftRef.current = value;
    requestAnimationFrame(() => {
      const element = inputRef.current;
      if (!element) return;
      element.setSelectionRange(value.length, value.length);
    });
  };

  const run = (raw: string) => {
    const command = raw.trim();
    if (!command) return;

    const result = runAboutCommand(command, data);
    pushHistory(command);
    setInput("");
    setHistoryIndex(-1);
    draftRef.current = "";

    if (result.clear) {
      clearEntries();
      return;
    }

    appendEntry({
      id: nextEntryId(),
      command,
      lines: result.lines,
      actions: result.actions,
    });

    if (result.effect) applyEffect(result.effect);
  };

  const clearSession = () => {
    clearEntries();
    setInput("");
    setHistoryIndex(-1);
    draftRef.current = "";
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  // Seed the first prompt once per session. Pages are unmounted while another
  // editor tab is active, but the store transcript keeps the session. The
  // store flag means a cleared terminal stays clear after a tab round-trip;
  // a full reload resets the flag and welcomes the visitor again.
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (seededInStore) return;
    markSeeded();
    if (entries.length > 0) return;

    const result = runAboutCommand("whoami", data);
    appendEntry({
      id: nextEntryId(),
      command: "whoami",
      lines: result.lines,
      actions: result.actions,
    });
  }, [appendEntry, data, entries.length, markSeeded, seededInStore]);

  // Keep the newest output visible without ever moving the page itself.
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [entries.length]);

  const handleHistory = (direction: -1 | 1) => {
    if (!history.length) return;
    if (direction === -1) {
      if (historyIndex === -1) {
        draftRef.current = input;
        const next = history.length - 1;
        setHistoryIndex(next);
        setPromptValue(history[next]);
      } else if (historyIndex > 0) {
        const next = historyIndex - 1;
        setHistoryIndex(next);
        setPromptValue(history[next]);
      }
      return;
    }
    if (historyIndex === -1) return;
    if (historyIndex < history.length - 1) {
      const next = historyIndex + 1;
      setHistoryIndex(next);
      setPromptValue(history[next]);
    } else {
      setHistoryIndex(-1);
      setPromptValue(draftRef.current);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      handleHistory(-1);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      handleHistory(1);
      return;
    }
    if (event.key === "Tab") {
      const completed = completeAboutInput(input);
      if (completed === input) return;
      event.preventDefault();
      setHistoryIndex(-1);
      setPromptValue(completed, true);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
      event.preventDefault();
      clearSession();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setHistoryIndex(-1);
      setPromptValue("", true);
    }
  };

  const focusFromSurface = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("a, button, input, textarea, select")) return;
    // Clicking to select transcript text should not steal the selection.
    if (window.getSelection()?.toString()) return;
    inputRef.current?.focus();
  };

  return (
    <section
      aria-label="About terminal"
      onClick={focusFromSurface}
      className="flex h-[min(62vh,560px)] min-h-[360px] flex-col overflow-hidden rounded-section border border-vscode-border bg-vscode-panel-bg"
    >
      <p id="about-terminal-shortcuts" className="sr-only">
        Type a command and press Enter. Use Up and Down to recall history, Tab
        to complete, and Control L to clear the transcript.
      </p>

      <div className="flex h-[35px] shrink-0 items-center justify-between border-b border-vscode-panel-tab-border bg-vscode-panel-bg pl-1 pr-1">
        <div className="relative flex h-full items-center gap-2 px-3 text-[11px] uppercase tracking-[0.01em] text-vscode-panel-tab-active">
          <Codicon name="terminal" size={16} />
          <span>About — interactive</span>
          <span className="absolute inset-x-[2px] bottom-0 h-px bg-vscode-accent" />
        </div>
        <button
          type="button"
          aria-label="Clear terminal transcript"
          title="Clear (Ctrl+L)"
          onClick={clearSession}
          className="flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-control text-vscode-muted transition-colors hover:bg-vscode-toolbar-hover hover:text-vscode-fg focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-vscode-accent"
        >
          <Codicon name="clear-all" size={16} />
        </button>
      </div>

      <div
        ref={scrollRef}
        role="log"
        tabIndex={0}
        aria-label="About terminal transcript"
        className="min-h-0 flex-1 cursor-text overflow-y-auto overscroll-contain px-4 py-4 font-term text-vscode-panel-fg focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-vscode-accent/60 sm:px-5"
      >
        <div className="space-y-4">
          {entries.map((entry) => (
            <Entry
              key={entry.id}
              entry={entry}
              user={user}
              onAction={runAction}
            />
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t border-vscode-panel-tab-border bg-vscode-panel-bg px-4 pb-3 pt-3 font-term sm:px-5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            run(input);
            inputRef.current?.focus();
          }}
        >
          <div className="flex min-w-0 items-center gap-2 border-l border-transparent pl-2 focus-within:border-vscode-accent">
            <Prompt user={user} />
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                draftRef.current = event.target.value;
                setHistoryIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              aria-label="Terminal command"
              aria-describedby="about-terminal-shortcuts about-terminal-hint"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="send"
              className="min-w-0 flex-1 bg-transparent text-vscode-panel-fg caret-vscode-terminal-cursor outline-none selection:bg-vscode-terminal-selection"
            />
          </div>
        </form>

        <div
          id="about-terminal-hint"
          role="group"
          aria-label="Suggested commands"
          className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-vscode-dim"
        >
          <span>try</span>
          {ABOUT_TERMINAL_HINTS.map((command) => (
            <span key={command} className="inline-flex items-center gap-2">
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => run(command)}
                className="cursor-pointer text-vscode-markdown-link hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-vscode-accent"
              >
                {command}
              </button>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
