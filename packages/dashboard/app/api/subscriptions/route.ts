import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getStore } from "@/lib/store";
import { ensureSchedulerStarted } from "@/lib/scheduler";
import type { Subscription } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  ensureSchedulerStarted();
  return NextResponse.json(getStore().subscriptions);
}

export async function POST(req: Request) {
  ensureSchedulerStarted();
  const store = getStore();
  const b = (await req.json().catch(() => ({}))) as {
    planId?: string;
    customer?: string;
    spendCap?: number | null;
  };
  const plan = store.plans.find((p) => p.id === b.planId && p.active);
  if (!plan) return NextResponse.json({ error: "plan not found or inactive" }, { status: 400 });
  if (!b.customer) return NextResponse.json({ error: "customer is required" }, { status: 400 });

  const exists = store.subscriptions.find(
    (s) => s.planId === b.planId && s.customer === b.customer && s.status === "active",
  );
  if (exists) return NextResponse.json({ error: "already subscribed" }, { status: 409 });

  const sub: Subscription = {
    id: randomUUID(),
    planId: plan.id,
    planName: plan.name,
    customer: String(b.customer),
    spendCap: b.spendCap ? Number(b.spendCap) : null,
    chargeCount: 0,
    totalPaid: 0,
    nextChargeAt: Date.now() / 1000,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  store.subscriptions.push(sub);
  return NextResponse.json(sub, { status: 201 });
}
