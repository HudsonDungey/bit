import React from "react";
import type { ReactNode, MouseEventHandler } from "react";

type ButtonVariant = "primary" | "danger" | "ghost" | "outline" | "success";
type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-[var(--accent-blue)] hover:bg-blue-400 text-white",
  danger:  "bg-[var(--accent-red)] hover:bg-red-400 text-white",
  success: "bg-[var(--accent-green)] hover:opacity-80 text-black font-semibold",
  ghost:   "bg-transparent hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
  outline: "bg-transparent border border-[var(--border-bright)] hover:border-[var(--text-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "text-xs px-3 py-1.5 rounded-md",
  md: "text-sm px-4 py-2 rounded-lg",
  lg: "text-base px-6 py-2.5 rounded-lg",
};

export interface ButtonProps {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: MouseEventHandler;
  form?: string;
  title?: string;
  "aria-label"?: string;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading,
  icon,
  className = "",
  disabled,
  onClick,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center gap-2 font-medium transition-all ${variantStyles[variant]} ${sizeStyles[size]} ${
        disabled || loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...(rest as Record<string, unknown>)}
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeDashoffset="10" />
        </svg>
      ) : icon}
      {children}
    </button>
  );
}
