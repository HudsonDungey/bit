import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";

const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/opportunities",
    label: "Opportunities",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    href: "/bets",
    label: "My Bets",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
];

interface SidebarProps {
  botStatus?: string;
}

export default function Sidebar({ botStatus }: SidebarProps) {
  const router = useRouter();

  const statusColor =
    botStatus === "running"
      ? "bg-[var(--accent-green)]"
      : botStatus === "paused"
      ? "bg-[var(--accent-yellow)]"
      : "bg-[var(--accent-red)]";

  return (
    <aside className="fixed left-0 top-0 h-full w-16 lg:w-56 bg-[var(--bg-secondary)] border-r border-[var(--border)] flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent-green)] flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-black">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <div className="hidden lg:block">
          <p className="text-sm font-bold text-[var(--text-primary)] leading-tight">Betr Sniper</p>
          <p className="text-xs text-[var(--text-muted)]">Odds Bot v1.0</p>
        </div>
      </div>

      {/* Bot status pill */}
      <div className="hidden lg:flex items-center gap-2 mx-3 mt-3 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor} ${botStatus === "running" ? "animate-pulse" : ""}`} />
        <span className="text-xs text-[var(--text-secondary)] capitalize">{botStatus || "stopped"}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const active = router.pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                active
                  ? "bg-[var(--accent-green)] bg-opacity-15 text-[var(--accent-green)] border border-[var(--accent-green)] border-opacity-30"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
              }`}
            >
              {item.icon}
              <span className="hidden lg:block text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="hidden lg:block px-4 py-3 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--text-muted)]">Powered by Betr API</p>
      </div>
    </aside>
  );
}
