"use client";

import * as React from "react";
import { AnimatedNumber } from "./animated-number";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: number;
  format?: "money" | "int";
  sub?: string;
  icon: React.ReactNode;
}

export function StatCard({ label, value, format = "int", sub, icon }: Props) {
  return (
    <div
      className={cn(
        "conic-ring relative isolate overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-soft transition-[transform,box-shadow,border-color] duration-300 ease-spring hover:-translate-y-1 hover:border-slate-300 hover:shadow-lift",
        "before:absolute before:inset-0 before:-z-[1] before:bg-gradient-to-br before:from-brand-500/[0.06] before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100",
      )}
    >
      <div className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
        <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-gradient-to-br from-brand-500/10 to-brand-500/5 text-brand-600">
          {icon}
        </span>
        {label}
      </div>
      <div className="text-[30px] font-bold leading-[1.1] tracking-tight text-slate-900 tabular-nums">
        <AnimatedNumber value={value} format={format} />
      </div>
      {sub && <div className="mt-1.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
