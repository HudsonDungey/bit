import {
  type Address,
  type PublicClient,
  type WalletClient,
  type Transport,
  type Chain,
} from "viem";

import { DELEGATE_7702_ABI } from "./abi.js";

// ─── DelegateInit typed data ──────────────────────────────────────────────────

export interface DelegateInitParams {
  manager: Address;
  token: Address;
  maxPerPeriod: bigint;
  periodDuration: bigint;
  expiry: bigint;
}

export interface DelegateInitTypedData {
  domain: {
    name: string;
    version: string;
    chainId: bigint;
    verifyingContract: Address;
  };
  types: {
    DelegateInit: Array<{ name: string; type: string }>;
  };
  primaryType: "DelegateInit";
  message: {
    manager: Address;
    token: Address;
    maxPerPeriod: bigint;
    periodDuration: bigint;
    nonce: bigint;
    expiry: bigint;
  };
}

// ─── DelegateClient ───────────────────────────────────────────────────────────

export interface DelegateClientConfig {
  /** Address of the deployed SubscriptionDelegate7702 implementation. */
  delegateAddress: Address;
  pub: PublicClient;
  wallet?: WalletClient<Transport, Chain>;
}

export class DelegateClient {
  readonly delegateAddress: Address;

  private readonly pub: PublicClient;
  private readonly wal: WalletClient<Transport, Chain> | undefined;

  constructor(config: DelegateClientConfig) {
    this.delegateAddress = config.delegateAddress;
    this.pub             = config.pub;
    this.wal             = config.wallet;
  }

  /**
   * Build EIP-712 typed data for a DelegateInit message.
   * The nonce is fetched from the EOA's current authEpoch so the signature
   * is always fresh.  The verifyingContract is the EOA address (not the
   * implementation), because when delegated, address(this) == EOA.
   *
   * @param eoaAddress  The EOA that will sign and delegate.
   * @param params      Init parameters (manager, token, caps, expiry).
   */
  async buildInitParams(
    eoaAddress: Address,
    params: DelegateInitParams
  ): Promise<DelegateInitTypedData> {
    // When the EOA has this delegate active, its code IS the delegate.
    // The domain verifyingContract is the EOA itself.
    const nonce = await this.pub.readContract({
      address: eoaAddress,      // EOA that has the delegate set
      abi: DELEGATE_7702_ABI,
      functionName: "authEpoch",
      args: [],
    }) as bigint;

    const chainId = BigInt(await this.pub.getChainId());

    return {
      domain: {
        name:              "SubscriptionDelegate7702",
        version:           "1",
        chainId,
        verifyingContract: eoaAddress,
      },
      types: {
        DelegateInit: [
          { name: "manager",        type: "address" },
          { name: "token",          type: "address" },
          { name: "maxPerPeriod",   type: "uint256" },
          { name: "periodDuration", type: "uint256" },
          { name: "nonce",          type: "uint256" },
          { name: "expiry",         type: "uint256" },
        ],
      },
      primaryType: "DelegateInit",
      message: {
        manager:        params.manager,
        token:          params.token,
        maxPerPeriod:   params.maxPerPeriod,
        periodDuration: params.periodDuration,
        nonce,
        expiry:         params.expiry,
      },
    };
  }

  /**
   * Check if an EOA is initialized (has an active delegation).
   * Reads isInitialized() from the EOA's delegate code.
   */
  async isInitialized(eoaAddress: Address): Promise<boolean> {
    try {
      return await this.pub.readContract({
        address: eoaAddress,
        abi: DELEGATE_7702_ABI,
        functionName: "isInitialized",
        args: [],
      }) as boolean;
    } catch {
      // EOA has no delegate code deployed — not initialized
      return false;
    }
  }

  /**
   * Get the remaining period allowance for a delegating EOA.
   */
  async getRemainingAllowance(eoaAddress: Address): Promise<bigint> {
    try {
      return await this.pub.readContract({
        address: eoaAddress,
        abi: DELEGATE_7702_ABI,
        functionName: "remainingPeriodAllowance",
        args: [],
      }) as bigint;
    } catch {
      return 0n;
    }
  }
}
