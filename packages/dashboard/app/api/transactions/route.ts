import { NextResponse } from "next/server";
import { ensureSchedulerStarted } from "@/lib/scheduler";
import { listTransactions } from "@/lib/chain-reads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  ensureSchedulerStarted();
  const url = new URL(req.url);
  const planId = url.searchParams.get("planId")?.toLowerCase();
  const customer = url.searchParams.get("customer")?.toLowerCase();
  const status = url.searchParams.get("status");

  let result = await listTransactions();
  if (planId)   result = result.filter((t) => t.planId.toLowerCase() === planId);
  if (customer) result = result.filter((t) => t.customer.toLowerCase().includes(customer));
  if (status)   result = result.filter((t) => t.status === status);
  return NextResponse.json(result);
}
