import type { Plan, Subscription, Transaction } from "./types";
import { getPulseConfig } from "./config";

interface AppState {
  testMode: boolean;
}

interface GlobalStore {
  plans: Plan[];
  subscriptions: Subscription[];
  transactions: Transaction[];
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
      plans: [],
      subscriptions: [],
      transactions: [],
      state: { testMode: getPulseConfig().testMode },
      schedulerStarted: false,
    };
  }
  return globalThis.__pulseStore;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
