"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-[transform,box-shadow,background,color,filter] duration-200 ease-soft overflow-hidden isolate select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "btn-sheen bg-brand-gradient text-white shadow-brand hover:bg-brand-gradient-hover hover:-translate-y-px hover:shadow-brand-lg",
        outline:
          "bg-white border border-slate-200 text-slate-900 shadow-soft hover:border-brand-500 hover:text-brand-600 hover:-translate-y-px",
        danger:
          "bg-white border border-rose-200 text-rose-600 shadow-soft hover:bg-rose-50 hover:border-rose-500 hover:-translate-y-px",
        ghost: "hover:bg-slate-100 text-slate-700",
        link: "text-brand-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs rounded-md",
        lg: "h-11 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, children, onPointerDown, ...props }, ref) => {
    const tint =
      variant === "outline" || variant === "ghost" || variant === "link"
        ? "brand"
        : variant === "danger"
        ? "danger"
        : undefined;

    function spawnRipple(e: React.PointerEvent<HTMLButtonElement>) {
      const target = e.currentTarget;
      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.2;
      const span = document.createElement("span");
      span.className = "ripple-span";
      if (tint) span.dataset.tint = tint;
      span.style.width = span.style.height = size + "px";
      span.style.left = e.clientX - rect.left - size / 2 + "px";
      span.style.top = e.clientY - rect.top - size / 2 + "px";
      target.appendChild(span);
      window.setTimeout(() => span.remove(), 700);
      onPointerDown?.(e);
    }

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        onPointerDown={spawnRipple}
        {...props}
      >
        <span className="relative z-[2] inline-flex items-center gap-2">{children}</span>
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
