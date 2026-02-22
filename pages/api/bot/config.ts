import type { NextApiRequest, NextApiResponse } from "next";
import { getBotState, updateConfig } from "../../../lib/bot-engine";
import type { ApiResponse, BotConfig } from "../../../lib/types";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<BotConfig>>
) {
  if (req.method === "GET") {
    return res.status(200).json({
      success: true,
      data: getBotState().config,
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method === "PATCH") {
    const updates = req.body as Partial<BotConfig>;
    const updated = updateConfig(updates);
    return res.status(200).json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    });
  }

  res.status(405).json({ success: false, error: "Method not allowed", timestamp: new Date().toISOString() });
}
