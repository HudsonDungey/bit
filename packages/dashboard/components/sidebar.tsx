"use client";

import * as React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Wallet,
  Package,
  RefreshCw,
  ArrowLeftRight,
  FlaskConical,
  BookOpen,
  Code2,
  Search,
  ChevronRight,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { Switch } from "./ui/switch";

export type PageKey =
  | "dashboard"
  | "payroll"
  | "products"
  | "subscriptions"
  | "transactions"
  | "testing";

interface SidebarProps {
  page: PageKey;
  onPageChange: (p: PageKey) => void;
  testMode: boolean;
  onTestModeChange: (v: boolean) => void;
  onOpenCommand: () => void;
}

const NAV: { key: PageKey; label: string; Icon: React.ElementType }[] = [
  { key: "dashboard", label: "Overview", Icon: LayoutDashboard },
  { key: "payroll", label: "Payroll", Icon: Wallet },
  { key: "products", label: "Products", Icon: Package },
  { key: "subscriptions", label: "Subscriptions", Icon: RefreshCw },
  { key: "transactions", label: "Transactions", Icon: ArrowLeftRight },
];

const DEV_NAV: { key: PageKey; label: string; Icon: React.ElementType }[] = [
  { key: "testing", label: "Testing Suite", Icon: FlaskConical },
];

const EXTERNAL: { href: string; label: string; Icon: React.ElementType }[] = [
  { href: "/docs", label: "Documentation", Icon: BookOpen },
  { href: "/dev", label: "Developer Portal", Icon: Code2 },
];

export function Sidebar({
  page,
  onPageChange,
  testMode,
  onTestModeChange,
  onOpenCommand,
}: SidebarProps) {
  return (
    <nav
      className="fixed inset-y-0 left-0 z-[100] flex w-[248px] flex-col overflow-hidden border-r border-white/5"
      style={{
        background:
          "linear-gradient(180deg, var(--sidebar-from), var(--sidebar-to))",
      }}
    >
      {/* aurora wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(420px 220px at 20% 0%, rgba(99,91,255,0.22), transparent 60%), radial-gradient(520px 260px at 80% 100%, rgba(10,132,255,0.12), transparent 60%)",
        }}
      />

      {/* brand */}
      <Link
        href="/"
        className="relative flex items-center gap-3 border-b border-white/5 px-5 py-5 transition-opacity hover:opacity-90"
      >
        <Logo size={34} subtitle="Onchain billing" />
      </Link>

      {/* command trigger */}
      <div className="relative px-3 pt-3">
        <button
          onClick={onOpenCommand}
          className="flex w-full items-center gap-2.5 rounded-lg border border-white/8 bg-white/[0.04] px-3 py-2 text-[13px] text-[#9aa3c7] transition-colors hover:border-white/15 hover:bg-white/[0.07]"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search…</span>
          <kbd className="ml-auto rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-[#9aa3c7]">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* nav */}
      <div className="scrollbar-none relative flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6b7398]">
          General
        </p>
        {NAV.map(({ key, label, Icon }) => (
          <NavButton
            key={key}
            active={page === key}
            label={label}
            Icon={Icon}
            onClick={() => onPageChange(key)}
          />
        ))}

        <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6b7398]">
          Developers
        </p>
        {DEV_NAV.map(({ key, label, Icon }) => (
          <NavButton
            key={key}
            active={page === key}
            label={label}
            Icon={Icon}
            onClick={() => onPageChange(key)}
          />
        ))}
        {EXTERNAL.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group nav-rail relative flex w-full items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-left text-[13.5px] font-medium text-[#9aa3c7] transition-colors duration-200 ease-soft hover:bg-white/[0.04] hover:text-[#e8ecff]"
          >
            <Icon className="h-4 w-4 shrink-0 opacity-85" />
            <span>{label}</span>
            <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
          </Link>
        ))}
      </div>

      {/* footer */}
      <div className="relative border-t border-white/5 px-3 py-4">
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2">
          <div>
            <div className="text-[12px] font-medium text-[#e8ecff]">Test mode</div>
            <div className="text-[10.5px] text-[#6b7398]">Accelerated executor</div>
          </div>
          <Switch checked={testMode} onCheckedChange={onTestModeChange} />
        </div>
        <div className="flex items-center gap-2.5 rounded-lg px-1 py-1">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-gradient text-[12px] font-bold text-white">
            P
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-semibold text-[#e8ecff]">
              Pulse Labs
            </div>
            <div className="truncate text-[10.5px] text-[#6b7398]">
              merchant workspace
            </div>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
        </div>
      </div>
    </nav>
  );
}

function NavButton({
  active,
  label,
  Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  Icon: React.ElementType;
  onClick: () => void;
}) {
  return (
    <button
      data-active={active}
      onClick={onClick}
      className={cn(
        "nav-rail relative flex w-full items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-left text-[13.5px] font-medium transition-colors duration-200 ease-soft",
        active
          ? "bg-white/[0.08] text-white"
          : "text-[#9aa3c7] hover:bg-white/[0.04] hover:text-[#e8ecff]",
      )}
    >
      <Icon
        className={cn("h-4 w-4 shrink-0", active ? "text-[#b6bdff]" : "opacity-85")}
      />
      <span>{label}</span>
    </button>
  );
}
