import { NextResponse } from "next/server";
import { ensureSchedulerStarted } from "@/lib/scheduler";
import { listSubscriptions } from "@/lib/chain-reads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  ensureSchedulerStarted();
  const subs = await listSubscriptions();
  return NextResponse.json(subs);
}

/// On Sepolia, subscribing must be signed by the customer's connected wallet.
/// This endpoint now only records off-chain subscription metadata (createdAt)
/// after the on-chain `Subscribed` event has fired.
export async function POST(req: Request) {
  ensureSchedulerStarted();
  const { getStore } = await import("@/lib/store");
  const store = getStore();
  const b = (await req.json().catch(() => ({}))) as { subscriptionId?: string };
  if (!b.subscriptionId || !/^0x[0-9a-fA-F]{64}$/.test(b.subscriptionId)) {
    return NextResponse.json({ error: "subscriptionId is required" }, { status: 400 });
  }
  store.subMeta.set(b.subscriptionId.toLowerCase(), { createdAt: new Date().toISOString() });
  return NextResponse.json({ ok: true }, { status: 201 });
}
