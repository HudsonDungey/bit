import React, { useState, useEffect, useCallback } from "react";
import { Card } from "../components/ui/Card";
import { Badge, BetStatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import type { BetrBet } from "../lib/types";
import { formatCurrency, formatOdds } from "../lib/odds-utils";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type StatusFilter = "all" | "placed" | "pending" | "won" | "lost" | "void";

export default function BetsPage() {
  const [bets, setBets] = useState<BetrBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [autoOnly, setAutoOnly] = useState(false);

  const fetchBets = useCallback(async () => {
    try {
      const res = await fetch("/api/bot/status");
      const json = await res.json();
      if (json.success) {
        setBets(json.data.state.active_bets);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBets();
    const interval = setInterval(fetchBets, 5000);
    return () => clearInterval(interval);
  }, [fetchBets]);

  const filtered = bets.filter((b) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (autoOnly && !b.auto_placed) return false;
    return true;
  });

  // Aggregated stats
  const total_staked  = bets.reduce((s, b) => s + b.stake, 0);
  const total_returns = bets.filter(b => b.status === "won").reduce((s, b) => s + b.potential_return, 0);
  const pl = bets.reduce((s, b) => s + (b.profit_loss || 0), 0);
  const won  = bets.filter(b => b.status === "won").length;
  const lost = bets.filter(b => b.status === "lost").length;

  const statusCounts: Record<string, number> = { all: bets.length };
  for (const b of bets) statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Bets</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">All bets placed by the bot and manually</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchBets}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.1"/></svg>}>
          Refresh
        </Button>
      </div>

      {/* P&L summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">Total Bets</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{bets.length}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{won}W / {lost}L</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">Total Staked</p>
          <p className="text-2xl font-bold text-[var(--accent-blue)]">{formatCurrency(total_staked)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">Returns</p>
          <p className="text-2xl font-bold text-[var(--accent-green)]">{formatCurrency(total_returns)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">P&L</p>
          <p className={`text-2xl font-bold ${pl >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}>
            {pl >= 0 ? "+" : ""}{formatCurrency(pl)}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
          {(["all", "placed", "pending", "won", "lost", "void"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
                statusFilter === s
                  ? "bg-[var(--accent-green)] text-black"
                  : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {s} ({statusCounts[s] || 0})
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            checked={autoOnly}
            onChange={(e) => setAutoOnly(e.target.checked)}
            className="accent-[var(--accent-green)]"
          />
          Bot bets only
        </label>
      </div>

      {/* Bets table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-green)] border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center h-48 gap-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={1.5} className="w-12 h-12">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
          </svg>
          <p className="text-[var(--text-muted)] text-sm">No bets found for the selected filters</p>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((bet) => (
              <BetMobileCard key={bet.id} bet={bet} />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {["Event", "Selection", "Market", "Odds", "Stake", "Return", "P&L", "Status", "Source", "Placed"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-[var(--text-muted)] font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((bet) => {
                    const pl = bet.profit_loss;
                    return (
                      <tr key={bet.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg-secondary)] transition-colors">
                        <td className="px-4 py-3 text-[var(--text-secondary)] max-w-[160px] truncate">{bet.event_name}</td>
                        <td className="px-4 py-3 text-[var(--text-primary)] font-medium">{bet.selection_name}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{bet.market_name}</td>
                        <td className="px-4 py-3 text-[var(--accent-green)] font-bold">{formatOdds(bet.odds)}</td>
                        <td className="px-4 py-3 text-[var(--text-primary)]">{formatCurrency(bet.stake)}</td>
                        <td className="px-4 py-3 text-[var(--accent-blue)]">{formatCurrency(bet.potential_return)}</td>
                        <td className={`px-4 py-3 font-medium ${
                          pl == null ? "text-[var(--text-muted)]" :
                          pl >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
                        }`}>
                          {pl != null ? `${pl >= 0 ? "+" : ""}${formatCurrency(pl)}` : "—"}
                        </td>
                        <td className="px-4 py-3"><BetStatusBadge status={bet.status} /></td>
                        <td className="px-4 py-3">
                          <Badge variant={bet.auto_placed ? "purple" : "gray"}>
                            {bet.auto_placed ? "Bot" : "Manual"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-muted)] text-xs whitespace-nowrap">{formatDate(bet.placed_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BetMobileCard({ bet }: { bet: BetrBet }) {
  const pl = bet.profit_loss;
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-[var(--text-muted)]">{bet.event_name}</p>
          <p className="font-semibold text-[var(--text-primary)]">{bet.selection_name}</p>
          <p className="text-xs text-[var(--text-muted)]">{bet.market_name}</p>
        </div>
        <BetStatusBadge status={bet.status} />
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-[var(--text-muted)]">Odds</p>
          <p className="font-bold text-[var(--accent-green)]">{formatOdds(bet.odds)}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)]">Stake</p>
          <p className="font-semibold text-[var(--text-primary)]">{formatCurrency(bet.stake)}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)]">P&L</p>
          <p className={`font-semibold ${
            pl == null ? "text-[var(--text-muted)]" :
            pl >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"
          }`}>
            {pl != null ? `${pl >= 0 ? "+" : ""}${formatCurrency(pl)}` : "—"}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <Badge variant={bet.auto_placed ? "purple" : "gray"}>{bet.auto_placed ? "Bot" : "Manual"}</Badge>
        <span className="text-[var(--text-muted)]">{formatDate(bet.placed_at)}</span>
      </div>
    </Card>
  );
}
