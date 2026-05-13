/// ABI for PulseSubscriptionManager — kept as a TypeScript const so viem
/// can infer argument and return types without a codegen step.
export const PULSE_ABI = [
  // ─── Errors ──────────────────────────────────────────────────────────────
  { type: "error", name: "PlanNotActive",        inputs: [{ name: "planId",         type: "bytes32" }] },
  { type: "error", name: "AlreadySubscribed",    inputs: [{ name: "subscriptionId", type: "bytes32" }] },
  { type: "error", name: "NotSubscribed",        inputs: [{ name: "subscriptionId", type: "bytes32" }] },
  { type: "error", name: "TooEarlyToCharge",     inputs: [{ name: "subscriptionId", type: "bytes32" }, { name: "nextChargeAt", type: "uint256" }] },
  { type: "error", name: "SpendCapExceeded",     inputs: [{ name: "subscriptionId", type: "bytes32" }] },
  { type: "error", name: "UnauthorizedMerchant", inputs: [{ name: "planId",         type: "bytes32" }] },
  { type: "error", name: "ZeroAddress",          inputs: [] },
  { type: "error", name: "InvalidAmount",        inputs: [] },
  { type: "error", name: "InvalidPeriod",        inputs: [] },
  { type: "error", name: "InvalidFeeBps",        inputs: [] },

  // ─── Events ──────────────────────────────────────────────────────────────
  {
    type: "event", name: "PlanCreated",
    inputs: [
      { name: "planId",   type: "bytes32", indexed: true },
      { name: "merchant", type: "address", indexed: true },
      { name: "token",    type: "address", indexed: false },
      { name: "amount",   type: "uint256", indexed: false },
      { name: "period",   type: "uint256", indexed: false },
      { name: "feeBps",   type: "uint16",  indexed: false },
    ],
  },
  {
    type: "event", name: "PlanDeactivated",
    inputs: [
      { name: "planId",   type: "bytes32", indexed: true },
      { name: "merchant", type: "address", indexed: true },
    ],
  },
  {
    type: "event", name: "Subscribed",
    inputs: [
      { name: "subscriptionId", type: "bytes32", indexed: true },
      { name: "planId",         type: "bytes32", indexed: true },
      { name: "customer",       type: "address", indexed: true },
      { name: "totalSpendCap",  type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "ChargeExecuted",
    inputs: [
      { name: "subscriptionId", type: "bytes32", indexed: true },
      { name: "executor",       type: "address", indexed: true },
      { name: "customer",       type: "address", indexed: true },
      { name: "gross",          type: "uint256", indexed: false },
      { name: "merchantAmount", type: "uint256", indexed: false },
      { name: "executorFee",    type: "uint256", indexed: false },
      { name: "protocolFee",    type: "uint256", indexed: false },
      { name: "nextChargeAt",   type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "Cancelled",
    inputs: [
      { name: "subscriptionId", type: "bytes32", indexed: true },
      { name: "caller",         type: "address", indexed: true },
    ],
  },

  // ─── Constructor ─────────────────────────────────────────────────────────
  {
    type: "constructor",
    inputs: [{ name: "_feeRecipient", type: "address" }],
    stateMutability: "nonpayable",
  },

  // ─── Write functions ─────────────────────────────────────────────────────
  {
    type: "function", name: "createPlan",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token",  type: "address" },
      { name: "amount", type: "uint256" },
      { name: "period", type: "uint256" },
      { name: "feeBps", type: "uint16"  },
    ],
    outputs: [{ name: "planId", type: "bytes32" }],
  },
  {
    type: "function", name: "subscribe",
    stateMutability: "nonpayable",
    inputs: [
      { name: "planId",        type: "bytes32" },
      { name: "totalSpendCap", type: "uint256" },
    ],
    outputs: [{ name: "subscriptionId", type: "bytes32" }],
  },
  {
    type: "function", name: "charge",
    stateMutability: "nonpayable",
    inputs: [{ name: "subscriptionId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function", name: "cancel",
    stateMutability: "nonpayable",
    inputs: [{ name: "subscriptionId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function", name: "deactivatePlan",
    stateMutability: "nonpayable",
    inputs: [{ name: "planId", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function", name: "setFeeRecipient",
    stateMutability: "nonpayable",
    inputs: [{ name: "newRecipient", type: "address" }],
    outputs: [],
  },
  {
    type: "function", name: "transferOwnership",
    stateMutability: "nonpayable",
    inputs: [{ name: "newOwner", type: "address" }],
    outputs: [],
  },

  // ─── View functions ───────────────────────────────────────────────────────
  {
    type: "function", name: "EXECUTOR_FEE_BPS",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }],
  },
  {
    type: "function", name: "computeSubId",
    stateMutability: "pure",
    inputs: [
      { name: "planId",   type: "bytes32" },
      { name: "customer", type: "address" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function", name: "getPlan",
    stateMutability: "view",
    inputs: [{ name: "planId", type: "bytes32" }],
    outputs: [
      {
        name: "", type: "tuple",
        components: [
          { name: "merchant", type: "address" },
          { name: "token",    type: "address" },
          { name: "amount",   type: "uint256" },
          { name: "period",   type: "uint256" },
          { name: "feeBps",   type: "uint16"  },
          { name: "active",   type: "bool"    },
        ],
      },
    ],
  },
  {
    type: "function", name: "getSubscription",
    stateMutability: "view",
    inputs: [{ name: "subscriptionId", type: "bytes32" }],
    outputs: [
      {
        name: "", type: "tuple",
        components: [
          { name: "customer",      type: "address" },
          { name: "merchant",      type: "address" },
          { name: "token",         type: "address" },
          { name: "amount",        type: "uint256" },
          { name: "period",        type: "uint256" },
          { name: "nextChargeAt",  type: "uint256" },
          { name: "totalSpendCap", type: "uint256" },
          { name: "totalSpent",    type: "uint256" },
          { name: "feeBps",        type: "uint16"  },
          { name: "active",        type: "bool"    },
        ],
      },
    ],
  },
  {
    type: "function", name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function", name: "feeRecipient",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export type PulseAbi = typeof PULSE_ABI;

// ─── Minimal ERC-20 ABI ───────────────────────────────────────────────────────

export const ERC20_ABI = [
  {
    type: "function", name: "approve",
    stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function", name: "allowance",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function", name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function", name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

// ─── PayManager ABI ───────────────────────────────────────────────────────────

export const PAY_MANAGER_ABI = [
  // ─── Errors ──────────────────────────────────────────────────────────────
  { type: "error", name: "ZeroAddress",    inputs: [] },
  { type: "error", name: "ZeroAmount",     inputs: [] },
  { type: "error", name: "AlreadyPayee",   inputs: [] },
  { type: "error", name: "NotPayee",       inputs: [] },
  { type: "error", name: "LengthMismatch", inputs: [] },
  { type: "error", name: "TransferFailed", inputs: [] },

  // ─── Events ──────────────────────────────────────────────────────────────
  {
    type: "event", name: "PayeeAdded",
    inputs: [
      { name: "user",  type: "address", indexed: true },
      { name: "payee", type: "address", indexed: true },
      { name: "label", type: "string",  indexed: false },
    ],
  },
  {
    type: "event", name: "PayeeRemoved",
    inputs: [
      { name: "user",  type: "address", indexed: true },
      { name: "payee", type: "address", indexed: true },
    ],
  },
  {
    type: "event", name: "Payment",
    inputs: [
      { name: "from",  type: "address", indexed: true },
      { name: "to",    type: "address", indexed: true },
      { name: "token", type: "address", indexed: false },
      { name: "gross", type: "uint256", indexed: false },
      { name: "fee",   type: "uint256", indexed: false },
      { name: "net",   type: "uint256", indexed: false },
    ],
  },

  // ─── Constructor ─────────────────────────────────────────────────────────
  {
    type: "constructor",
    inputs: [{ name: "_owner", type: "address" }],
    stateMutability: "nonpayable",
  },

  // ─── Write functions ─────────────────────────────────────────────────────
  {
    type: "function", name: "addPayee",
    stateMutability: "nonpayable",
    inputs: [
      { name: "payee", type: "address" },
      { name: "label", type: "string"  },
    ],
    outputs: [],
  },
  {
    type: "function", name: "removePayee",
    stateMutability: "nonpayable",
    inputs: [{ name: "payee", type: "address" }],
    outputs: [],
  },
  {
    type: "function", name: "pay",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "to",    type: "address" },
      { name: "gross", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function", name: "payBatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token",      type: "address"   },
      { name: "recipients", type: "address[]" },
      { name: "amounts",    type: "uint256[]" },
    ],
    outputs: [],
  },

  // ─── View functions ───────────────────────────────────────────────────────
  {
    type: "function", name: "FEE_BPS",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function", name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function", name: "getPayees",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "addrs",  type: "address[]" },
      { name: "labels", type: "string[]"  },
    ],
  },
  {
    type: "function", name: "payeeLabel",
    stateMutability: "view",
    inputs: [
      { name: "user",  type: "address" },
      { name: "payee", type: "address" },
    ],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

export type PayManagerAbi = typeof PAY_MANAGER_ABI;

// ─── SubscriptionDelegate7702 ABI ─────────────────────────────────────────────

export const DELEGATE_7702_ABI = [
  // ─── Errors ──────────────────────────────────────────────────────────────
  { type: "error", name: "NotManager",        inputs: [] },
  { type: "error", name: "WrongToken",        inputs: [] },
  { type: "error", name: "PeriodCapExceeded", inputs: [] },
  { type: "error", name: "InvalidSignature",  inputs: [] },
  { type: "error", name: "Expired",           inputs: [] },
  { type: "error", name: "NonceUsed",         inputs: [] },
  { type: "error", name: "AlreadyInitialized",inputs: [] },
  { type: "error", name: "NotOwner",          inputs: [] },
  { type: "error", name: "ZeroAddress",       inputs: [] },

  // ─── Events ──────────────────────────────────────────────────────────────
  {
    type: "event", name: "Initialized",
    inputs: [
      { name: "manager",        type: "address", indexed: true },
      { name: "token",          type: "address", indexed: true },
      { name: "maxPerPeriod",   type: "uint256", indexed: false },
      { name: "periodDuration", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "TransferExecuted",
    inputs: [
      { name: "to",            type: "address", indexed: true },
      { name: "amount",        type: "uint256", indexed: false },
      { name: "periodId",      type: "uint256", indexed: false },
      { name: "spentInPeriod", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "Revoked",
    inputs: [
      { name: "newEpoch", type: "uint256", indexed: false },
    ],
  },

  // ─── Write functions ─────────────────────────────────────────────────────
  {
    type: "function", name: "initWithSig",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "init", type: "tuple",
        components: [
          { name: "manager",        type: "address" },
          { name: "token",          type: "address" },
          { name: "maxPerPeriod",   type: "uint256" },
          { name: "periodDuration", type: "uint256" },
          { name: "nonce",          type: "uint256" },
          { name: "expiry",         type: "uint256" },
        ],
      },
      { name: "sig", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function", name: "executeTransfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token",  type: "address" },
      { name: "to",     type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function", name: "revoke",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },

  // ─── View functions ───────────────────────────────────────────────────────
  {
    type: "function", name: "isInitialized",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function", name: "currentPeriodId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function", name: "remainingPeriodAllowance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function", name: "authEpoch",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function", name: "spentInPeriod",
    stateMutability: "view",
    inputs: [{ name: "periodId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function", name: "config",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "", type: "tuple",
        components: [
          { name: "manager",        type: "address" },
          { name: "token",          type: "address" },
          { name: "maxPerPeriod",   type: "uint256" },
          { name: "periodDuration", type: "uint256" },
          { name: "initEpoch",      type: "uint256" },
          { name: "nonce",          type: "uint256" },
        ],
      },
    ],
  },
] as const;

export type Delegate7702Abi = typeof DELEGATE_7702_ABI;
