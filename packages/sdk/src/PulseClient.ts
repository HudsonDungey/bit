import {
  createPublicClient,
  createWalletClient,
  http,
  parseEventLogs,
  type Address,
  type Chain,
  type Hash,
  type Hex,
  type PublicClient,
  type WalletClient,
  type Transport,
} from "viem";

import { PULSE_ABI, ERC20_ABI } from "./abi.js";
import type {
  Plan,
  Subscription,
  CreatePlanParams,
  SubscribeParams,
  ChargeResult,
} from "./types.js";
import { computeSubscriptionId } from "./helpers.js";

// ─── Client config ────────────────────────────────────────────────────────────

export interface PulseClientConfig {
  contractAddress: Address;
  chain: Chain;
  /** Provide a pre-built walletClient for write operations. */
  walletClient?: WalletClient<Transport, Chain>;
  /** Provide a pre-built publicClient for reads; auto-created otherwise. */
  publicClient?: PublicClient;
  /** RPC URL used when creating clients internally. */
  rpcUrl?: string;
}

// ─── PulseClient ─────────────────────────────────────────────────────────────

export class PulseClient {
  readonly contractAddress: Address;
  readonly chain: Chain;

  private readonly pub: PublicClient;
  private readonly wal: WalletClient<Transport, Chain> | undefined;

  constructor(config: PulseClientConfig) {
    this.contractAddress = config.contractAddress;
    this.chain           = config.chain;
    this.wal             = config.walletClient;

    this.pub = config.publicClient ?? createPublicClient({
      chain: config.chain,
      transport: http(config.rpcUrl),
    });
  }

  // ─── Reads ─────────────────────────────────────────────────────────────────

  async getPlan(planId: Hex): Promise<Plan> {
    const raw = await this.pub.readContract({
      address: this.contractAddress,
      abi: PULSE_ABI,
      functionName: "getPlan",
      args: [planId],
    }) as { merchant: Address; token: Address; amount: bigint; period: bigint; feeBps: number; active: boolean };
    return {
      merchant: raw.merchant,
      token:    raw.token,
      amount:   raw.amount,
      period:   raw.period,
      feeBps:   raw.feeBps,
      active:   raw.active,
    };
  }

  async getSubscription(subscriptionId: Hex): Promise<Subscription> {
    const raw = await this.pub.readContract({
      address: this.contractAddress,
      abi: PULSE_ABI,
      functionName: "getSubscription",
      args: [subscriptionId],
    }) as {
      customer: Address; merchant: Address; token: Address;
      amount: bigint; period: bigint; nextChargeAt: bigint;
      totalSpendCap: bigint; totalSpent: bigint; feeBps: number; active: boolean;
    };
    return {
      customer:      raw.customer,
      merchant:      raw.merchant,
      token:         raw.token,
      amount:        raw.amount,
      period:        raw.period,
      nextChargeAt:  raw.nextChargeAt,
      totalSpendCap: raw.totalSpendCap,
      totalSpent:    raw.totalSpent,
      feeBps:        raw.feeBps,
      active:        raw.active,
    };
  }

  async getTokenBalance(token: Address, account: Address): Promise<bigint> {
    return this.pub.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account],
    }) as Promise<bigint>;
  }

  async getTokenAllowance(token: Address, owner: Address, spender: Address): Promise<bigint> {
    return this.pub.readContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [owner, spender],
    }) as Promise<bigint>;
  }

  /**
   * Compute the executor fee preview for a subscription without sending a tx.
   * Returns gross * EXECUTOR_FEE_BPS / 10_000.
   */
  async getExecutorFeePreview(subscriptionId: Hex): Promise<bigint> {
    const sub = await this.getSubscription(subscriptionId);
    const executorFeeBps = await this.pub.readContract({
      address: this.contractAddress,
      abi: PULSE_ABI,
      functionName: "EXECUTOR_FEE_BPS",
      args: [],
    }) as number;
    return (sub.amount * BigInt(executorFeeBps)) / 10_000n;
  }

  /**
   * Compute the deterministic subscription id for a (planId, customer) pair.
   */
  async computeSubId(planId: Hex, customer: Address): Promise<Hex> {
    return this.pub.readContract({
      address: this.contractAddress,
      abi: PULSE_ABI,
      functionName: "computeSubId",
      args: [planId, customer],
    }) as Promise<Hex>;
  }

  // ─── Writes (require walletClient) ────────────────────────────────────────

  /** Create a subscription plan.  Caller becomes the plan's merchant. */
  async createPlan(params: CreatePlanParams): Promise<{ txHash: Hash; planId: Hex }> {
    const wal = this.requireWallet();
    const [account] = await wal.getAddresses();

    const txHash = await wal.writeContract({
      address: this.contractAddress,
      abi: PULSE_ABI,
      functionName: "createPlan",
      args: [
        params.token,
        params.amount,
        params.period,
        params.feeBps,
      ],
      account,
      chain: this.chain,
    });

    const receipt = await this.pub.waitForTransactionReceipt({ hash: txHash });
    const logs = parseEventLogs({ abi: PULSE_ABI, logs: receipt.logs });
    const planCreated = logs.find((l) => l.eventName === "PlanCreated");
    if (!planCreated) throw new Error("PlanCreated event not found in receipt");

    return { txHash, planId: (planCreated.args as { planId: Hex }).planId };
  }

  /**
   * Subscribe to a plan.
   * The caller (customer) must have already approved this contract to spend
   * at least `totalSpendCap` of the plan's token.
   */
  async subscribe(params: SubscribeParams): Promise<{ txHash: Hash; subscriptionId: Hex }> {
    const wal = this.requireWallet();
    const [account] = await wal.getAddresses();

    const txHash = await wal.writeContract({
      address: this.contractAddress,
      abi: PULSE_ABI,
      functionName: "subscribe",
      args: [params.planId, params.totalSpendCap],
      account,
      chain: this.chain,
    });

    await this.pub.waitForTransactionReceipt({ hash: txHash });

    const subscriptionId = computeSubscriptionId(params.planId, account);
    return { txHash, subscriptionId };
  }

  /** Approve the Pulse contract to spend the plan's token on behalf of the caller. */
  async approveToken(token: Address, amount: bigint): Promise<Hash> {
    const wal = this.requireWallet();
    const [account] = await wal.getAddresses();

    const txHash = await wal.writeContract({
      address: token,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [this.contractAddress, amount],
      account,
      chain: this.chain,
    });

    await this.pub.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }

  /**
   * Charge a subscription.  Permissionless — caller earns executor fee.
   * Returns the full ChargeExecuted event data parsed from the receipt.
   */
  async charge(subscriptionId: Hex): Promise<ChargeResult> {
    const wal = this.requireWallet();
    const [account] = await wal.getAddresses();

    const txHash = await wal.writeContract({
      address: this.contractAddress,
      abi: PULSE_ABI,
      functionName: "charge",
      args: [subscriptionId],
      account,
      chain: this.chain,
    });

    const receipt = await this.pub.waitForTransactionReceipt({ hash: txHash });
    const logs = parseEventLogs({ abi: PULSE_ABI, logs: receipt.logs });
    const chargeLog = logs.find((l) => l.eventName === "ChargeExecuted");

    if (chargeLog) {
      const args = chargeLog.args as {
        gross: bigint; merchantAmount: bigint;
        executorFee: bigint; protocolFee: bigint; nextChargeAt: bigint;
      };
      return {
        txHash,
        executorFee:    args.executorFee,
        protocolFee:    args.protocolFee,
        merchantAmount: args.merchantAmount,
        gross:          args.gross,
        nextChargeAt:   args.nextChargeAt,
      };
    }

    // Subscription was auto-cancelled due to spend cap — return zeroed fees
    return { txHash, executorFee: 0n, protocolFee: 0n, merchantAmount: 0n, gross: 0n, nextChargeAt: 0n };
  }

  /** Cancel a subscription.  Must be called by the subscriber or merchant. */
  async cancel(subscriptionId: Hex): Promise<Hash> {
    const wal = this.requireWallet();
    const [account] = await wal.getAddresses();

    const txHash = await wal.writeContract({
      address: this.contractAddress,
      abi: PULSE_ABI,
      functionName: "cancel",
      args: [subscriptionId],
      account,
      chain: this.chain,
    });

    await this.pub.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }

  /** Deactivate a plan.  Must be called by the plan's merchant. */
  async deactivatePlan(planId: Hex): Promise<Hash> {
    const wal = this.requireWallet();
    const [account] = await wal.getAddresses();

    const txHash = await wal.writeContract({
      address: this.contractAddress,
      abi: PULSE_ABI,
      functionName: "deactivatePlan",
      args: [planId],
      account,
      chain: this.chain,
    });

    await this.pub.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  private requireWallet(): WalletClient<Transport, Chain> {
    if (!this.wal) throw new Error("PulseClient: walletClient is required for write operations");
    return this.wal;
  }
}
