import React, { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import type { BotConfig } from "../lib/types";

interface FieldProps {
  label: string;
  description?: string;
  children: ReactNode;
}

function Field({ label, description, children }: FieldProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-4 border-b border-[var(--border)] last:border-0">
      <div className="sm:max-w-xs">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        {description && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step || 0.1}
        className="w-28 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm rounded-lg px-3 py-1.5 outline-none focus:border-[var(--accent-green)] transition-colors"
      />
      {suffix && <span className="text-xs text-[var(--text-muted)]">{suffix}</span>}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? "bg-[var(--accent-green)]" : "bg-[var(--border-bright)]"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

const SPORTS_OPTIONS = [
  { id: "afl", label: "AFL" },
  { id: "nrl", label: "NRL" },
  { id: "soccer", label: "Soccer" },
  { id: "nba", label: "NBA" },
  { id: "nfl", label: "NFL" },
  { id: "tennis", label: "Tennis" },
  { id: "cricket", label: "Cricket" },
  { id: "horse_racing", label: "Horse Racing" },
];

const MARKET_OPTIONS = [
  { id: "moneyline", label: "Moneyline (Head-to-Head)" },
  { id: "spread", label: "Spread / Handicap" },
  { id: "totals", label: "Totals (Over/Under)" },
  { id: "prop", label: "Player Props" },
];

export default function SettingsPage() {
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [draft, setDraft] = useState<BotConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [apiBase, setApiBase] = useState("https://api.betr.app/v1");

  const fetchConfig = useCallback(async () => {
    const res = await fetch("/api/bot/config");
    const json = await res.json();
    if (json.success) {
      setConfig(json.data);
      setDraft(json.data);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateDraft = <K extends keyof BotConfig>(key: K, value: BotConfig[K]) => {
    if (!draft) return;
    setDraft({ ...draft, [key]: value });
  };

  const toggleSport = (sportId: string) => {
    if (!draft) return;
    const current = draft.target_sports;
    const updated = current.includes(sportId)
      ? current.filter((s) => s !== sportId)
      : [...current, sportId];
    updateDraft("target_sports", updated);
  };

  const toggleMarket = (marketId: string) => {
    if (!draft) return;
    const current = draft.target_markets;
    const updated = current.includes(marketId)
      ? current.filter((m) => m !== marketId)
      : [...current, marketId];
    updateDraft("target_markets", updated);
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch("/api/bot/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (json.success) {
        setConfig(json.data);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (config) setDraft({ ...config });
  };

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(config);

  if (!draft) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-green)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Configure the bot and API credentials</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Button variant="ghost" size="sm" onClick={handleReset}>Reset</Button>
          )}
          <Button
            variant={saved ? "success" : "primary"}
            size="sm"
            onClick={handleSave}
            loading={saving}
            disabled={!hasChanges}
            icon={saved ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : undefined}
          >
            {saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* API Credentials */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Betr API Credentials</h2>
          <Badge variant="yellow">Required</Badge>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          Set these in your <code className="bg-[var(--bg-secondary)] px-1 py-0.5 rounded text-[var(--accent-green)]">.env.local</code> file.
          The values below are shown for reference only and are read from environment variables.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">BETR_API_BASE_URL</label>
            <input
              type="text"
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder="https://api.betr.app/v1"
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-sm rounded-lg px-3 py-2 outline-none focus:border-[var(--accent-green)] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">BETR_API_KEY</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="••••••••••••••••"
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-sm rounded-lg px-3 py-2 outline-none focus:border-[var(--accent-green)] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5">BETR_SESSION_TOKEN (Bearer token)</label>
            <input
              type="password"
              value={sessionToken}
              onChange={(e) => setSessionToken(e.target.value)}
              placeholder="••••••••••••••••"
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] text-sm rounded-lg px-3 py-2 outline-none focus:border-[var(--accent-green)] transition-colors"
            />
          </div>
          <p className="text-xs text-yellow-400">
            ⚠ Never commit API keys. Add them to <code>.env.local</code> which is git-ignored.
          </p>
        </div>
      </Card>

      {/* Safety */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">Safety & Mode</h2>
        <p className="text-xs text-[var(--text-muted)] mb-4">Always start in Dry Run mode to verify behaviour before risking real money.</p>

        <Field
          label="Dry Run Mode"
          description="Simulate bets without placing them on Betr. Real bets are NOT placed. Disable only when ready."
        >
          <div className="flex items-center gap-3">
            <Toggle checked={draft.dry_run} onChange={(v) => updateDraft("dry_run", v)} />
            <Badge variant={draft.dry_run ? "yellow" : "red"}>
              {draft.dry_run ? "Simulation" : "LIVE BETTING"}
            </Badge>
          </div>
        </Field>
      </Card>

      {/* Scanning */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">Scanning</h2>

        <Field label="Scan Interval" description="How often the bot polls Betr for odds updates">
          <NumberInput
            value={draft.scan_interval_ms / 1000}
            onChange={(v) => updateDraft("scan_interval_ms", Math.max(1000, v * 1000))}
            min={1}
            max={60}
            step={1}
            suffix="seconds"
          />
        </Field>

        <Field label="Target Sports" description="Sports to monitor. Leave all unchecked to monitor all.">
          <div className="flex flex-wrap gap-2">
            {SPORTS_OPTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => toggleSport(s.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  draft.target_sports.includes(s.id)
                    ? "bg-[var(--accent-green)]/20 border-[var(--accent-green)]/50 text-[var(--accent-green)]"
                    : "bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Target Markets" description="Market types to scan for opportunities">
          <div className="flex flex-wrap gap-2">
            {MARKET_OPTIONS.map((m) => (
              <button
                key={m.id}
                onClick={() => toggleMarket(m.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  draft.target_markets.includes(m.id)
                    ? "bg-[var(--accent-blue)]/20 border-[var(--accent-blue)]/50 text-[var(--accent-blue)]"
                    : "bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </Field>
      </Card>

      {/* Opportunity Criteria */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">Opportunity Criteria</h2>

        <Field label="Minimum Odds" description="Only snipe selections with odds at or above this value">
          <NumberInput value={draft.min_odds} onChange={(v) => updateDraft("min_odds", v)} min={1.01} max={10} step={0.1} />
        </Field>

        <Field label="Maximum Odds" description="Ignore long shots above this value (risk management)">
          <NumberInput value={draft.max_odds} onChange={(v) => updateDraft("max_odds", v)} min={1.1} max={100} step={0.5} />
        </Field>

        <Field label="Minimum Edge %" description="Minimum calculated positive EV % required to trigger">
          <NumberInput value={draft.min_edge_percent} onChange={(v) => updateDraft("min_edge_percent", v)} min={0} max={50} step={0.5} suffix="%" />
        </Field>

        <Field label="Line Movement Threshold" description="Odds shortening % that triggers a line movement snipe">
          <NumberInput value={draft.line_movement_threshold} onChange={(v) => updateDraft("line_movement_threshold", v)} min={1} max={50} step={0.5} suffix="%" />
        </Field>
      </Card>

      {/* Risk Management */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">Risk Management</h2>

        <Field label="Stake Per Bet" description="Fixed stake amount placed on each qualifying bet">
          <NumberInput value={draft.stake_per_bet} onChange={(v) => updateDraft("stake_per_bet", v)} min={1} max={10000} step={1} suffix="AUD" />
        </Field>

        <Field label="Max Daily Loss" description="Bot pauses automatically if this loss threshold is reached today">
          <NumberInput value={draft.max_daily_loss} onChange={(v) => updateDraft("max_daily_loss", v)} min={1} max={100000} step={10} suffix="AUD" />
        </Field>

        <Field label="Max Concurrent Bets" description="Maximum number of open bets allowed at any time">
          <NumberInput value={draft.max_concurrent_bets} onChange={(v) => updateDraft("max_concurrent_bets", Math.floor(v))} min={1} max={50} step={1} />
        </Field>

        <Field label="Max Daily Bets" description="Maximum number of bets to place per day before pausing">
          <NumberInput value={draft.max_daily_bets} onChange={(v) => updateDraft("max_daily_bets", Math.floor(v))} min={1} max={500} step={1} />
        </Field>
      </Card>

      {/* Save bar */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-bright)] rounded-xl px-5 py-3 shadow-2xl animate-slide-in">
          <span className="text-sm text-[var(--text-secondary)]">Unsaved changes</span>
          <Button variant="ghost" size="sm" onClick={handleReset}>Discard</Button>
          <Button variant="success" size="sm" onClick={handleSave} loading={saving}>Save</Button>
        </div>
      )}
    </div>
  );
}
