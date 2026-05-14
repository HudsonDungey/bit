import { NextResponse } from "next/server";
import type { Hex } from "viem";
import { listPlans } from "@/lib/chain-reads";
import {
  publicClient,
  walletFor,
  accounts,
  MANAGER_ADDRESS,
  managerAbi,
} from "@/lib/chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const planId = ctx.params.id as Hex;
  if (!/^0x[0-9a-fA-F]{64}$/.test(planId)) {
    return NextResponse.json({ error: "invalid planId" }, { status: 400 });
  }

  // Merchant (anvil[0]) is the only one allowed to deactivate.
  const merchant = accounts[0];
  const wallet = walletFor(merchant.privateKey);
  try {
    const hash = await wallet.writeContract({
      address: MANAGER_ADDRESS,
      abi: managerAbi,
      functionName: "deactivatePlan",
      args: [planId],
      account: wallet.account!,
      chain: wallet.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    const plans = await listPlans();
    const updated = plans.find((p) => p.id.toLowerCase() === planId.toLowerCase());
    return NextResponse.json(updated ?? { id: planId, active: false });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
