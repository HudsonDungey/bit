import {
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient,
  type Transport,
  type Chain,
} from "viem";

import { PAY_MANAGER_ABI } from "./abi.js";

// ─── PayManagerClient ─────────────────────────────────────────────────────────

export interface PayManagerClientConfig {
  contractAddress: Address;
  pub: PublicClient;
  wallet?: WalletClient<Transport, Chain>;
}

export class PayManagerClient {
  readonly contractAddress: Address;

  private readonly pub: PublicClient;
  private readonly wal: WalletClient<Transport, Chain> | undefined;

  constructor(config: PayManagerClientConfig) {
    this.contractAddress = config.contractAddress;
    this.pub             = config.pub;
    this.wal             = config.wallet;
  }

  // ─── Payee registry ───────────────────────────────────────────────────────

  /** Add a payee to the caller's registry. */
  async addPayee(payee: Address, label: string): Promise<Hash> {
    const wal = this.requireWallet();
    const [account] = await wal.getAddresses();
    const chain = wal.chain as Chain;

    const txHash = await wal.writeContract({
      address: this.contractAddress,
      abi: PAY_MANAGER_ABI,
      functionName: "addPayee",
      args: [payee, label],
      account,
      chain,
    });

    await this.pub.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }

  /** Remove a payee from the caller's registry. */
  async removePayee(payee: Address): Promise<Hash> {
    const wal = this.requireWallet();
    const [account] = await wal.getAddresses();
    const chain = wal.chain as Chain;

    const txHash = await wal.writeContract({
      address: this.contractAddress,
      abi: PAY_MANAGER_ABI,
      functionName: "removePayee",
      args: [payee],
      account,
      chain,
    });

    await this.pub.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }

  /** Return all payees and labels for a given user address. */
  async getPayees(user: Address): Promise<Array<{ address: Address; label: string }>> {
    const result = await this.pub.readContract({
      address: this.contractAddress,
      abi: PAY_MANAGER_ABI,
      functionName: "getPayees",
      args: [user],
    }) as [Address[], string[]];

    const [addrs, labels] = result;
    return addrs.map((address, i) => ({ address, label: labels[i] ?? "" }));
  }

  // ─── Payments ─────────────────────────────────────────────────────────────

  /** Send `gross` tokens from caller to `to`, deducting 0.5% fee. */
  async pay(token: Address, to: Address, gross: bigint): Promise<Hash> {
    const wal = this.requireWallet();
    const [account] = await wal.getAddresses();
    const chain = wal.chain as Chain;

    const txHash = await wal.writeContract({
      address: this.contractAddress,
      abi: PAY_MANAGER_ABI,
      functionName: "pay",
      args: [token, to, gross],
      account,
      chain,
    });

    await this.pub.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }

  /** Batch payment to multiple recipients. */
  async payBatch(token: Address, recipients: Address[], amounts: bigint[]): Promise<Hash> {
    const wal = this.requireWallet();
    const [account] = await wal.getAddresses();
    const chain = wal.chain as Chain;

    const txHash = await wal.writeContract({
      address: this.contractAddress,
      abi: PAY_MANAGER_ABI,
      functionName: "payBatch",
      args: [token, recipients, amounts],
      account,
      chain,
    });

    await this.pub.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  private requireWallet(): WalletClient<Transport, Chain> {
    if (!this.wal) throw new Error("PayManagerClient: walletClient is required for write operations");
    return this.wal;
  }
}
