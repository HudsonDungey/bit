/**
 * Betr API Client
 *
 * Wraps the Betr sportsbook REST API.
 * Configure BETR_API_BASE_URL and BETR_API_KEY in .env.local
 *
 * Betr API docs: https://developers.betr.app (configure base URL as needed)
 */

import type {
  BetrAccount,
  BetrCompetition,
  BetrEvent,
  BetrMarket,
  BetrPrice,
  BetrSport,
  BetrBet,
  PlaceBetRequest,
  PlaceBetResponse,
} from "./types";

const BASE_URL = process.env.BETR_API_BASE_URL || "https://api.betr.app/v1";
const API_KEY = process.env.BETR_API_KEY || "";
const SESSION_TOKEN = process.env.BETR_SESSION_TOKEN || "";

// ─── HTTP layer ───────────────────────────────────────────────────────────────

class BetrAPIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "BetrAPIError";
  }
}

async function betrFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(API_KEY && { "X-API-Key": API_KEY }),
    ...(SESSION_TOKEN && { Authorization: `Bearer ${SESSION_TOKEN}` }),
  };

  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
  });

  if (!res.ok) {
    let errBody: { error?: string; code?: string } = {};
    try {
      errBody = await res.json();
    } catch {
      // ignore parse errors
    }
    throw new BetrAPIError(
      res.status,
      errBody.code || "UNKNOWN",
      errBody.error || `HTTP ${res.status}`
    );
  }

  return res.json() as Promise<T>;
}

// ─── Sports & Markets ─────────────────────────────────────────────────────────

export async function getSports(): Promise<BetrSport[]> {
  return betrFetch<BetrSport[]>("/sports");
}

export async function getCompetitions(sportId: string): Promise<BetrCompetition[]> {
  return betrFetch<BetrCompetition[]>(`/competitions?sport_id=${sportId}`);
}

export async function getEvents(params: {
  competition_id?: string;
  sport_id?: string;
  status?: string;
  in_play?: boolean;
}): Promise<BetrEvent[]> {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return betrFetch<BetrEvent[]>(`/events?${qs}`);
}

export async function getMarkets(eventId: string): Promise<BetrMarket[]> {
  return betrFetch<BetrMarket[]>(`/markets?event_id=${eventId}`);
}

export async function getPrices(marketId: string): Promise<BetrPrice[]> {
  return betrFetch<BetrPrice[]>(`/prices?market_id=${marketId}`);
}

export async function getEventPrices(eventId: string): Promise<{
  market: BetrMarket;
  prices: BetrPrice[];
}[]> {
  const markets = await getMarkets(eventId);
  const results = await Promise.allSettled(
    markets.map(async (market) => ({
      market,
      prices: await getPrices(market.id),
    }))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<{ market: BetrMarket; prices: BetrPrice[] }> =>
      r.status === "fulfilled"
    )
    .map((r) => r.value);
}

// ─── Account ──────────────────────────────────────────────────────────────────

export async function getAccount(): Promise<BetrAccount> {
  return betrFetch<BetrAccount>("/account");
}

// ─── Bets ─────────────────────────────────────────────────────────────────────

export async function getBets(params: {
  status?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<BetrBet[]> {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return betrFetch<BetrBet[]>(`/bets?${qs}`);
}

export async function placeBet(request: PlaceBetRequest): Promise<PlaceBetResponse> {
  try {
    const bet = await betrFetch<BetrBet>("/bets", {
      method: "POST",
      body: JSON.stringify(request),
    });
    return { success: true, bet };
  } catch (err) {
    if (err instanceof BetrAPIError) {
      return { success: false, error: err.message, error_code: err.code };
    }
    return { success: false, error: "Unknown error placing bet" };
  }
}

export async function cashoutBet(betId: string): Promise<PlaceBetResponse> {
  try {
    const bet = await betrFetch<BetrBet>(`/bets/${betId}/cashout`, {
      method: "POST",
    });
    return { success: true, bet };
  } catch (err) {
    if (err instanceof BetrAPIError) {
      return { success: false, error: err.message, error_code: err.code };
    }
    return { success: false, error: "Cashout failed" };
  }
}
