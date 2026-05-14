import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { ensureSchedulerStarted } from "@/lib/scheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  ensureSchedulerStarted();
  const url = new URL(req.url);
  const planId = url.searchParams.get("planId");
  const customer = url.searchParams.get("customer");
  const status = url.searchParams.get("status");

  let result = getStore().transactions;
  if (planId) result = result.filter((t) => t.planId === planId);
  if (customer) result = result.filter((t) => t.customer.includes(customer));
  if (status) result = result.filter((t) => t.status === status);
  return NextResponse.json(result);
}
