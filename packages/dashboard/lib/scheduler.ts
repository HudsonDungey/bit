import { getPulseConfig } from "./config";
import { getStore } from "./store";
import { dueSubscriptions, chargeOnce } from "./chain-reads";

let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    const due = await dueSubscriptions();
    for (const { subId } of due) {
      try {
        await chargeOnce(subId);
        // eslint-disable-next-line no-console
        console.log(`[scheduler] charged ${subId.slice(0, 10)}…`);
      } catch (err) {
        // Most reverts here mean someone else (or another tick) already charged
        // it for this period — silently skip. Real errors get logged.
        const msg = (err as Error).message ?? String(err);
        if (!/TooEarlyToCharge|NotSubscribed/.test(msg)) {
          // eslint-disable-next-line no-console
          console.warn(`[scheduler] charge failed for ${subId.slice(0, 10)}…`, msg.slice(0, 120));
        }
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[scheduler] tick error:", (err as Error).message);
  } finally {
    running = false;
    const store = getStore();
    const cfg = getPulseConfig();
    const delay = store.state.testMode ? cfg.scheduler.testTickMs : cfg.scheduler.productionTickMs;
    setTimeout(tick, delay);
  }
}

export function ensureSchedulerStarted() {
  const store = getStore();
  if (store.schedulerStarted) return;
  store.schedulerStarted = true;
  tick();
}
