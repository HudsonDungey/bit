import { NextResponse } from "next/server";
import type { Hex } from "viem";
import { listSubscriptions } from "@/lib/chain-reads";
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
  const subId = ctx.params.id as Hex;
  if (!/^0x[0-9a-fA-F]{64}$/.test(subId)) {
    return NextResponse.json({ error: "invalid subscriptionId" }, { status: 400 });
  }

  // Read sub to find a caller authorized to cancel (customer OR merchant).
  // We pick whichever side we hold a private key for.
  const sub = await publicClient.readContract({
    address: MANAGER_ADDRESS,
    abi: managerAbi,
    functionName: "getSubscription",
    args: [subId],
  });
  if (!sub.active) {
    return NextResponse.json({ error: "subscription not active" }, { status: 400 });
  }

  const customer = accounts.find(
    (a) => a.address.toLowerCase() === sub.customer.toLowerCase(),
  );
  const merchant = accounts.find(
    (a) => a.address.toLowerCase() === sub.merchant.toLowerCase(),
  );
  const signer = customer ?? merchant;
  if (!signer) {
    return NextResponse.json(
      { error: "no signing key available for customer or merchant" },
      { status: 400 },
    );
  }

  try {
    const wallet = walletFor(signer.privateKey);
    const hash = await wallet.writeContract({
      address: MANAGER_ADDRESS,
      abi: managerAbi,
      functionName: "cancel",
      args: [subId],
      account: wallet.account!,
      chain: wallet.chain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    const subs = await listSubscriptions();
    const updated = subs.find((s) => s.id.toLowerCase() === subId.toLowerCase());
    return NextResponse.json(updated ?? { id: subId, status: "cancelled" });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
