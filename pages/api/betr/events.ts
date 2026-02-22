import type { NextApiRequest, NextApiResponse } from "next";
import { getEvents } from "../../../lib/betr-client";
import type { ApiResponse, BetrEvent } from "../../../lib/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<BetrEvent[]>>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed", timestamp: new Date().toISOString() });
  }

  const { sport_id, competition_id, status, in_play } = req.query;

  try {
    const events = await getEvents({
      sport_id: sport_id as string | undefined,
      competition_id: competition_id as string | undefined,
      status: (status as string) || "upcoming",
      in_play: in_play === "true" ? true : undefined,
    });
    res.status(200).json({ success: true, data: events, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : "Betr API error",
      timestamp: new Date().toISOString(),
    });
  }
}
