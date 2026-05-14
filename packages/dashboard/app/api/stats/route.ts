import { NextResponse } from "next/server";
import { getStore, round2 } from "@/lib/store";
import { ensureSchedulerStarted } from "@/lib/scheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  ensureSchedulerStarted();
  const store = getStore();
  const successful = store.transactions.filter((t) => t.status === "success");
  const totalRevenue = round2(successful.reduce((s, t) => s + t.merchantAmount, 0));
  const totalFees = round2(successful.reduce((s, t) => s + t.fee, 0));
  const activeSubs = store.subscriptions.filter((s) => s.status === "active").length;
  const activePlans = store.plans.filter((p) => p.active).length;
  return NextResponse.json({
    totalRevenue,
    totalFees,
    totalCharges: successful.length,
    activeSubs,
    activePlans,
    recentTransactions: store.transactions.slice(0, 8),
  });
}
