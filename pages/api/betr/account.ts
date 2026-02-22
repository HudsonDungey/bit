import type { NextApiRequest, NextApiResponse } from "next";
import { getAccount } from "../../../lib/betr-client";
import type { ApiResponse, BetrAccount } from "../../../lib/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<BetrAccount>>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed", timestamp: new Date().toISOString() });
  }

  try {
    const account = await getAccount();
    res.status(200).json({ success: true, data: account, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(502).json({
      success: false,
      error: err instanceof Error ? err.message : "Betr API error",
      timestamp: new Date().toISOString(),
    });
  }
}
