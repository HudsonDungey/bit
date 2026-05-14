import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold leading-snug border border-transparent before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current before:opacity-90",
  {
    variants: {
      variant: {
        active: "bg-emerald-100 text-emerald-800 before:animate-pulse-dot",
        cancelled: "bg-rose-100 text-rose-700",
        completed: "bg-blue-100 text-blue-700",
        success: "bg-emerald-100 text-emerald-800",
        failed: "bg-rose-100 text-rose-700",
        inactive: "bg-slate-100 text-slate-500",
        test: "bg-amber-100 text-amber-700 before:hidden text-[10px] px-2 py-0.5",
      },
    },
    defaultVariants: { variant: "inactive" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

type StatusVariant = NonNullable<BadgeProps["variant"]>;
const STATUS_MAP: Record<string, StatusVariant> = {
  active: "active",
  cancelled: "cancelled",
  completed: "completed",
  success: "success",
  failed: "failed",
  inactive: "inactive",
};

export function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_MAP[status] ?? "inactive";
  return <Badge variant={variant}>{status}</Badge>;
}

export { Badge, badgeVariants };
