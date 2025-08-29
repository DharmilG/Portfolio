"use client";

// ThemeToggle.tsx — Elegant VS Code-styled Sun/Moon segmented pill toggle.
// Sits on the header/title bar to the left of Customize Layout.
// Uses rounded-control (5px radius), VS Code accent blue for the active indicator,
// seamless sliding transition, and debounced toggling.
import { useState } from "react";
import { LuMoon, LuSun } from "react-icons/lu";
import { useTheme } from "./ThemeContext";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isDebouncing, setIsDebouncing] = useState(false);
  const isLight = theme === "light";

  const handleSelect = (mode: "light" | "dark") => {
    if (theme === mode || isDebouncing) return;
    setIsDebouncing(true);
    setTheme(mode);
    setTimeout(() => {
      setIsDebouncing(false);
    }, 280);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Color Theme Switcher"
      title={isLight ? "Active: Light Modern (Click Moon for Dark Modern)" : "Active: Dark Modern (Click Sun for Light Modern)"}
      className="relative flex h-[24px] w-[50px] items-center rounded-control border border-vscode-border bg-vscode-input-bg/40 p-[2px] transition-colors"
    >
      {/* Seamless sliding active indicator pill with VS Code blue accent */}
      <span
        aria-hidden="true"
        className={`absolute top-[2px] bottom-[2px] w-[22px] rounded-control bg-vscode-accent shadow-sm transition-all duration-200 ease-out ${
          isLight ? "left-[2px]" : "left-[24px]"
        }`}
      />

      {/* Sun button (Light Theme) */}
      <button
        type="button"
        role="radio"
        aria-checked={isLight}
        aria-label="Switch to Light Theme"
        onClick={() => handleSelect("light")}
        className={`relative z-10 flex h-[20px] w-[22px] items-center justify-center rounded-control transition-colors duration-150 focus-visible:outline focus-visible:outline-1 focus-visible:outline-vscode-accent ${
          isLight
            ? "text-white"
            : "text-vscode-dim hover:text-vscode-fg"
        }`}
      >
        <LuSun size={13} className="shrink-0 transition-transform duration-200" />
      </button>

      {/* Moon button (Dark Theme) */}
      <button
        type="button"
        role="radio"
        aria-checked={!isLight}
        aria-label="Switch to Dark Theme"
        onClick={() => handleSelect("dark")}
        className={`relative z-10 flex h-[20px] w-[22px] items-center justify-center rounded-control transition-colors duration-150 focus-visible:outline focus-visible:outline-1 focus-visible:outline-vscode-accent ${
          !isLight
            ? "text-white"
            : "text-vscode-dim hover:text-vscode-fg"
        }`}
      >
        <LuMoon size={13} className="shrink-0 transition-transform duration-200" />
      </button>
    </div>
  );
}
