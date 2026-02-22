import type { NextApiRequest, NextApiResponse } from "next";
import { getBotState, getLogs } from "../../../lib/bot-engine";
import type { ApiResponse } from "../../../lib/types";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<{ state: ReturnType<typeof getBotState>; logs: ReturnType<typeof getLogs> }>>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed", timestamp: new Date().toISOString() });
  }

  const logsLimit = parseInt((req.query.logs_limit as string) || "50", 10);

  res.status(200).json({
    success: true,
    data: {
      state: getBotState(),
      logs: getLogs(logsLimit),
    },
    timestamp: new Date().toISOString(),
  });
}
