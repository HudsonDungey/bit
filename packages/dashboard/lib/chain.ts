import { createPublicClient, createWalletClient, http, type Hex, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import deployments from "./deployments.json";
import { managerAbi, erc20Abi } from "./abis";

export const anvil = defineChain({
  id: deployments.chainId,
  name: "Anvil",
  network: "anvil",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [deployments.rpcUrl] }, public: { http: [deployments.rpcUrl] } },
});

export const publicClient = createPublicClient({ chain: anvil, transport: http(deployments.rpcUrl) });

export interface AnvilAccount {
  name: string;
  address: Address;
  privateKey: Hex;
}

export const accounts: AnvilAccount[] = deployments.accounts as AnvilAccount[];

export const MANAGER_ADDRESS = deployments.manager as Address;
export const USDC_ADDRESS = deployments.usdc as Address;
export const DEPLOYER_ADDRESS = deployments.deployer as Address;
export const FEE_RECIPIENT = deployments.feeRecipient as Address;

export function walletFor(privateKey: Hex) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({ account, chain: anvil, transport: http(deployments.rpcUrl) });
}

export function findAccount(address: string): AnvilAccount | undefined {
  return accounts.find((a) => a.address.toLowerCase() === address.toLowerCase());
}

export { managerAbi, erc20Abi };

/// Convert a USDC display amount (e.g. 9.99) to base units (6 decimals).
export function usdcUnits(display: number): bigint {
  return BigInt(Math.round(display * 1_000_000));
}

/// Convert USDC base units back to a display number.
export function usdcDisplay(units: bigint): number {
  return Number(units) / 1_000_000;
}
