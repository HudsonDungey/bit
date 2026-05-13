// Minimal viem type stubs for local typechecking without npm install.
// Replace with `npm install viem` in a real environment.
declare module "viem" {
  export type Hex = `0x${string}`;
  export type Address = `0x${string}`;
  export type Hash = `0x${string}`;

  export interface Chain {
    id: number;
    name: string;
    nativeCurrency: { name: string; symbol: string; decimals: number };
    rpcUrls: Record<string, { http: readonly string[] }>;
  }

  export interface Transport {}

  export interface Account {
    address: Address;
    type: string;
  }

  export interface TransactionReceipt {
    transactionHash: Hash;
    blockNumber: bigint;
    contractAddress: Address | null | undefined;
    logs: Log[];
    status: "success" | "reverted";
  }

  export interface Log {
    address: Address;
    topics: Hex[];
    data: Hex;
    logIndex: number | null;
    transactionHash: Hash | null;
  }

  // Simplified — production viem uses complex generics for ABI inference.
  export interface ReadContractParameters {
    address: Address;
    abi: readonly object[];
    functionName: string;
    args?: readonly unknown[];
  }

  export interface WriteContractParameters {
    address: Address;
    abi: readonly object[];
    functionName: string;
    args?: readonly unknown[];
    account: Account | Address;
    chain?: Chain;
  }

  export interface DeployContractParameters {
    abi: readonly object[];
    bytecode: Hex;
    args?: readonly unknown[];
    account?: Account | Address;
    chain?: Chain;
  }

  export interface PublicClient {
    readContract(params: ReadContractParameters): Promise<unknown>;
    waitForTransactionReceipt(params: { hash: Hash }): Promise<TransactionReceipt>;
    getChainId(): Promise<number>;
  }

  export interface WalletClient<_T = Transport, _C = Chain> {
    getAddresses(): Promise<Address[]>;
    writeContract(params: WriteContractParameters): Promise<Hash>;
    deployContract(params: DeployContractParameters): Promise<Hash>;
    sendTransaction(params: Record<string, unknown>): Promise<Hash>;
    transport: { request(args: { method: string; params?: unknown[] }): Promise<unknown> };
  }

  export type EIP1193Provider = {
    request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  };

  export function createPublicClient(config: {
    chain?: Chain;
    transport: Transport;
  }): PublicClient;

  export function createWalletClient<T extends Transport, C extends Chain>(config: {
    account?: Account | Address;
    chain?: C;
    transport: T;
  }): WalletClient<T, C>;

  export function http(url?: string): Transport;
  export function custom(provider: EIP1193Provider): Transport;

  export function keccak256(data: Hex | Uint8Array): Hex;
  export function encodePacked<T extends readonly string[]>(
    types: T,
    values: readonly unknown[],
  ): Hex;

  export function parseEventLogs(params: {
    abi: readonly object[];
    logs: Log[];
  }): Array<{ eventName: string; args: Record<string, unknown> }>;
}

declare module "viem/chains" {
  import type { Chain } from "viem";
  export const mainnet:  Chain;
  export const base:     Chain;
  export const arbitrum: Chain;
  export const hardhat:  Chain;
  export const foundry:  Chain;
}

declare module "viem/accounts" {
  import type { Account, Address } from "viem";

  export interface PrivateKeyAccount extends Account {}

  export function mnemonicToAccount(
    mnemonic: string,
    opts?: { addressIndex?: number; accountIndex?: number }
  ): PrivateKeyAccount;

  export function privateKeyToAccount(privateKey: `0x${string}`): PrivateKeyAccount;
}
