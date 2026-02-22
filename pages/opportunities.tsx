import React, { useState, useEffect, useCallback } from "react";
import { Card } from "../components/ui/Card";
import { Badge, TriggerBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import type { OddsOpportunity, BotConfig } from "../lib/types";
import { formatOdds, formatPercent, decimalToAmerican } from "../lib/odds-utils";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

type SortKey = "detected_at" | "edge_percent" | "odds";
type FilterKey = "all" | "line_movement" | "value_bet" | "arbitrage";

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<OddsOpportunity[]>([]);
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortKey>("detected_at");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showActedOn, setShowActedOn] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, configRes] = await Promise.all([
        fetch("/api/bot/status"),
        fetch("/api/bot/config"),
      ]);
      const statusJson = await statusRes.json();
      const configJson = await configRes.json();
      if (statusJson.success) setOpportunities(statusJson.data.state.opportunities);
      if (configJson.success) setConfig(configJson.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Filter + sort
  const filtered = opportunities
    .filter((o) => {
      if (!showActedOn && o.acted_on) return false;
      if (filter !== "all" && o.trigger_reason !== filter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "detected_at") return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
      if (sort === "edge_percent") return b.edge_percent - a.edge_percent;
      if (sort === "odds") return b.price.odds - a.price.odds;
      return 0;
    });

  const counts: Record<string, number> = { all: opportunities.length };
  for (const o of opportunities) {
    counts[o.trigger_reason] = (counts[o.trigger_reason] || 0) + 1;
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Opportunities</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            {filtered.length} {filter !== "all" ? `${filter.replace("_", " ")} ` : ""}opportunities detected
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchData}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.1"/></svg>}>
          Refresh
        </Button>
      </div>

      {/* Criteria summary */}
      {config && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Min Odds", value: formatOdds(config.min_odds) },
            { label: "Max Odds", value: formatOdds(config.max_odds) },
            { label: "Min Edge", value: formatPercent(config.min_edge_percent) },
            { label: "Line Move Trigger", value: `${config.line_movement_threshold}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-4 py-3">
              <p className="text-xs text-[var(--text-muted)]">{label}</p>
              <p className="text-base font-semibold text-[var(--accent-green)]">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type filter */}
        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
          {(["all", "line_movement", "value_bet", "arbitrage"] as FilterKey[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-[var(--accent-green)] text-black"
                  : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {f === "all" ? "All" : f === "line_movement" ? "Line Move" : f === "value_bet" ? "Value" : "Arb"}
              <span className="ml-1 opacity-60">({counts[f] || 0})</span>
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] text-xs rounded-lg px-3 py-1.5 outline-none focus:border-[var(--accent-green)]"
        >
          <option value="detected_at">Sort: Newest</option>
          <option value="edge_percent">Sort: Edge %</option>
          <option value="odds">Sort: Odds</option>
        </select>

        {/* Acted on toggle */}
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            checked={showActedOn}
            onChange={(e) => setShowActedOn(e.target.checked)}
            className="accent-[var(--accent-green)]"
          />
          Show acted on
        </label>
      </div>

      {/* Opportunities grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-green)] border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center h-48 gap-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={1.5} className="w-12 h-12">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p className="text-[var(--text-muted)] text-sm">
            No opportunities found — start the bot to begin scanning
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((opp) => (
            <OppCard key={opp.id} opp={opp} />
          ))}
        </div>
      )}
    </div>
  );
}

function OppCard({ opp }: { opp: OddsOpportunity }) {
  const movementColor =
    opp.price.movement === "down" ? "text-[var(--accent-green)]" :
    opp.price.movement === "up"   ? "text-[var(--accent-red)]"   :
    "text-[var(--text-muted)]";

  const movementIcon =
    opp.price.movement === "down" ? "↓" :
    opp.price.movement === "up"   ? "↑" : "→";

  return (
    <Card className="p-4 flex flex-col gap-3 animate-slide-in" hover>
      {/* Top: event + badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-[var(--text-muted)] truncate">{opp.event.name}</p>
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{opp.price.selection_name}</p>
          <p className="text-xs text-[var(--text-muted)] truncate">{opp.market.name}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <TriggerBadge reason={opp.trigger_reason} />
          {opp.acted_on && <Badge variant="green">Bet Placed</Badge>}
        </div>
      </div>

      {/* Odds display */}
      <div className="flex items-center gap-4 p-3 rounded-lg bg-[var(--bg-secondary)]">
        <div>
          <p className="text-xs text-[var(--text-muted)]">Decimal</p>
          <p className="text-2xl font-bold text-[var(--accent-green)]">{formatOdds(opp.price.odds)}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--text-muted)]">American</p>
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            {decimalToAmerican(opp.price.odds) >= 0 ? "+" : ""}{decimalToAmerican(opp.price.odds)}
          </p>
        </div>
        {opp.price.previous_odds && (
          <div className="ml-auto text-right">
            <p className="text-xs text-[var(--text-muted)]">Was</p>
            <p className="text-sm font-medium text-[var(--text-secondary)]">{formatOdds(opp.price.previous_odds)}</p>
            {opp.price.movement_amount && (
              <p className={`text-xs font-medium ${movementColor}`}>
                {movementIcon} {Math.abs(opp.price.movement_amount).toFixed(1)}%
              </p>
            )}
          </div>
        )}
      </div>

      {/* Edge + status */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-muted)]">Edge:</span>
          <span className={`font-semibold ${opp.edge_percent >= 0 ? "text-green-400" : "text-red-400"}`}>
            {formatPercent(opp.edge_percent)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={opp.event.in_play ? "green" : "gray"}>
            {opp.event.in_play ? "In-Play" : "Pre-Match"}
          </Badge>
          <span className="text-[var(--text-muted)]">{timeAgo(opp.detected_at)}</span>
        </div>
      </div>
    </Card>
  );
}
