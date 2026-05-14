"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  /// "icon" → bare icon button, "pill" → bordered pill (used on marketing nav)
  variant?: "icon" | "pill";
}

export function ThemeToggle({ className, variant = "icon" }: Props) {
  const { resolvedTheme, toggle } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className={cn(
        "group relative grid place-items-center overflow-hidden rounded-lg transition-colors duration-200 ease-soft",
        variant === "icon"
          ? "h-9 w-9 text-muted-foreground hover:bg-accent hover:text-foreground"
          : "h-9 w-9 border border-border bg-card text-muted-foreground hover:text-foreground hover:border-brand-400",
        className,
      )}
    >
      <Sun
        className={cn(
          "absolute h-4 w-4 transition-all duration-500 ease-spring",
          mounted && isDark
            ? "rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100",
        )}
        strokeWidth={2}
      />
      <Moon
        className={cn(
          "absolute h-4 w-4 transition-all duration-500 ease-spring",
          mounted && isDark
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0",
        )}
        strokeWidth={2}
      />
    </button>
  );
}
