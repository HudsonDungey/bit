// Minimal hardhat type stubs for local typechecking.
declare module "hardhat" {
  interface HardhatRuntimeEnvironment {
    network: {
      provider: import("viem").EIP1193Provider;
      name: string;
    };
    run(task: string, args?: Record<string, unknown>): Promise<void>;
    artifacts: {
      readArtifact(contractName: string): Promise<{
        abi: readonly object[];
        bytecode: string;
        contractName: string;
      }>;
    };
  }

  const hre: HardhatRuntimeEnvironment;
  export default hre;
}

declare module "hardhat/config" {
  export interface HardhatUserConfig {
    solidity?: string | { version: string; settings?: Record<string, unknown> };
    paths?: {
      sources?: string;
      tests?: string;
      cache?: string;
      artifacts?: string;
    };
    networks?: Record<string, {
      accounts?: { mnemonic: string } | string[];
      chainId?: number;
      url?: string;
    }>;
  }
}
