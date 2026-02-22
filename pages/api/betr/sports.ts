import type { NextApiRequest, NextApiResponse } from "next";
import { getSports } from "../../../lib/betr-client";
import type { ApiResponse, BetrSport } from "../../../lib/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<BetrSport[]>>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed", timestamp: new Date().toISOString() });
  }

  try {
    const sports = await getSports();
    res.status(200).json({ success: true, data: sports, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : "Betr API error",
      timestamp: new Date().toISOString(),
    });
  }
}
