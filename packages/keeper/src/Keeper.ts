import type { Address, Hex, PublicClient, WalletClient, Transport, Chain } from "viem";
import { PULSE_ABI } from "@pulse/sdk";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KeeperConfig {
  contractAddress: Address;
  walletClient: WalletClient<Transport, Chain>;
  publicClient: PublicClient;
  /** How often to scan for due subscriptions (ms). Default 15 000. */
  pollIntervalMs?: number;
  /** Block to start scanning from. Default 0n. */
  fromBlock?: bigint;
}

interface SubState {
  subId: Hex;
  nextChargeAt: bigint;
  active: boolean;
}

// ─── Keeper ───────────────────────────────────────────────────────────────────

/**
 * Permissionless keeper bot.
 *
 * Scans for due subscriptions via event logs and calls charge(subId).
 * Earns EXECUTOR_FEE_BPS (0.1%) on every successful charge.
 *
 * Infrastructure: optional.  Protocol correctness never depends on this.
 */
export class Keeper {
  private readonly cfg: Required<KeeperConfig>;
  private timer: ReturnType<typeof setInterval> | null = null;
  /** Last block we scanned up to (exclusive upper bound for next scan). */
  private checkpoint: bigint;

  constructor(config: KeeperConfig) {
    this.cfg = {
      ...config,
      pollIntervalMs: config.pollIntervalMs ?? 15_000,
      fromBlock:       config.fromBlock      ?? 0n,
    };
    this.checkpoint = this.cfg.fromBlock;
  }

  /** Start the periodic keeper loop. */
  start(): void {
    if (this.timer !== null) return; // already running
    this.timer = setInterval(() => {
      this.tick().catch((err: unknown) => {
        console.error("[Keeper] tick error:", err);
      });
    }, this.cfg.pollIntervalMs);
    // Run immediately
    this.tick().catch((err: unknown) => {
      console.error("[Keeper] initial tick error:", err);
    });
  }

  /** Stop the keeper loop. */
  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * One iteration:
   *  1. Fetch all Subscribed events since checkpoint.
   *  2. Fetch all Cancelled + ChargeExecuted events since checkpoint.
   *  3. Build active subscription map; update nextChargeAt from ChargeExecuted.
   *  4. Filter: block.timestamp >= nextChargeAt.
   *  5. For each due sub: call charge(subId), catch and log errors.
   *  6. Advance checkpoint to latest block.
   */
  async tick(): Promise<void> {
    const { publicClient: pub, walletClient: wal, contractAddress } = this.cfg;

    const latestBlock = await pub.getBlockNumber();
    if (latestBlock < this.checkpoint) return;

    const fromBlock = this.checkpoint;
    const toBlock   = latestBlock;

    // ── 1. Fetch Subscribed events ─────────────────────────────────────────
    const subscribedLogs = await pub.getLogs({
      address: contractAddress,
      event:   { type: "event", name: "Subscribed",
        inputs: [
          { name: "subscriptionId", type: "bytes32", indexed: true },
          { name: "planId",         type: "bytes32", indexed: true },
          { name: "customer",       type: "address", indexed: true },
          { name: "totalSpendCap",  type: "uint256", indexed: false },
        ] },
      fromBlock,
      toBlock,
    });

    // ── 2. Fetch Cancelled and ChargeExecuted ──────────────────────────────
    const [cancelledLogs, chargeLogs] = await Promise.all([
      pub.getLogs({
        address: contractAddress,
        event: { type: "event", name: "Cancelled",
          inputs: [
            { name: "subscriptionId", type: "bytes32", indexed: true },
            { name: "caller",         type: "address", indexed: true },
          ] },
        fromBlock,
        toBlock,
      }),
      pub.getLogs({
        address: contractAddress,
        event: { type: "event", name: "ChargeExecuted",
          inputs: [
            { name: "subscriptionId", type: "bytes32", indexed: true },
            { name: "executor",       type: "address", indexed: true },
            { name: "customer",       type: "address", indexed: true },
            { name: "gross",          type: "uint256", indexed: false },
            { name: "merchantAmount", type: "uint256", indexed: false },
            { name: "executorFee",    type: "uint256", indexed: false },
            { name: "protocolFee",    type: "uint256", indexed: false },
            { name: "nextChargeAt",   type: "uint256", indexed: false },
          ] },
        fromBlock,
        toBlock,
      }),
    ]);

    // ── 3. Build active sub map ────────────────────────────────────────────
    const subs = new Map<Hex, SubState>();

    for (const log of subscribedLogs) {
      const subId = (log as { args?: { subscriptionId?: Hex } }).args?.subscriptionId;
      if (!subId) continue;
      if (!subs.has(subId)) {
        subs.set(subId, { subId, nextChargeAt: 0n, active: true });
      }
    }

    for (const log of cancelledLogs) {
      const subId = (log as { args?: { subscriptionId?: Hex } }).args?.subscriptionId;
      if (subId && subs.has(subId)) {
        subs.get(subId)!.active = false;
      }
    }

    for (const log of chargeLogs) {
      const args = (log as { args?: { subscriptionId?: Hex; nextChargeAt?: bigint } }).args;
      const subId = args?.subscriptionId;
      if (subId && subs.has(subId) && args?.nextChargeAt !== undefined) {
        subs.get(subId)!.nextChargeAt = args.nextChargeAt;
      }
    }

    // ── 4. Filter due subscriptions ────────────────────────────────────────
    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    const due = [...subs.values()].filter(
      (s) => s.active && nowSec >= s.nextChargeAt
    );

    if (due.length === 0) {
      this.checkpoint = toBlock + 1n;
      return;
    }

    // ── 5. Charge each due subscription ───────────────────────────────────
    const [account] = await wal.getAddresses();
    const chain = wal.chain as Chain;

    for (const sub of due) {
      try {
        const txHash = await wal.writeContract({
          address: contractAddress,
          abi: PULSE_ABI,
          functionName: "charge",
          args: [sub.subId],
          account,
          chain,
        });
        console.log(`[Keeper] charged ${sub.subId.slice(0, 10)}… tx=${txHash}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[Keeper] charge failed for ${sub.subId.slice(0, 10)}…: ${msg}`);
      }
    }

    // ── 6. Advance checkpoint ──────────────────────────────────────────────
    this.checkpoint = toBlock + 1n;
  }
}
