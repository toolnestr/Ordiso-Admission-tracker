"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

/**
 * Toggles the portal-scoped theme. The active theme lives as data-theme on the
 * nearest `.portal` wrapper (server-rendered from a cookie, so there's no
 * flash). Clicking flips the attribute live and persists the choice.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const el = document.querySelector<HTMLElement>(".portal");
    const current = (el?.dataset.theme as Theme) ?? "dark";
    setTheme(current);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const el = document.querySelector<HTMLElement>(".portal");
    if (el) el.dataset.theme = next;
    document.cookie = `ordiso-theme=${next}; path=/; max-age=31536000; samesite=lax`;
    setTheme(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="surface-2 grid h-9 w-9 place-items-center rounded-lg text-muted-strong transition-colors hover:bg-[var(--border)] hover:text-foreground"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" strokeWidth={1.8} />
      ) : (
        <Moon className="h-4 w-4" strokeWidth={1.8} />
      )}
    </button>
  );
}
