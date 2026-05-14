"use client";

import * as React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Bell, ChevronDown, Search, Check } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

interface TopbarProps {
  title: string;
  breadcrumb?: string;
  onOpenCommand: () => void;
}

const CHAINS = [
  { id: "base", label: "Base", color: "#0052ff" },
  { id: "optimism", label: "Optimism", color: "#ff0420" },
  { id: "arbitrum", label: "Arbitrum", color: "#28a0f0" },
  { id: "ethereum", label: "Ethereum", color: "#627eea" },
];

export function Topbar({ title, breadcrumb, onOpenCommand }: TopbarProps) {
  const [chainOpen, setChainOpen] = React.useState(false);
  const [chain, setChain] = React.useState(CHAINS[0]);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setChainOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-[80] flex h-16 items-center gap-3 border-b border-border bg-background/85 px-6 backdrop-blur-xl">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <span>Pulse</span>
          <span>/</span>
          <span className="text-foreground">{breadcrumb ?? title}</span>
        </div>
        <h1 className="truncate font-display text-[15px] font-bold tracking-tight text-foreground">
          {title}
        </h1>
      </div>

      <button
        onClick={onOpenCommand}
        className="ml-6 hidden h-9 w-[260px] items-center gap-2.5 rounded-lg border border-border bg-card px-3 text-[13px] text-muted-foreground transition-colors hover:border-brand-300 lg:flex"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search or jump to…</span>
        <kbd className="ml-auto rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {/* chain selector */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setChainOpen((o) => !o)}
            className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:border-brand-300"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: chain.color }}
            />
            <span className="hidden sm:inline">{chain.label}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          {chainOpen && (
            <div className="absolute right-0 top-11 w-48 animate-scale-in rounded-xl border border-border bg-popover p-1.5 shadow-lift">
              <p className="px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                Network
              </p>
              {CHAINS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setChain(c);
                    setChainOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors hover:bg-accent",
                    c.id === chain.id ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: c.color }}
                  />
                  {c.label}
                  {c.id === chain.id && (
                    <Check className="ml-auto h-3.5 w-3.5 text-brand-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          aria-label="Notifications"
          className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-brand-300 hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
        </button>

        <ThemeToggle variant="pill" />

        <div className="pl-1">
          <ConnectButton
            chainStatus="none"
            accountStatus={{ smallScreen: "avatar", largeScreen: "address" }}
            showBalance={false}
          />
        </div>
      </div>
    </header>
  );
}
