"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="relative w-9 h-9 flex items-center justify-center rounded-full border border-border bg-panel hover:border-accent/50 transition-colors"
    >
      {theme === "dark" ? (
        <Sun size={16} className="text-progress" />
      ) : (
        <Moon size={16} className="text-accent" />
      )}
    </button>
  );
}
