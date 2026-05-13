import type { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      // Enable via-ir for better optimization (helps inline small functions)
      viaIR: false,
    },
  },
  paths: {
    sources: "./contracts/src",
    tests:   "./contracts/test",
    cache:   "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {
      // Deterministic accounts from the default test mnemonic
      // "test test test test test test test test test test test junk"
      accounts: { mnemonic: "test test test test test test test test test test test junk" },
      chainId: 31337,
    },
  },
};

export default config;
