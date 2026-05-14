import { NextResponse } from "next/server";
import { ensureSchedulerStarted } from "@/lib/scheduler";
import { listPlans } from "@/lib/chain-reads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  ensureSchedulerStarted();
  const plans = await listPlans();
  return NextResponse.json(plans);
}

/// POST /api/plans previously signed `manager.createPlan` from the deployer's
/// private key (anvil flow). On Sepolia, plan creation must be signed by the
/// connected merchant wallet — see `lib/api-write.ts` + `usePlanWrite()`.
/// This endpoint now only accepts the off-chain metadata (name, description,
/// intervalLabel) AFTER the on-chain tx has confirmed, so we can show readable
/// names instead of `Plan 0x12345…` in the UI.
export async function POST(req: Request) {
  ensureSchedulerStarted();
  const { getStore } = await import("@/lib/store");
  const store = getStore();
  const b = (await req.json().catch(() => ({}))) as {
    planId?: string;
    name?: string;
    description?: string;
    intervalLabel?: string;
    intervalSeconds?: number;
    cancelAfterCharges?: number | null;
  };
  if (!b.planId || !/^0x[0-9a-fA-F]{64}$/.test(b.planId)) {
    return NextResponse.json({ error: "planId is required" }, { status: 400 });
  }
  store.planMeta.set(b.planId.toLowerCase(), {
    name: String(b.name ?? ""),
    description: String(b.description ?? ""),
    intervalLabel: String(b.intervalLabel ?? `${b.intervalSeconds ?? 0}s`),
    cancelAfterCharges: b.cancelAfterCharges ? Number(b.cancelAfterCharges) : null,
    isTestInterval: Number(b.intervalSeconds ?? 0) < 300,
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
