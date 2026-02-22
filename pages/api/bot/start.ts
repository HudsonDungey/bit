import type { NextApiRequest, NextApiResponse } from "next";
import { startBot, getBotState } from "../../../lib/bot-engine";
import type { ApiResponse, BotState } from "../../../lib/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<BotState>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed", timestamp: new Date().toISOString() });
  }

  await startBot();

  res.status(200).json({
    success: true,
    data: getBotState(),
    timestamp: new Date().toISOString(),
  });
}
