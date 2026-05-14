import { NextResponse } from "next/server";
import type { Hex } from "viem";
import { decodeEventLog } from "viem";
import { getStore } from "@/lib/store";
import { ensureSchedulerStarted } from "@/lib/scheduler";
import { listSubscriptions } from "@/lib/chain-reads";
import {
  publicClient,
  walletFor,
  findAccount,
  MANAGER_ADDRESS,
  managerAbi,
  usdcUnits,
} from "@/lib/chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  ensureSchedulerStarted();
  const subs = await listSubscriptions();
  return NextResponse.json(subs);
}

export async function POST(req: Request) {
  ensureSchedulerStarted();
  const store = getStore();
  const b = (await req.json().catch(() => ({}))) as {
    planId?: string;
    customer?: string;
    spendCap?: number | null;
  };

  if (!b.planId || !/^0x[0-9a-fA-F]{64}$/.test(b.planId)) {
    return NextResponse.json({ error: "valid planId required" }, { status: 400 });
  }
  if (!b.customer) {
    return NextResponse.json({ error: "customer is required" }, { status: 400 });
  }

  const acct = findAccount(b.customer);
  if (!acct) {
    return NextResponse.json(
      {
        error:
          "customer must be one of the funded anvil accounts. " +
          "GET /api/accounts to see the list.",
      },
      { status: 400 },
    );
  }

  const planId = b.planId as Hex;
  const totalSpendCap = b.spendCap ? usdcUnits(Number(b.spendCap)) : 0n;
  const wallet = walletFor(acct.privateKey);

  try {
    const hash = await wallet.writeContract({
      address: MANAGER_ADDRESS,
      abi: managerAbi,
      functionName: "subscribe",
      args: [planId, totalSpendCap],
      account: wallet.account!,
      chain: wallet.chain,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    let subId: Hex | undefined;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: managerAbi, data: log.data, topics: log.topics });
        if (decoded.eventName === "Subscribed") {
          subId = (decoded.args as { subscriptionId: Hex }).subscriptionId;
          break;
        }
      } catch {
        // skip
      }
    }
    if (!subId) {
      return NextResponse.json({ error: "Subscribed event not found" }, { status: 500 });
    }

    store.subMeta.set(subId.toLowerCase(), { createdAt: new Date().toISOString() });
    const subs = await listSubscriptions();
    const created = subs.find((s) => s.id.toLowerCase() === subId!.toLowerCase());
    return NextResponse.json(created ?? { id: subId }, { status: 201 });
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    if (msg.includes("AlreadySubscribed")) {
      return NextResponse.json({ error: "already subscribed" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
