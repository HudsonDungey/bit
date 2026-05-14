import { NextResponse } from "next/server";
import type { Hex } from "viem";
import { chargeOnce } from "@/lib/chain-reads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const subId = ctx.params.id as Hex;
  if (!/^0x[0-9a-fA-F]{64}$/.test(subId)) {
    return NextResponse.json({ error: "invalid subscriptionId" }, { status: 400 });
  }
  try {
    const txHash = await chargeOnce(subId);
    return NextResponse.json({ txHash });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
