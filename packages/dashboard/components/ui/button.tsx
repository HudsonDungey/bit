"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium select-none transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Primary — solid, no gradient, no sheen
        default:
          "bg-foreground text-background hover:bg-foreground/90",
        // Brand — Stripe-style indigo (use sparingly, only for the single primary CTA on a page)
        brand:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        outline:
          "border border-border bg-card text-foreground hover:bg-accent hover:border-[hsl(var(--hairline-strong))]",
        danger:
          "border border-border bg-card text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.08)] hover:border-[hsl(var(--destructive)/0.5)]",
        ghost: "text-foreground hover:bg-accent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 text-sm",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-5 text-sm",
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
  ({ className, variant, size, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </button>
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
