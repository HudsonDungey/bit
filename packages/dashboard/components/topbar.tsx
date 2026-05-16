"use client";

import * as React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ThemeToggle } from "@/components/theme-toggle";

interface TopbarProps {
  /// Kept for API compatibility with DashboardShell — title now lives in PageHeader.
  title?: string;
  onOpenCommand?: () => void;
}

export function Topbar(_: TopbarProps) {
  return (
    <header className="sticky top-0 z-[80] flex h-14 items-center gap-3 border-b border-border bg-background px-8">
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle variant="pill" />
        <ConnectButton
          chainStatus="icon"
          accountStatus={{ smallScreen: "avatar", largeScreen: "address" }}
          showBalance={false}
        />
      </div>
    </header>
  );
}
