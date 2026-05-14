import { NextResponse } from "next/server";
import { ensureSchedulerStarted } from "@/lib/scheduler";
import { incomeSeries, type Range } from "@/lib/chain-reads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: Range[] = ["1d", "1w", "1m", "1y"];

export async function GET(req: Request) {
  ensureSchedulerStarted();
  const url = new URL(req.url);
  const raw = (url.searchParams.get("range") ?? "1d") as Range;
  const range: Range = VALID.includes(raw) ? raw : "1d";
  const series = await incomeSeries(range);
  return NextResponse.json(series);
}
