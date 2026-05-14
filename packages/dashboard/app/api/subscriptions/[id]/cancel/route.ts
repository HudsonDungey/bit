import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const sub = getStore().subscriptions.find((s) => s.id === ctx.params.id);
  if (!sub) return NextResponse.json({ error: "subscription not found" }, { status: 404 });
  sub.status = "cancelled";
  return NextResponse.json(sub);
}
