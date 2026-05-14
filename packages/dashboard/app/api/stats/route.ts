import { NextResponse } from "next/server";
import { ensureSchedulerStarted } from "@/lib/scheduler";
import { listPlans, listSubscriptions, listTransactions } from "@/lib/chain-reads";
import { round2 } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  ensureSchedulerStarted();
  const [plans, subs, txs] = await Promise.all([
    listPlans(),
    listSubscriptions(),
    listTransactions(),
  ]);
  const successful = txs.filter((t) => t.status === "success");
  const totalRevenue = round2(successful.reduce((s, t) => s + t.merchantAmount, 0));
  const totalFees = round2(successful.reduce((s, t) => s + t.fee, 0));
  const activeSubs = subs.filter((s) => s.status === "active").length;
  const activePlans = plans.filter((p) => p.active).length;
  return NextResponse.json({
    totalRevenue,
    totalFees,
    totalCharges: successful.length,
    activeSubs,
    activePlans,
    recentTransactions: txs.slice(0, 8),
  });
}
