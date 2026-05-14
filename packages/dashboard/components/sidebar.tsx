"use client";

import * as React from "react";
import { LayoutDashboard, Package, RefreshCw, ArrowLeftRight, Zap } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { cn } from "@/lib/utils";
import { Switch } from "./ui/switch";

export type PageKey = "dashboard" | "products" | "subscriptions" | "transactions";

interface SidebarProps {
  page: PageKey;
  onPageChange: (p: PageKey) => void;
  testMode: boolean;
  onTestModeChange: (v: boolean) => void;
}

const NAV: { key: PageKey; label: string; Icon: React.ElementType }[] = [
  { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { key: "products", label: "Products", Icon: Package },
  { key: "subscriptions", label: "Subscriptions", Icon: RefreshCw },
  { key: "transactions", label: "Transactions", Icon: ArrowLeftRight },
];

export function Sidebar({ page, onPageChange, testMode, onTestModeChange }: SidebarProps) {
  return (
    <nav className="fixed inset-y-0 left-0 z-[100] flex w-[240px] flex-col overflow-hidden border-r border-white/5 bg-gradient-to-b from-[#0c1027] to-[#161b3d]">
      {/* Aurora wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(400px 200px at 20% 0%, rgba(99,91,255,0.20), transparent 60%), radial-gradient(500px 250px at 80% 100%, rgba(0,212,255,0.10), transparent 60%)",
        }}
      />

      {/* Brand */}
      <div className="relative flex items-center gap-3 border-b border-white/5 px-5 py-6">
        <div className="relative grid h-9 w-9 flex-shrink-0 place-items-center overflow-hidden rounded-[10px] bg-brand-gradient shadow-[0_6px_18px_-4px_rgba(99,91,255,0.6),inset_0_1px_0_rgba(255,255,255,0.25)]">
          <span
            aria-hidden="true"
            className="absolute -inset-0.5 animate-spin-slow opacity-50"
            style={{
              background:
                "conic-gradient(from 0deg, transparent, rgba(255,255,255,0.6), transparent 40%)",
            }}
          />
          <Zap className="relative z-[1] h-4 w-4 text-white drop-shadow" strokeWidth={2.5} fill="currentColor" />
        </div>
        <div className="relative">
          <h1 className="bg-gradient-to-b from-white to-[#c8cffb] bg-clip-text text-[17px] font-bold tracking-tight text-transparent">
            Pulse
          </h1>
          <p className="mt-0.5 text-[10.5px] tracking-wide text-[#9aa3c7]">
            Stablecoin Subscriptions
          </p>
        </div>
      </div>

      {/* Nav */}
      <div className="relative flex flex-1 flex-col gap-0.5 p-3">
        {NAV.map(({ key, label, Icon }) => {
          const active = page === key;
          return (
            <button
              key={key}
              data-active={active}
              onClick={() => onPageChange(key)}
              className={cn(
                "nav-rail relative flex w-full items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-left text-[13.5px] font-medium transition-colors duration-200 ease-soft",
                active
                  ? "bg-white/[0.08] text-white"
                  : "text-[#9aa3c7] hover:bg-white/[0.04] hover:text-[#e8ecff]",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-[#b6bdff]" : "opacity-85")} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="relative border-t border-white/5 px-3 py-4">
        <div className="mb-3 px-2">
          <ConnectButton
            chainStatus="icon"
            accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
            showBalance={{ smallScreen: false, largeScreen: false }}
          />
        </div>
        <div className="flex items-center justify-between gap-2 px-2">
          <span className="text-xs font-medium text-[#9aa3c7]">Test mode</span>
          <Switch checked={testMode} onCheckedChange={onTestModeChange} />
        </div>
      </div>
    </nav>
  );
}
