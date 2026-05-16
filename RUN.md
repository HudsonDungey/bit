# Pulse — quick run

All commands run from the repo root. Pick a flow:

- **[Local (anvil)](#local-anvil)** — fastest iteration, no real ETH, deterministic addresses
- **[Sepolia](#sepolia)** — real wallets, real RPC, real (test) ETH

Deep docs / troubleshooting / API reference: [`HOW-TO-OPERATE.md`](./HOW-TO-OPERATE.md).

---

## One-time install

```bash
yarn install
(cd contracts && forge install foundry-rs/forge-std --no-commit --no-git)   # only if lib/forge-std is missing
```

---

## Local (anvil)

Three terminals, copy-paste each block:

**Terminal A — chain**
```bash
yarn anvil
```

**Terminal B — deploy**
```bash
yarn deploy:anvil
```

**Terminal C — dashboard**
```bash
yarn dev
```

Open <http://localhost:3001>. Import an anvil key into MetaMask and add network `http://127.0.0.1:8545` (chain id `31337`). Done.

Anvil addresses are deterministic — already wired in `packages/dashboard/lib/deployments.json`, no edits needed.

**Reset everything:**
```bash
yarn reset
```

---

## Sepolia

### 1. Fill in two files

```bash
cp contracts/.env.example                       contracts/.env
cp packages/dashboard/.env.local.example        packages/dashboard/.env.local
cp packages/dashboard/pulse.local.example.json  packages/dashboard/pulse.local.json
```

Edit `contracts/.env` — set `PRIVATE_KEY` (deployer EOA, needs Sepolia ETH) and `SEPOLIA_RPC_URL` (full Alchemy URL).

### 2. Deploy

```bash
yarn deploy:sepolia
```

The script prints **manager**, **usdc**, **feeRecipient**, **deploymentBlock**. Copy them.

### 3. Wire the dashboard

Paste those four values into `packages/dashboard/pulse.local.json` under `contracts.*` and `deploymentBlock`. Set `merchant.address` to your MetaMask.

Fill in `packages/dashboard/.env.local`:
```bash
NEXT_PUBLIC_ALCHEMY_KEY=               # just the key portion of your Alchemy URL
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=  # cloud.reown.com
EXECUTOR_PRIVATE_KEY=0x...             # a SECOND Sepolia EOA, funded with a little ETH
```

### 4. Run

```bash
yarn dev
```

Open <http://localhost:3001>, click **Connect Wallet**, switch to Sepolia.

### Optional — deploy with Etherscan verify

Set `ETHERSCAN_API_KEY` in `contracts/.env`, then:
```bash
yarn deploy:sepolia:verify
```

---

## Common ops (copy-paste)

### Mint MockUSDC

```bash
# Local
USDC=0x5FbDB2315678afecb367f032d93F642f64180aa3
cast send $USDC "mint(address,uint256)" 0xYourAddress 100000000 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --rpc-url http://127.0.0.1:8545
# 100000000 = 100 USDC (6 decimals)
```

```bash
# Sepolia
source contracts/.env
USDC=0x...   # from pulse.local.json
cast send $USDC "mint(address,uint256)" 0xYourAddress 100000000 \
  --private-key $PRIVATE_KEY --rpc-url $SEPOLIA_RPC_URL
```

### Read a USDC balance
```bash
cast call $USDC "balanceOf(address)(uint256)" 0xYourAddress --rpc-url <rpc>
```

### Force-charge a subscription
```bash
MGR=0x...
SUB=0x...   # subscriptionId from the dashboard
cast send $MGR "charge(bytes32)" $SUB --private-key $PRIVATE_KEY --rpc-url <rpc>
```

### Time-travel (anvil only)
```bash
cast rpc evm_increaseTime 3600 --rpc-url http://127.0.0.1:8545
cast rpc evm_mine           --rpc-url http://127.0.0.1:8545
```

### Inspect ChargeExecuted events
```bash
cast logs --address $MGR \
  "ChargeExecuted(bytes32,address,address,uint256,uint256,uint256,uint256,uint256)" \
  --from-block 0 --rpc-url <rpc>
```

---

## Tests

```bash
yarn test:contracts   # forge test
yarn test:e2e         # scheduler end-to-end
yarn typecheck
```

---

## All yarn scripts

| Command | What it does |
|---|---|
| `yarn anvil` | Start local chain on `127.0.0.1:8545` |
| `yarn deploy:anvil` | Deploy MockUSDC + manager + fund 5 anvil accounts |
| `yarn deploy:sepolia` | Deploy to Sepolia using `contracts/.env` |
| `yarn deploy:sepolia:verify` | Same + Etherscan verification |
| `yarn dev` | Dashboard on <http://localhost:3001> |
| `yarn reset` | Kill anvil and `next dev` |
| `yarn compile` | `forge build` |
| `yarn test:contracts` | `forge test -vvv` |
| `yarn test:e2e` | Scheduler e2e test |
| `yarn typecheck` | Type-check sdk + scheduler |
| `yarn build` | Build sdk + scheduler |
