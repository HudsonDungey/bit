import React, { useState, useEffect, useCallback } from "react";
import { StatCard } from "../components/ui/Card";
import { Badge, BetStatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import type { BotState, BotLogEntry, BetrBet } from "../lib/types";
import { formatCurrency, formatPercent, formatOdds } from "../lib/odds-utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function logLevelColor(level: string) {
  return (
    level === "success" ? "text-green-400" :
    level === "error"   ? "text-red-400"   :
    level === "warn"    ? "text-yellow-400":
    "text-slate-400"
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [botState, setBotState] = useState<BotState | null>(null);
  const [logs, setLogs] = useState<BotLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/bot/status?logs_limit=30");
      const json = await res.json();
      if (json.success) {
        setBotState(json.data.state);
        setLogs(json.data.logs);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleStart = async () => {
    setActionLoading(true);
    await fetch("/api/bot/start", { method: "POST" });
    await fetchStatus();
    setActionLoading(false);
  };

  const handleStop = async () => {
    setActionLoading(true);
    await fetch("/api/bot/stop", { method: "POST" });
    await fetchStatus();
    setActionLoading(false);
  };

  if (loading && !botState) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-green)] border-t-transparent rounded-full" />
      </div>
    );
  }

  const stats = botState?.daily_stats;
  const running = botState?.status === "running";
  const paused  = botState?.status === "paused";
  const opps    = botState?.opportunities || [];
  const activeBets = botState?.active_bets.filter(b => b.status === "placed" || b.status === "pending") || [];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {botState?.config.dry_run && (
              <span className="text-yellow-400 font-medium mr-2">⚠ Dry Run Mode</span>
            )}
            Real-time odds sniping monitor
          </p>
        </div>

        {/* Bot controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
            <span className={`w-2 h-2 rounded-full ${
              running ? "bg-green-400 animate-pulse" :
              paused  ? "bg-yellow-400" :
              "bg-red-400"
            }`} />
            <span className="text-sm text-[var(--text-secondary)] capitalize">{botState?.status || "stopped"}</span>
          </div>

          {running || paused ? (
            <Button variant="danger" size="sm" onClick={handleStop} loading={actionLoading}
              icon={<svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>}>
              Stop Bot
            </Button>
          ) : (
            <Button variant="success" size="sm" onClick={handleStart} loading={actionLoading}
              icon={<svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><polygon points="5,3 19,12 5,21" /></svg>}>
              Start Bot
            </Button>
          )}
        </div>
      </div>

      {/* Account balance */}
      {botState?.account && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
          <div className="w-10 h-10 rounded-full bg-[var(--accent-green)]/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth={2} className="w-5 h-5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v12M9 9h4.5a2.5 2.5 0 010 5H9v1.5" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)]">Account: {botState.account.username}</p>
            <p className="text-lg font-bold text-[var(--accent-green)]">
              {formatCurrency(botState.account.balance, botState.account.currency)}
            </p>
          </div>
          <div className="ml-auto">
            <Badge variant={botState.account.kyc_verified ? "green" : "yellow"}>
              {botState.account.kyc_verified ? "Verified" : "Unverified"}
            </Badge>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's P&L"
          value={formatCurrency(stats?.profit_loss || 0)}
          sub={`ROI: ${formatPercent(stats?.roi_percent || 0)}`}
          trend={(stats?.profit_loss || 0) >= 0 ? "up" : "down"}
          color={(stats?.profit_loss || 0) >= 0 ? "green" : "red"}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg>}
        />
        <StatCard
          label="Bets Today"
          value={stats?.bets_placed || 0}
          sub={`${stats?.bets_won || 0}W / ${stats?.bets_lost || 0}L`}
          color="blue"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>}
        />
        <StatCard
          label="Open Bets"
          value={activeBets.length}
          sub={`Max: ${botState?.config.max_concurrent_bets || 0}`}
          color="yellow"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
        <StatCard
          label="Opportunities"
          value={opps.filter(o => !o.acted_on).length}
          sub={`${opps.length} detected`}
          color="purple"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity log */}
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Bot Activity Log</h2>
            <Badge variant={running ? "green" : "gray"} pulse={running}>
              {running ? "Live" : "Inactive"}
            </Badge>
          </div>
          <div className="h-80 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
                No log entries yet — start the bot to begin scanning
              </div>
            ) : (
              logs.map((entry) => (
                <div key={entry.id} className="flex gap-3 px-4 py-2 border-b border-[var(--border)]/50 hover:bg-[var(--bg-secondary)] animate-slide-in">
                  <span className="text-[var(--text-muted)] flex-shrink-0 tabular-nums">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`flex-shrink-0 w-16 ${logLevelColor(entry.level)}`}>
                    [{entry.level.toUpperCase().slice(0,4)}]
                  </span>
                  <span className="text-[var(--text-secondary)] break-all">{entry.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent opportunities */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent Opportunities</h2>
          </div>
          <div className="h-80 overflow-y-auto">
            {opps.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
                None detected yet
              </div>
            ) : (
              opps.slice(0, 20).map((opp) => (
                <div key={opp.id} className="px-4 py-3 border-b border-[var(--border)]/50 animate-slide-in">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs text-[var(--text-primary)] font-medium leading-tight truncate">
                      {opp.price.selection_name}
                    </p>
                    <span className="text-sm font-bold text-[var(--accent-green)] flex-shrink-0">
                      {formatOdds(opp.price.odds)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] truncate mb-1.5">{opp.event.name}</p>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={opp.trigger_reason === "line_movement" ? "purple" : "blue"}>
                      {opp.trigger_reason === "line_movement" ? "Line Move" : "Value"}
                    </Badge>
                    {opp.acted_on && <Badge variant="green">Bet Placed</Badge>}
                    <span className="text-xs text-[var(--text-muted)] ml-auto">{timeAgo(opp.detected_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Active bets */}
      {activeBets.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Active Bets ({activeBets.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {["Event", "Selection", "Odds", "Stake", "Return", "Status", "Placed"].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-xs text-[var(--text-muted)] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeBets.map((bet: BetrBet) => (
                  <tr key={bet.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg-secondary)]">
                    <td className="px-4 py-3 text-[var(--text-secondary)] max-w-[160px] truncate">{bet.event_name}</td>
                    <td className="px-4 py-3 text-[var(--text-primary)] font-medium">{bet.selection_name}</td>
                    <td className="px-4 py-3 text-[var(--accent-green)] font-bold">{formatOdds(bet.odds)}</td>
                    <td className="px-4 py-3 text-[var(--text-primary)]">{formatCurrency(bet.stake)}</td>
                    <td className="px-4 py-3 text-[var(--accent-blue)]">{formatCurrency(bet.potential_return)}</td>
                    <td className="px-4 py-3"><BetStatusBadge status={bet.status} /></td>
                    <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{timeAgo(bet.placed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
