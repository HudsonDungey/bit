"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { AnimatedNumber } from "./animated-number";
import { Sparkline } from "./charts";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: number;
  format?: "money" | "int";
  sub?: string;
  icon: React.ReactNode;
  /// optional percentage delta vs. previous period
  delta?: number;
  /// optional sparkline series
  spark?: number[];
}

export function StatCard({ label, value, format = "int", sub, icon, delta, spark }: Props) {
  const up = (delta ?? 0) >= 0;
  return (
    <div
      className={cn(
        "conic-ring relative isolate overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft transition-[transform,box-shadow,border-color] duration-300 ease-spring hover:-translate-y-1 hover:border-brand-300 hover:shadow-lift",
        "before:absolute before:inset-0 before:-z-[1] before:bg-gradient-to-br before:from-brand-500/[0.06] before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100",
      )}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
          <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-gradient-to-br from-brand-500/15 to-brand-500/5 text-brand-600 dark:text-brand-300">
            {icon}
          </span>
          {label}
        </div>
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold",
              up
                ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/12 text-rose-600 dark:text-rose-400",
            )}
          >
            {up ? (
              <ArrowUpRight className="h-2.5 w-2.5" />
            ) : (
              <ArrowDownRight className="h-2.5 w-2.5" />
            )}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="font-display text-[30px] font-bold leading-[1.1] tracking-tight text-foreground tabular-nums">
        <AnimatedNumber value={value} format={format} />
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-3">
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        {spark && spark.length > 1 && (
          <Sparkline data={spark} className="max-w-[96px]" />
        )}
      </div>
    </div>
  );
}
