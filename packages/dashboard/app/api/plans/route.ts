import { NextResponse } from "next/server";
import { decodeEventLog, type Hex } from "viem";
import { getStore } from "@/lib/store";
import { getPulseConfig } from "@/lib/config";
import { ensureSchedulerStarted } from "@/lib/scheduler";
import { listPlans } from "@/lib/chain-reads";
import {
  publicClient,
  walletFor,
  accounts,
  MANAGER_ADDRESS,
  USDC_ADDRESS,
  managerAbi,
  usdcUnits,
} from "@/lib/chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  ensureSchedulerStarted();
  const plans = await listPlans();
  return NextResponse.json(plans);
}

export async function POST(req: Request) {
  ensureSchedulerStarted();
  const cfg = getPulseConfig();
  const store = getStore();

  const b = (await req.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
    price?: number;
    intervalLabel?: string;
    intervalSeconds?: number;
    feeBps?: number;
    cancelAfterCharges?: number | null;
  };

  if (!b.name || !b.price || !b.intervalSeconds) {
    return NextResponse.json(
      { error: "name, price, intervalSeconds are required" },
      { status: 400 },
    );
  }

  const amount = usdcUnits(Number(b.price));
  const period = BigInt(Number(b.intervalSeconds));
  const feeBps = Number(b.feeBps ?? cfg.defaults.feeBps);
  if (amount <= 0n) return NextResponse.json({ error: "price must be > 0" }, { status: 400 });
  if (period <= 0n) return NextResponse.json({ error: "interval must be > 0" }, { status: 400 });
  if (feeBps < 0 || feeBps > 10_000) {
    return NextResponse.json({ error: "feeBps must be 0..10000" }, { status: 400 });
  }

  // Deployer (anvil[0]) is the merchant for all plans in this testbed.
  const merchant = accounts[0];
  const wallet = walletFor(merchant.privateKey);

  try {
    const hash = await wallet.writeContract({
      address: MANAGER_ADDRESS,
      abi: managerAbi,
      functionName: "createPlan",
      args: [USDC_ADDRESS, amount, period, feeBps],
      account: wallet.account!,
      chain: wallet.chain,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    let planId: Hex | undefined;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: managerAbi, data: log.data, topics: log.topics });
        if (decoded.eventName === "PlanCreated") {
          planId = (decoded.args as { planId: Hex }).planId;
          break;
        }
      } catch {
        // not a manager log
      }
    }
    if (!planId) {
      return NextResponse.json({ error: "PlanCreated event not found" }, { status: 500 });
    }

    store.planMeta.set(planId.toLowerCase(), {
      name: String(b.name),
      description: String(b.description ?? ""),
      intervalLabel: String(b.intervalLabel ?? `${b.intervalSeconds}s`),
      cancelAfterCharges: b.cancelAfterCharges ? Number(b.cancelAfterCharges) : null,
      isTestInterval: Number(b.intervalSeconds) < 300,
      createdAt: new Date().toISOString(),
    });

    const plans = await listPlans();
    const created = plans.find((p) => p.id.toLowerCase() === planId!.toLowerCase());
    return NextResponse.json(created ?? { id: planId }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
