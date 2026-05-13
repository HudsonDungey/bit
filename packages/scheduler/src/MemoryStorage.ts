import type { Hex } from "viem";
import type { SchedulerStorage, StoredSubscription } from "./storage.js";

/**
 * Reference in-memory implementation of SchedulerStorage.
 *
 * Suitable for development, single-process deployments, and tests.
 * Production should use the Supabase (or another persistent) adapter so state
 * survives restarts and multiple scheduler replicas.
 */
export class MemoryStorage implements SchedulerStorage {
  private readonly store = new Map<Hex, StoredSubscription>();

  async upsertSubscription(sub: StoredSubscription): Promise<void> {
    this.store.set(sub.subscriptionId, { ...sub });
  }

  async getDueSubscriptions(nowSeconds: number): Promise<StoredSubscription[]> {
    const due: StoredSubscription[] = [];
    for (const sub of this.store.values()) {
      if (sub.active && sub.nextChargeAt <= nowSeconds) {
        due.push({ ...sub });
      }
    }
    return due;
  }

  async updateNextChargeAt(subscriptionId: Hex, nextChargeAt: number): Promise<void> {
    const sub = this.store.get(subscriptionId);
    if (sub) sub.nextChargeAt = nextChargeAt;
  }

  async deactivate(subscriptionId: Hex): Promise<void> {
    const sub = this.store.get(subscriptionId);
    if (sub) sub.active = false;
  }

  // Test helper — not part of the public interface
  snapshot(): Map<Hex, StoredSubscription> {
    return new Map(this.store);
  }
}
