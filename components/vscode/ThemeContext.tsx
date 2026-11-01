"use client";

// ThemeContext.tsx — Global React Context managing VS Code Dark Modern & Light Modern themes.
// Synchronizes with Zustand store (lib/store.ts mode slice, persisted in localStorage),
// applies data-theme and class attributes to <html>, and updates the mobile theme-color meta tag.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useStore } from "@/lib/store";

export type ThemeMode = "dark" | "light";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize DOM attributes whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", mode);
    if (mode === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
    }

    // Update browser theme-color meta tag (top bar on mobile & PWA)
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", mode === "light" ? "#f8f8f8" : "#191a1b");
    }
  }, [mode]);

  // Debounced theme setter to protect against rapid double-clicks
  const setThemeDebounced = useCallback(
    (newMode: ThemeMode) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      setMode(newMode);
    },
    [setMode],
  );

  const toggleTheme = useCallback(() => {
    const nextMode = mode === "dark" ? "light" : "dark";
    setThemeDebounced(nextMode);
  }, [mode, setThemeDebounced]);

  const value = useMemo(
    () => ({
      theme: mode,
      setTheme: setThemeDebounced,
      toggleTheme,
      isDark: mode === "dark",
      isLight: mode === "light",
    }),
    [mode, setThemeDebounced, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}

