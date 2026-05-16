"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AnimatedNumber } from "./animated-number";
import { cardVariants } from "@/lib/motion";

interface Props {
  label: string;
  value: number;
  format?: "money" | "int";
  sub?: string;
  icon: React.ReactNode;
}

/// Stripe-style metric card — label top-left, icon top-right, value full-width below.
/// Monochrome, no hover lift, no gradient pseudo, no sparkline.
export function StatCard({ label, value, format = "int", sub, icon }: Props) {
  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="enter"
      className="rounded-lg border border-border bg-card p-6 shadow-e1 transition-colors duration-fast hover:border-[hsl(var(--hairline-strong))]"
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground/60">{icon}</span>
      </div>
      <div className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground tabular-nums">
        <AnimatedNumber value={value} format={format} />
      </div>
      {sub && (
        <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
      )}
    </motion.div>
  );
}
