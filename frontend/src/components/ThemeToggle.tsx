"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/**
 * Theme toggle.
 *
 * The class on <html> is applied by a blocking inline script in layout.tsx,
 * BEFORE this component ever runs — see the comment there for why. This
 * component only reflects and changes that state.
 */
export function ThemeToggle() {
  // `mounted` guards against a hydration mismatch: the server has no idea what
  // is in the visitor's localStorage, so it cannot know which icon to render.
  // Rendering a neutral placeholder until after hydration keeps the server and
  // client markup identical.
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setMounted(true);
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private browsing can throw on localStorage writes. The toggle should
      // still work for this session rather than crashing the page.
    }
  };

  if (!mounted) {
    return <div className="size-9 rounded-lg" aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="grid size-9 place-items-center rounded-lg border border-border text-fg-muted transition-colors hover:bg-surface hover:text-fg"
      // The label states the ACTION, not the current state — "Switch to dark
      // theme" is unambiguous where "Dark theme" leaves a screen reader user
      // guessing whether it is a label or a status.
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
