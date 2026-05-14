"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  id?: string;
  className?: string;
  "aria-label"?: string;
}

export function Switch({ checked, onCheckedChange, id, className, ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ease-soft outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
        checked
          ? "bg-brand-gradient shadow-[inset_0_1px_2px_rgba(0,0,0,0.1),0_0_12px_rgba(99,91,255,0.5)]"
          : "bg-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]",
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform duration-300 ease-spring",
          checked ? "translate-x-[18px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}
