/**
 * Bot Engine — Odds Sniping Core Logic
 *
 * Runs server-side. Polls the Betr API on a configurable interval,
 * detects opportunities, and places bets when criteria are met.
 *
 * State is held in-memory for this process (suitable for single-server
 * deployments). In production, persist to a database / Redis.
 */

import {
  getEvents,
  getPrices,
  getMarkets,
  getAccount,
  placeBet,
} from "./betr-client";
import { isOpportunity } from "./odds-utils";
import type {
  BotConfig,
  BotState,
  BotStatus,
  BotLogEntry,
  OddsOpportunity,
  BetrBet,
  BetrPrice,
  BetrMarket,
  BetrEvent,
  DailyStats,
} from "./types";

// ─── Default Config ───────────────────────────────────────────────────────────

export const DEFAULT_CONFIG: BotConfig = {
  scan_interval_ms: 5000,
  target_sports: [],           // empty = all sports
  target_markets: ["moneyline", "spread", "totals"],
  min_odds: 1.5,
  max_odds: 10.0,
  min_edge_percent: 2.0,
  line_movement_threshold: 5.0, // 5% odds movement triggers snipe
  stake_per_bet: 10,
  max_daily_loss: 100,
  max_concurrent_bets: 5,
  max_daily_bets: 20,
  dry_run: true,               // SAFE DEFAULT — no real money
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyDailyStats(): DailyStats {
  return {
    date: todayStr(),
    bets_placed: 0,
    bets_won: 0,
    bets_lost: 0,
    total_staked: 0,
    total_returned: 0,
    profit_loss: 0,
    roi_percent: 0,
  };
}

// ─── Singleton state ──────────────────────────────────────────────────────────

let botState: BotState = {
  status: "stopped",
  config: { ...DEFAULT_CONFIG },
  active_bets: [],
  opportunities: [],
  daily_stats: emptyDailyStats(),
};

const logs: BotLogEntry[] = [];
let scanTimer: ReturnType<typeof setTimeout> | null = null;

// Previous prices cache for line movement detection
const priceCache: Map<string, BetrPrice> = new Map();

// ─── Logging ──────────────────────────────────────────────────────────────────

function log(
  level: BotLogEntry["level"],
  message: string,
  data?: Record<string, unknown>
): void {
  const entry: BotLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
  };
  logs.unshift(entry);
  if (logs.length > 200) logs.splice(200);
  console.log(`[BOT][${level.toUpperCase()}] ${message}`, data || "");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getBotState(): BotState {
  return { ...botState };
}

export function getLogs(limit = 50): BotLogEntry[] {
  return logs.slice(0, limit);
}

export function updateConfig(partial: Partial<BotConfig>): BotConfig {
  botState.config = { ...botState.config, ...partial };
  log("info", "Config updated", partial as Record<string, unknown>);
  return botState.config;
}

export async function startBot(): Promise<void> {
  if (botState.status === "running") {
    log("warn", "Bot already running");
    return;
  }

  log("info", "Starting bot...");
  botState.status = "running";
  botState.error = undefined;

  // Refresh account info
  try {
    botState.account = await getAccount();
    log("info", `Authenticated as ${botState.account.username}`, {
      balance: botState.account.balance,
    });
  } catch {
    log("warn", "Could not fetch account info — API key may not be set");
  }

  // Reset daily stats if date changed
  if (botState.daily_stats.date !== todayStr()) {
    botState.daily_stats = emptyDailyStats();
  }

  scheduleScan();
  log("success", "Bot started");
}

export function stopBot(): void {
  if (scanTimer) {
    clearTimeout(scanTimer);
    scanTimer = null;
  }
  botState.status = "stopped";
  log("info", "Bot stopped");
}

export function pauseBot(): void {
  if (scanTimer) {
    clearTimeout(scanTimer);
    scanTimer = null;
  }
  botState.status = "paused";
  log("info", "Bot paused");
}

// ─── Scanning ─────────────────────────────────────────────────────────────────

function scheduleScan(): void {
  scanTimer = setTimeout(async () => {
    if (botState.status !== "running") return;
    try {
      await runScan();
    } catch (err) {
      log("error", "Scan failed", { error: String(err) });
    }
    if (botState.status === "running") {
      scheduleScan();
    }
  }, botState.config.scan_interval_ms);
}

async function runScan(): Promise<void> {
  const { config } = botState;

  // Guard: daily limits
  const { daily_stats } = botState;
  if (daily_stats.bets_placed >= config.max_daily_bets) {
    log("warn", "Daily bet limit reached — pausing bot");
    pauseBot();
    return;
  }
  if (
    daily_stats.profit_loss <= -Math.abs(config.max_daily_loss)
  ) {
    log("warn", "Daily loss limit hit — pausing bot");
    pauseBot();
    return;
  }

  // Fetch live + upcoming events
  const eventParams: Record<string, string | boolean> = {
    status: "upcoming",
  };
  if (config.target_sports.length === 1) {
    eventParams.sport_id = config.target_sports[0];
  }

  let events: BetrEvent[] = [];
  try {
    events = await getEvents(eventParams);
    // Also fetch in-play
    const live = await getEvents({ status: "live" });
    events = [...events, ...live];
  } catch (err) {
    log("error", "Failed to fetch events", { error: String(err) });
    return;
  }

  // Filter by sport if multiple targets
  if (config.target_sports.length > 1) {
    events = events.filter((e) => config.target_sports.includes(e.sport_id));
  }

  log("info", `Scanning ${events.length} events...`);

  for (const event of events.slice(0, 50)) { // cap at 50 to avoid rate limits
    await scanEvent(event);
  }
}

async function scanEvent(event: BetrEvent): Promise<void> {
  let markets: BetrMarket[] = [];
  try {
    markets = await getMarkets(event.id);
  } catch {
    return;
  }

  const { config } = botState;
  const targetTypes = config.target_markets;

  for (const market of markets) {
    if (!targetTypes.includes(market.type)) continue;
    if (market.status !== "open") continue;

    let prices: BetrPrice[] = [];
    try {
      prices = await getPrices(market.id);
    } catch {
      continue;
    }

    for (const price of prices) {
      // Inject previous odds from cache for movement detection
      const cacheKey = price.id;
      const cached = priceCache.get(cacheKey);
      if (cached) {
        price.previous_odds = cached.odds;
        price.movement_amount =
          ((price.odds - cached.odds) / cached.odds) * 100;
        price.movement =
          price.odds > cached.odds
            ? "up"
            : price.odds < cached.odds
            ? "down"
            : "stable";
      }

      // Update cache
      priceCache.set(cacheKey, { ...price });

      // Evaluate opportunity
      const result = isOpportunity(price, config);
      if (!result.qualifies || !result.reason) continue;

      const opportunity: OddsOpportunity = {
        id: `opp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        event,
        market,
        price,
        edge_percent: result.edge,
        trigger_reason: result.reason,
        detected_at: new Date().toISOString(),
        acted_on: false,
      };

      log("success", `Opportunity: ${event.name} — ${price.selection_name} @ ${price.odds}`, {
        reason: result.reason,
        edge: result.edge,
      });

      // Keep last 100 opportunities
      botState.opportunities.unshift(opportunity);
      if (botState.opportunities.length > 100) {
        botState.opportunities.splice(100);
      }

      // Auto-bet if within limits
      await attemptBet(opportunity);
    }
  }
}

// ─── Betting ──────────────────────────────────────────────────────────────────

async function attemptBet(opp: OddsOpportunity): Promise<void> {
  const { config, daily_stats } = botState;

  // Concurrent bet guard
  const activePending = botState.active_bets.filter(
    (b) => b.status === "pending" || b.status === "placed"
  );
  if (activePending.length >= config.max_concurrent_bets) {
    log("warn", "Max concurrent bets reached — skipping opportunity");
    return;
  }

  // Daily bet count guard
  if (daily_stats.bets_placed >= config.max_daily_bets) {
    return;
  }

  // Mark opportunity as acted on
  opp.acted_on = true;

  if (config.dry_run) {
    // Simulate bet
    const simulatedBet: BetrBet = {
      id: `dry-${Date.now()}`,
      selection_id: opp.price.selection_id,
      market_id: opp.market.id,
      event_id: opp.event.id,
      selection_name: opp.price.selection_name,
      event_name: opp.event.name,
      market_name: opp.market.name,
      odds: opp.price.odds,
      stake: config.stake_per_bet,
      potential_return: config.stake_per_bet * opp.price.odds,
      status: "placed",
      placed_at: new Date().toISOString(),
      bet_type: "single",
      auto_placed: true,
    };

    botState.active_bets.unshift(simulatedBet);
    daily_stats.bets_placed++;
    daily_stats.total_staked += config.stake_per_bet;
    opp.bet_id = simulatedBet.id;

    log("info", `[DRY RUN] Simulated bet: ${simulatedBet.event_name} — ${simulatedBet.selection_name} @ ${simulatedBet.odds}`, {
      stake: config.stake_per_bet,
      potential_return: simulatedBet.potential_return,
    });
    return;
  }

  // Real bet
  try {
    const result = await placeBet({
      selection_id: opp.price.selection_id,
      market_id: opp.market.id,
      event_id: opp.event.id,
      odds: opp.price.odds,
      stake: config.stake_per_bet,
      bet_type: "single",
    });

    if (result.success && result.bet) {
      botState.active_bets.unshift(result.bet);
      daily_stats.bets_placed++;
      daily_stats.total_staked += config.stake_per_bet;
      opp.bet_id = result.bet.id;

      log("success", `Bet placed: ${result.bet.event_name} — ${result.bet.selection_name} @ ${result.bet.odds}`, {
        stake: config.stake_per_bet,
        potential_return: result.bet.potential_return,
      });
    } else {
      log("error", `Bet failed: ${result.error}`, { code: result.error_code });
    }
  } catch (err) {
    log("error", "Exception placing bet", { error: String(err) });
  }
}

// ─── Settle bets (call periodically or via webhook) ───────────────────────────

export function settleBet(betId: string, status: BetrBet["status"], profitLoss: number): void {
  const bet = botState.active_bets.find((b) => b.id === betId);
  if (!bet) return;

  bet.status = status;
  bet.profit_loss = profitLoss;
  bet.settled_at = new Date().toISOString();

  const { daily_stats } = botState;
  if (status === "won") {
    daily_stats.bets_won++;
    daily_stats.total_returned += bet.potential_return;
    daily_stats.profit_loss += profitLoss;
  } else if (status === "lost") {
    daily_stats.bets_lost++;
    daily_stats.profit_loss += profitLoss;
  }

  if (daily_stats.total_staked > 0) {
    daily_stats.roi_percent =
      (daily_stats.profit_loss / daily_stats.total_staked) * 100;
  }

  log(status === "won" ? "success" : "warn", `Bet settled: ${bet.event_name} — ${status.toUpperCase()}`, {
    profit_loss: profitLoss,
  });
}
