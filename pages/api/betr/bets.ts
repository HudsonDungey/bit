import type { NextApiRequest, NextApiResponse } from "next";
import { getBets, placeBet } from "../../../lib/betr-client";
import type { ApiResponse, BetrBet, PlaceBetRequest } from "../../../lib/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<BetrBet[] | BetrBet>>
) {
  if (req.method === "GET") {
    const { status, limit, offset } = req.query;
    try {
      const bets = await getBets({
        status: status as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });
      return res.status(200).json({ success: true, data: bets, timestamp: new Date().toISOString() });
    } catch (err) {
      return res.status(502).json({
        success: false,
        error: err instanceof Error ? err.message : "Betr API error",
        timestamp: new Date().toISOString(),
      });
    }
  }

  if (req.method === "POST") {
    const body = req.body as PlaceBetRequest;
    try {
      const result = await placeBet(body);
      if (result.success && result.bet) {
        return res.status(201).json({ success: true, data: result.bet, timestamp: new Date().toISOString() });
      }
      return res.status(400).json({
        success: false,
        error: result.error || "Failed to place bet",
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      return res.status(502).json({
        success: false,
        error: err instanceof Error ? err.message : "Betr API error",
        timestamp: new Date().toISOString(),
      });
    }
  }

  res.status(405).json({ success: false, error: "Method not allowed", timestamp: new Date().toISOString() });
}
