// ─── Betr API Types ──────────────────────────────────────────────────────────

export interface BetrSport {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  active: boolean;
}

export interface BetrCompetition {
  id: string;
  name: string;
  sport_id: string;
  country?: string;
  active: boolean;
}

export interface BetrEvent {
  id: string;
  name: string;
  competition_id: string;
  sport_id: string;
  home_team?: string;
  away_team?: string;
  start_time: string;
  status: "upcoming" | "live" | "completed" | "cancelled";
  in_play: boolean;
}

export interface BetrMarket {
  id: string;
  event_id: string;
  name: string;
  type: string; // "moneyline" | "spread" | "totals" | "prop"
  status: "open" | "suspended" | "closed" | "resulted";
  in_play: boolean;
}

export interface BetrPrice {
  id: string;
  market_id: string;
  selection_id: string;
  selection_name: string;
  odds: number; // decimal odds
  fractional?: string;
  american?: number;
  probability?: number;
  movement?: "up" | "down" | "stable";
  movement_amount?: number;
  previous_odds?: number;
  updated_at: string;
}

export interface BetrSelection {
  id: string;
  market_id: string;
  name: string;
  result?: "win" | "lose" | "void" | "push";
}

export interface BetrBet {
  id: string;
  selection_id: string;
  market_id: string;
  event_id: string;
  selection_name: string;
  event_name: string;
  market_name: string;
  odds: number;
  stake: number;
  potential_return: number;
  status: "pending" | "placed" | "won" | "lost" | "void" | "cashout";
  placed_at: string;
  settled_at?: string;
  profit_loss?: number;
  bet_type: "single" | "multi";
  auto_placed: boolean;
}

export interface BetrAccount {
  id: string;
  username: string;
  email: string;
  balance: number;
  currency: string;
  kyc_verified: boolean;
}

export interface PlaceBetRequest {
  selection_id: string;
  market_id: string;
  event_id: string;
  odds: number;
  stake: number;
  bet_type: "single" | "multi";
}

export interface PlaceBetResponse {
  success: boolean;
  bet?: BetrBet;
  error?: string;
  error_code?: string;
}

// ─── Bot Engine Types ─────────────────────────────────────────────────────────

export type BotStatus = "running" | "stopped" | "paused" | "error";

export interface BotConfig {
  // Scanning
  scan_interval_ms: number;         // how often to poll odds (ms)
  target_sports: string[];          // sport IDs to monitor
  target_markets: string[];         // market types to watch

  // Bet criteria
  min_odds: number;                 // minimum decimal odds to trigger
  max_odds: number;                 // maximum decimal odds to consider
  min_edge_percent: number;         // minimum edge % over implied prob
  line_movement_threshold: number;  // odds movement % to trigger snipe

  // Risk management
  stake_per_bet: number;            // fixed stake per bet (AUD)
  max_daily_loss: number;           // max loss before bot stops (AUD)
  max_concurrent_bets: number;      // max open bets at once
  max_daily_bets: number;           // max bets per day
  dry_run: boolean;                 // simulate without placing real bets
}

export interface OddsOpportunity {
  id: string;
  event: BetrEvent;
  market: BetrMarket;
  price: BetrPrice;
  edge_percent: number;
  trigger_reason: "line_movement" | "value_bet" | "arbitrage";
  detected_at: string;
  acted_on: boolean;
  bet_id?: string;
}

export interface BotState {
  status: BotStatus;
  config: BotConfig;
  account?: BetrAccount;
  active_bets: BetrBet[];
  opportunities: OddsOpportunity[];
  daily_stats: DailyStats;
  error?: string;
}

export interface DailyStats {
  date: string;
  bets_placed: number;
  bets_won: number;
  bets_lost: number;
  total_staked: number;
  total_returned: number;
  profit_loss: number;
  roi_percent: number;
}

export interface BotLogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
  data?: Record<string, unknown>;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
