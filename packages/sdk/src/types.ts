import type { Address, Hash, Hex } from "viem";

// ─── On-chain structs (mirrors Solidity) ─────────────────────────────────────

export interface Plan {
  merchant: Address;
  token: Address;
  /** Gross amount (fee-inclusive) per charge, in token's smallest unit. */
  amount: bigint;
  /** Minimum seconds between charges. */
  period: bigint;
  /** Protocol fee in basis points (100 = 1 %). */
  feeBps: number;
  active: boolean;
}

export interface Subscription {
  customer: Address;
  merchant: Address;
  token: Address;
  /** Denormalized amount from plan at subscribe time. */
  amount: bigint;
  /** Denormalized period from plan at subscribe time. */
  period: bigint;
  /** Unix timestamp of the next allowed charge. */
  nextChargeAt: bigint;
  /** Opt-in lifetime spend limit; 0n = unlimited. */
  totalSpendCap: bigint;
  /** Cumulative gross amount charged so far. */
  totalSpent: bigint;
  /** Denormalized feeBps from plan at subscribe time. */
  feeBps: number;
  active: boolean;
}

// ─── SDK params ──────────────────────────────────────────────────────────────

export interface CreatePlanParams {
  token: Address;
  amount: bigint;
  period: bigint;
  feeBps: number;
}

export interface SubscribeParams {
  planId: Hex;
  /** 0n = unlimited */
  totalSpendCap: bigint;
}

// ─── ChargeResult ─────────────────────────────────────────────────────────────

export interface ChargeResult {
  txHash: Hash;
  executorFee: bigint;
  protocolFee: bigint;
  merchantAmount: bigint;
  gross: bigint;
  nextChargeAt: bigint;
}

// ─── Webhook types ────────────────────────────────────────────────────────────

export type PulseEventType =
  | "subscription.created"
  | "subscription.charged"
  | "subscription.cancelled"
  | "plan.deactivated";

export interface PulseEvent {
  id: string;
  type: PulseEventType;
  createdAt: number; // unix seconds
  data: SubscriptionChargedData | SubscriptionCreatedData | Record<string, unknown>;
}

export interface SubscriptionChargedData {
  subscriptionId: Hex;
  planId: Hex;
  customer: Address;
  merchant: Address;
  /** Net merchant amount in token's smallest unit. */
  amount: string;
  fee: string;
  txHash: Hash;
  nextChargeAt: number;
  chainId: number;
}

export interface SubscriptionCreatedData {
  subscriptionId: Hex;
  planId: Hex;
  customer: Address;
  totalSpendCap: string;
  chainId: number;
}
