"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "archtivy-theme";
export type Theme = "light" | "dark";

/**
 * ── THE TOGGLE IS GONE, SO THE STORED VALUE HAS TO GO WITH IT ───────────────
 * ThemeToggle lived in TopNav and nowhere else. TopNav has been deleted and
 * HomeNav has no equivalent, so nothing in the product can set a theme any
 * more — the editorial palette is a single fixed cream ground with no dark
 * counterpart.
 *
 * That leaves one trap. Anyone who ever pressed the old toggle still has
 * `archtivy-theme: dark` in localStorage, and ~168 files still carry `dark:`
 * classes on surfaces this pass has not restyled. Honouring that stored value
 * would strand those users on a half-dark site with no control to undo it.
 *
 * So a stored "dark" is cleared on load rather than applied. The provider is
 * kept, not deleted: it is the seam a toggle would plug back into if one finds
 * a home in HomeNav, and deleting it would make that a bigger change than
 * re-adding a button.
 */
function clearStaleDarkPreference() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(STORAGE_KEY) === "dark") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    clearStaleDarkPreference();
    const stored = readStoredTheme();
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value: ThemeContextValue = { theme, setTheme };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
