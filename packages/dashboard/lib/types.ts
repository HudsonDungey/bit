export interface IntervalDef {
  label: string;
  seconds: number;
}

export interface PulseConfig {
  testMode: boolean;
  testIntervals: IntervalDef[];
  productionIntervals: IntervalDef[];
  scheduler: { testTickMs: number; productionTickMs: number };
  defaults: { feeBps: number; merchant: string; feeRecipient: string };
  maxTransactions: number;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  intervalLabel: string;
  intervalSeconds: number;
  feeBps: number;
  cancelAfterCharges: number | null;
  active: boolean;
  createdAt: string;
  isTestInterval: boolean;
}

export interface Subscription {
  id: string;
  planId: string;
  planName: string;
  customer: string;
  spendCap: number | null;
  chargeCount: number;
  totalPaid: number;
  nextChargeAt: number;
  status: "active" | "cancelled" | "completed";
  createdAt: string;
}

export interface Transaction {
  id: string;
  subscriptionId: string;
  planId: string;
  planName: string;
  customer: string;
  merchantAmount: number;
  fee: number;
  gross: number;
  direction: "in";
  status: "success" | "failed";
  failReason?: string;
  timestamp: string;
}

export interface Stats {
  totalRevenue: number;
  totalFees: number;
  totalCharges: number;
  activeSubs: number;
  activePlans: number;
  recentTransactions: Transaction[];
}
