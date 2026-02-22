/**
 * Odds calculation and analysis utilities.
 * All odds in decimal format (e.g. 2.50 = $1.50 profit per $1 staked).
 */

import type { BetrPrice, OddsOpportunity, BotConfig } from "./types";

// ─── Conversions ──────────────────────────────────────────────────────────────

/** Decimal → Implied probability (0–1) */
export function decimalToImplied(odds: number): number {
  if (odds <= 1) return 1;
  return 1 / odds;
}

/** Implied probability → Decimal odds */
export function impliedToDecimal(prob: number): number {
  if (prob <= 0 || prob >= 1) return 0;
  return 1 / prob;
}

/** Decimal → American odds */
export function decimalToAmerican(odds: number): number {
  if (odds >= 2) return Math.round((odds - 1) * 100);
  return Math.round(-100 / (odds - 1));
}

/** Decimal → Fractional string */
export function decimalToFractional(odds: number): string {
  const decimal = odds - 1;
  const precision = 1000;
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const numerator = Math.round(decimal * precision);
  const denominator = precision;
  const divisor = gcd(numerator, denominator);
  return `${numerator / divisor}/${denominator / divisor}`;
}

// ─── Edge calculation ─────────────────────────────────────────────────────────

/**
 * Calculate the edge % a bettor has over the book.
 * Positive edge = value bet.
 * @param ourOdds     Decimal odds being offered
 * @param trueProb    Our estimated true probability (0–1)
 */
export function calculateEdge(ourOdds: number, trueProb: number): number {
  // Expected value: (odds * prob) - 1
  const ev = ourOdds * trueProb - 1;
  return ev * 100; // as percentage
}

/**
 * Estimate true probability using the book's own lines after removing vig.
 * Uses the "worst-of" method (simple devig) for a 2-way market.
 */
export function removingVig(
  oddsA: number,
  oddsB: number
): { probA: number; probB: number; vig: number } {
  const rawA = decimalToImplied(oddsA);
  const rawB = decimalToImplied(oddsB);
  const total = rawA + rawB;
  const vig = (total - 1) * 100;
  return {
    probA: rawA / total,
    probB: rawB / total,
    vig,
  };
}

// ─── Line movement detection ──────────────────────────────────────────────────

/**
 * Returns how much odds have moved as a percentage.
 * Positive = odds drifting (getting longer).
 * Negative = odds shortening (steaming).
 */
export function oddsMovementPercent(
  currentOdds: number,
  previousOdds: number
): number {
  if (!previousOdds) return 0;
  return ((currentOdds - previousOdds) / previousOdds) * 100;
}

/**
 * Determines if a price qualifies as a snipe opportunity.
 */
export function isOpportunity(
  price: BetrPrice,
  config: Pick<
    BotConfig,
    | "min_odds"
    | "max_odds"
    | "min_edge_percent"
    | "line_movement_threshold"
  >
): { qualifies: boolean; reason?: OddsOpportunity["trigger_reason"]; edge: number } {
  const { odds, previous_odds } = price;

  // Basic odds range filter
  if (odds < config.min_odds || odds > config.max_odds) {
    return { qualifies: false, edge: 0 };
  }

  // Line movement snipe: odds shortened significantly (sharp money indicator)
  if (previous_odds && previous_odds > 0) {
    const movement = oddsMovementPercent(odds, previous_odds);
    // Negative movement means shortening = smart money coming in
    if (Math.abs(movement) >= config.line_movement_threshold && movement < 0) {
      const trueProb = decimalToImplied(odds);
      const edge = calculateEdge(odds, trueProb);
      return { qualifies: true, reason: "line_movement", edge };
    }
  }

  // Value bet: implied probability suggests positive EV vs fair line
  const impliedProb = decimalToImplied(odds);
  // Simple fair probability estimate: no-vig using current odds as proxy
  const edge = calculateEdge(odds, impliedProb);

  if (edge >= config.min_edge_percent) {
    return { qualifies: true, reason: "value_bet", edge };
  }

  return { qualifies: false, edge };
}

// ─── Kelly Criterion stake sizing ─────────────────────────────────────────────

/**
 * Kelly criterion stake as a fraction of bankroll.
 * @param odds       Decimal odds
 * @param prob       Estimated true win probability
 * @param fraction   Fractional Kelly (default 0.25 = quarter Kelly)
 */
export function kellyStake(
  odds: number,
  prob: number,
  fraction = 0.25
): number {
  const b = odds - 1; // net odds
  const q = 1 - prob; // lose probability
  const kelly = (b * prob - q) / b;
  return Math.max(0, kelly * fraction);
}

// ─── Profit / Loss ────────────────────────────────────────────────────────────

export function calcReturn(stake: number, odds: number): number {
  return stake * odds;
}

export function calcProfit(stake: number, odds: number): number {
  return stake * (odds - 1);
}

export function formatOdds(odds: number): string {
  return odds.toFixed(2);
}

export function formatCurrency(amount: number, currency = "AUD"): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}
