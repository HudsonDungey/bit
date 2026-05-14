import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getStore } from "@/lib/store";
import { getPulseConfig } from "@/lib/config";
import { ensureSchedulerStarted } from "@/lib/scheduler";
import type { Plan } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  ensureSchedulerStarted();
  return NextResponse.json(getStore().plans);
}

export async function POST(req: Request) {
  ensureSchedulerStarted();
  const cfg = getPulseConfig();
  const store = getStore();
  const b = (await req.json().catch(() => ({}))) as Partial<Plan>;
  if (!b.name || !b.price || !b.intervalSeconds) {
    return NextResponse.json({ error: "name, price, intervalSeconds are required" }, { status: 400 });
  }
  const plan: Plan = {
    id: randomUUID(),
    name: String(b.name),
    description: String(b.description ?? ""),
    price: Number(b.price),
    intervalLabel: String(b.intervalLabel ?? `${b.intervalSeconds}s`),
    intervalSeconds: Number(b.intervalSeconds),
    feeBps: Number(b.feeBps ?? cfg.defaults.feeBps),
    cancelAfterCharges: b.cancelAfterCharges ? Number(b.cancelAfterCharges) : null,
    active: true,
    createdAt: new Date().toISOString(),
    isTestInterval: Number(b.intervalSeconds) < 300,
  };
  store.plans.push(plan);
  return NextResponse.json(plan, { status: 201 });
}
