import React from "react";
import type { ReactNode } from "react";

type BadgeVariant =
  | "green"
  | "red"
  | "yellow"
  | "blue"
  | "purple"
  | "gray";

const variants: Record<BadgeVariant, string> = {
  green:  "bg-green-900/40 text-green-400 border-green-700/50",
  red:    "bg-red-900/40 text-red-400 border-red-700/50",
  yellow: "bg-yellow-900/40 text-yellow-400 border-yellow-700/50",
  blue:   "bg-blue-900/40 text-blue-400 border-blue-700/50",
  purple: "bg-purple-900/40 text-purple-400 border-purple-700/50",
  gray:   "bg-slate-800 text-slate-400 border-slate-700",
};

const dotColors: Record<BadgeVariant, string> = {
  green:  "bg-green-400 animate-pulse",
  red:    "bg-red-400 animate-pulse",
  yellow: "bg-yellow-400 animate-pulse",
  blue:   "bg-blue-400 animate-pulse",
  purple: "bg-purple-400 animate-pulse",
  gray:   "bg-slate-400",
};

interface BadgeProps {
  children?: ReactNode;
  variant?: BadgeVariant;
  pulse?: boolean;
  className?: string;
}

export function Badge({ children, variant = "gray", pulse, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}
    >
      {pulse && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
}

export function BetStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    pending:  { variant: "yellow", label: "Pending" },
    placed:   { variant: "blue",   label: "Placed" },
    won:      { variant: "green",  label: "Won" },
    lost:     { variant: "red",    label: "Lost" },
    void:     { variant: "gray",   label: "Void" },
    cashout:  { variant: "purple", label: "Cashed Out" },
  };
  const cfg = map[status] || { variant: "gray" as BadgeVariant, label: status };
  return (
    <Badge variant={cfg.variant} pulse={status === "placed" || status === "pending"}>
      {cfg.label}
    </Badge>
  );
}

export function TriggerBadge({ reason }: { reason: string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    line_movement: { variant: "purple", label: "Line Move" },
    value_bet:     { variant: "blue",   label: "Value Bet" },
    arbitrage:     { variant: "green",  label: "Arbitrage" },
  };
  const cfg = map[reason] || { variant: "gray" as BadgeVariant, label: reason };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}
