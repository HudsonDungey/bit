import React from "react";
import type { ReactNode } from "react";

interface CardProps {
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export function Card({ children, className = "", onClick, hover }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-[var(--bg-card)] border border-[var(--border)] rounded-xl ${
        hover ? "hover:border-[var(--border-bright)] hover:bg-[var(--bg-card-hover)] cursor-pointer transition-all" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  color?: "green" | "red" | "blue" | "yellow" | "purple";
  icon?: ReactNode;
}

const colorMap: Record<string, string> = {
  green:  "var(--accent-green)",
  red:    "var(--accent-red)",
  blue:   "var(--accent-blue)",
  yellow: "var(--accent-yellow)",
  purple: "var(--accent-purple)",
};

export function StatCard({ label, value, sub, trend, color = "green", icon }: StatCardProps) {
  const c = colorMap[color];
  const trendArrow = trend === "up" ? "↑" : trend === "down" ? "↓" : null;
  const trendColor = trend === "up" ? "text-[var(--accent-green)]" : trend === "down" ? "text-[var(--accent-red)]" : "";

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold" style={{ color: c }}>{value}</p>
          {sub && (
            <p className={`text-xs mt-1 ${trendColor || "text-[var(--text-secondary)]"}`}>
              {trendArrow} {sub}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2 rounded-lg" style={{ background: `${c}20` }}>
            <span style={{ color: c }}>{icon}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
