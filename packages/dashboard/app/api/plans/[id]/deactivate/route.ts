import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const store = getStore();
  const plan = store.plans.find((p) => p.id === ctx.params.id);
  if (!plan) return NextResponse.json({ error: "plan not found" }, { status: 404 });
  plan.active = false;
  store.subscriptions
    .filter((s) => s.planId === plan.id && s.status === "active")
    .forEach((s) => (s.status = "cancelled"));
  return NextResponse.json(plan);
}
