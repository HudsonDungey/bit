import { getPulseConfig } from "./config";

export interface PlanMeta {
  name: string;
  description: string;
  intervalLabel: string;
  cancelAfterCharges: number | null;
  isTestInterval: boolean;
  createdAt: string;
}

export interface SubMeta {
  createdAt: string;
}

interface AppState {
  testMode: boolean;
}

interface GlobalStore {
  planMeta: Map<string, PlanMeta>;          // keyed by on-chain planId (bytes32 hex)
  subMeta: Map<string, SubMeta>;            // keyed by on-chain subscriptionId
  cancelledByMerchant: Set<string>;         // planId hashes where merchant deactivated locally
  state: AppState;
  schedulerStarted: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __pulseStore: GlobalStore | undefined;
}

export function getStore(): GlobalStore {
  if (!globalThis.__pulseStore) {
    globalThis.__pulseStore = {
      planMeta: new Map(),
      subMeta: new Map(),
      cancelledByMerchant: new Set(),
      state: { testMode: getPulseConfig().testMode },
      schedulerStarted: false,
    };
  }
  return globalThis.__pulseStore;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
