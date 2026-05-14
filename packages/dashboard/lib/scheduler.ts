import { randomUUID } from "node:crypto";
import { getPulseConfig } from "./config";
import { getStore, round2 } from "./store";
import type { Transaction } from "./types";

function tick() {
  const store = getStore();
  const cfg = getPulseConfig();
  const nowSec = Date.now() / 1000;

  for (const sub of store.subscriptions) {
    if (sub.status !== "active") continue;
    if (sub.nextChargeAt > nowSec) continue;

    const plan = store.plans.find((p) => p.id === sub.planId);
    if (!plan || !plan.active) {
      sub.status = "cancelled";
      continue;
    }

    if (sub.spendCap !== null && sub.totalPaid + plan.price > sub.spendCap) {
      sub.status = "completed";
      continue;
    }

    const fee = round2((plan.price * plan.feeBps) / 10_000);
    const merchantAmount = round2(plan.price - fee);

    const tx: Transaction = {
      id: randomUUID(),
      subscriptionId: sub.id,
      planId: plan.id,
      planName: plan.name,
      customer: sub.customer,
      merchantAmount,
      fee,
      gross: plan.price,
      direction: "in",
      status: "success",
      timestamp: new Date().toISOString(),
    };

    store.transactions.unshift(tx);
    if (store.transactions.length > cfg.maxTransactions) store.transactions.pop();

    sub.chargeCount += 1;
    sub.totalPaid = round2(sub.totalPaid + plan.price);
    sub.nextChargeAt = nowSec + plan.intervalSeconds;

    if (plan.cancelAfterCharges !== null && sub.chargeCount >= plan.cancelAfterCharges) {
      sub.status = "completed";
    }
  }

  const delay = store.state.testMode ? cfg.scheduler.testTickMs : cfg.scheduler.productionTickMs;
  setTimeout(tick, delay);
}

export function ensureSchedulerStarted() {
  const store = getStore();
  if (store.schedulerStarted) return;
  store.schedulerStarted = true;
  tick();
}
