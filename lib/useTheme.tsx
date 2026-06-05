"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "night" | "day";

type ThemeCtx = {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
};

const Ctx = createContext<ThemeCtx>({
  theme: "night",
  toggle: () => {},
  setTheme: () => {},
});

const KEY = "devos-theme";

/**
 * DEV.OS day/night theme. Writes `data-theme` on <html> (so CSS + the
 * CelestialSky react), persists to localStorage, and broadcasts a
 * `devos:theme` window event so non-React listeners (e.g. rAF scenes) can
 * pick it up. Defaults to "night" on first paint to match SSR, then hydrates
 * the saved choice in an effect (no hydration mismatch).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("night");

  // hydrate saved choice after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as Theme | null;
      if (saved === "day" || saved === "night") setThemeState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  // reflect to <html> + broadcast (NO persist here — the initial render is
  // always 'night', so persisting in this effect would overwrite a saved 'day'
  // before the hydrate effect applies it. Persistence happens only on explicit
  // user change below).
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.dispatchEvent(new CustomEvent("devos:theme", { detail: theme }));
  }, [theme]);

  const persist = (t: Theme) => {
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* ignore */
    }
  };
  const setTheme = useCallback((t: Theme) => {
    persist(t);
    setThemeState(t);
  }, []);
  const toggle = useCallback(
    () =>
      setThemeState((t) => {
        const next = t === "night" ? "day" : "night";
        persist(next);
        return next;
      }),
    []
  );

  return <Ctx.Provider value={{ theme, toggle, setTheme }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
