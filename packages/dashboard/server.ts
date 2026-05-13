import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { randomUUID } from "node:crypto";

// ─── Config ───────────────────────────────────────────────────────────────────

const cfg = JSON.parse(
  readFileSync(new URL("./pulse.config.json", import.meta.url), "utf8")
) as PulseConfig;

interface IntervalDef { label: string; seconds: number }
interface PulseConfig {
  testMode: boolean;
  testIntervals: IntervalDef[];
  productionIntervals: IntervalDef[];
  scheduler: { testTickMs: number; productionTickMs: number };
  defaults: { feeBps: number; merchant: string; feeRecipient: string };
  maxTransactions: number;
  payManagerOwner?: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  description: string;
  /** Human-readable price in USDC. */
  price: number;
  intervalLabel: string;
  intervalSeconds: number;
  feeBps: number;
  /** null = never auto-cancel */
  cancelAfterCharges: number | null;
  active: boolean;
  createdAt: string;
  isTestInterval: boolean;
}

interface Subscription {
  id: string;
  planId: string;
  planName: string;
  customer: string;
  /** null = unlimited */
  spendCap: number | null;
  chargeCount: number;
  totalPaid: number;
  nextChargeAt: number; // unix seconds
  status: "active" | "cancelled" | "completed";
  createdAt: string;
}

interface Transaction {
  id: string;
  subscriptionId?: string;
  planId?: string;
  planName?: string;
  customer: string;
  /** Net to merchant (price - fee). */
  merchantAmount: number;
  fee: number;
  /** Gross = merchantAmount + fee. */
  gross: number;
  direction: "in" | "out";
  /** For pay-manager outbound txs: recipient address. */
  payee?: string;
  status: "success" | "failed";
  failReason?: string;
  timestamp: string;
}

interface Payee { address: string; label: string; addedAt: string; }

interface AppState {
  testMode: boolean;
}

// ─── In-memory store ──────────────────────────────────────────────────────────

const plans: Plan[]            = [];
const subscriptions: Subscription[] = [];
const transactions: Transaction[]   = [];
const state: AppState = { testMode: cfg.testMode };

const payeeBook = new Map<string, Payee[]>();   // key = user address lowercased
const balances  = new Map<string, number>();    // key = address lowercased
const PAY_FEE_BPS = 50;

function getBalance(addr: string)              { return balances.get(addr.toLowerCase()) ?? 10_000; }
function setBalance(addr: string, v: number)   { balances.set(addr.toLowerCase(), round2(v)); }

// ─── Scheduler ────────────────────────────────────────────────────────────────

function schedulerTick() {
  const nowSec = Date.now() / 1000;

  for (const sub of subscriptions) {
    if (sub.status !== "active") continue;
    if (sub.nextChargeAt > nowSec) continue;

    const plan = plans.find((p) => p.id === sub.planId);
    if (!plan || !plan.active) {
      sub.status = "cancelled";
      continue;
    }

    // Spend-cap check before charging
    if (sub.spendCap !== null && sub.totalPaid + plan.price > sub.spendCap) {
      sub.status = "completed";
      log(`sub ${sub.id} hit spend cap – completed`);
      continue;
    }

    const fee            = round2(plan.price * plan.feeBps / 10_000);
    const merchantAmount = round2(plan.price - fee);

    const tx: Transaction = {
      id:             randomUUID(),
      subscriptionId: sub.id,
      planId:         plan.id,
      planName:       plan.name,
      customer:       sub.customer,
      merchantAmount,
      fee,
      gross:          plan.price,
      direction:      "in",
      status:         "success",
      timestamp:      new Date().toISOString(),
    };

    // Prepend so newest is always first
    transactions.unshift(tx);
    if (transactions.length > cfg.maxTransactions) transactions.pop();

    sub.chargeCount++;
    sub.totalPaid  = round2(sub.totalPaid + plan.price);
    sub.nextChargeAt = nowSec + plan.intervalSeconds;

    // Auto-cancel after N charges
    if (plan.cancelAfterCharges !== null && sub.chargeCount >= plan.cancelAfterCharges) {
      sub.status = "completed";
      log(`sub ${sub.id} completed after ${sub.chargeCount} charge(s)`);
    }

    log(`charged ${sub.customer.slice(0, 8)}… $${plan.price} [${plan.name}]`);
  }

  const delay = state.testMode ? cfg.scheduler.testTickMs : cfg.scheduler.productionTickMs;
  setTimeout(schedulerTick, delay);
}

// ─── Stats helper ─────────────────────────────────────────────────────────────

function computeStats() {
  const successful  = transactions.filter((t) => t.status === "success");
  const totalRevenue = round2(successful.reduce((s, t) => s + t.merchantAmount, 0));
  const totalFees    = round2(successful.reduce((s, t) => s + t.fee, 0));
  const activeSubs   = subscriptions.filter((s) => s.status === "active").length;
  const activePlans  = plans.filter((p) => p.active).length;
  return {
    totalRevenue,
    totalFees,
    totalCharges: successful.length,
    activeSubs,
    activePlans,
    recentTransactions: transactions.slice(0, 8),
  };
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function json(res: ServerResponse, code: number, body: unknown) {
  const data = JSON.stringify(body);
  res.writeHead(code, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(data);
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let buf = "";
    req.on("data", (c: Buffer) => (buf += c.toString()));
    req.on("end", () => {
      try { resolve(buf ? JSON.parse(buf) : {}); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css",
  ".js":   "application/javascript",
  ".json": "application/json",
  ".png":  "image/png",
  ".ico":  "image/x-icon",
};

function serveFile(res: ServerResponse, filePath: string) {
  const full = join(new URL("./public", import.meta.url).pathname, filePath);
  if (!existsSync(full)) { json(res, 404, { error: "not found" }); return; }
  const ext  = extname(full);
  res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
  res.end(readFileSync(full));
}

// ─── Route handler ────────────────────────────────────────────────────────────

async function handle(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const url    = new URL(req.url ?? "/", "http://localhost");
  const path   = url.pathname;
  const method = req.method ?? "GET";

  // ── Config ─────────────────────────────────────────────────────────────────
  if (path === "/api/config") {
    if (method === "GET") {
      return json(res, 200, {
        testMode: state.testMode,
        testIntervals: cfg.testIntervals,
        productionIntervals: cfg.productionIntervals,
      });
    }
    if (method === "POST") {
      const body = await readBody(req) as Partial<AppState>;
      if (typeof body.testMode === "boolean") state.testMode = body.testMode;
      return json(res, 200, { testMode: state.testMode });
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  if (path === "/api/stats" && method === "GET") {
    return json(res, 200, computeStats());
  }

  // ── Plans ──────────────────────────────────────────────────────────────────
  if (path === "/api/plans") {
    if (method === "GET")  return json(res, 200, plans);
    if (method === "POST") {
      const b = await readBody(req) as Partial<Plan & { intervalSeconds: number; intervalLabel: string }>;
      if (!b.name || !b.price || !b.intervalSeconds) {
        return json(res, 400, { error: "name, price, intervalSeconds are required" });
      }
      const plan: Plan = {
        id:                 randomUUID(),
        name:               String(b.name),
        description:        String(b.description ?? ""),
        price:              Number(b.price),
        intervalLabel:      String(b.intervalLabel ?? `${b.intervalSeconds}s`),
        intervalSeconds:    Number(b.intervalSeconds),
        feeBps:             Number(b.feeBps ?? cfg.defaults.feeBps),
        cancelAfterCharges: b.cancelAfterCharges ? Number(b.cancelAfterCharges) : null,
        active:             true,
        createdAt:          new Date().toISOString(),
        isTestInterval:     Number(b.intervalSeconds) < 300,
      };
      plans.push(plan);
      log(`plan created: ${plan.name} $${plan.price}/${plan.intervalLabel}`);
      return json(res, 201, plan);
    }
  }

  const planDeactivate = path.match(/^\/api\/plans\/([^/]+)\/deactivate$/);
  if (planDeactivate && method === "POST") {
    const plan = plans.find((p) => p.id === planDeactivate[1]);
    if (!plan) return json(res, 404, { error: "plan not found" });
    plan.active = false;
    // Cancel active subscriptions on this plan
    subscriptions.filter((s) => s.planId === plan.id && s.status === "active")
                 .forEach((s) => (s.status = "cancelled"));
    return json(res, 200, plan);
  }

  const planActivate = path.match(/^\/api\/plans\/([^/]+)\/activate$/);
  if (planActivate && method === "POST") {
    const plan = plans.find((p) => p.id === planActivate[1]);
    if (!plan) return json(res, 404, { error: "plan not found" });
    plan.active = true;
    return json(res, 200, plan);
  }

  // ── Subscriptions ──────────────────────────────────────────────────────────
  if (path === "/api/subscriptions") {
    if (method === "GET")  return json(res, 200, subscriptions);
    if (method === "POST") {
      const b = await readBody(req) as { planId?: string; customer?: string; spendCap?: number | null };
      const plan = plans.find((p) => p.id === b.planId && p.active);
      if (!plan) return json(res, 400, { error: "plan not found or inactive" });
      if (!b.customer) return json(res, 400, { error: "customer is required" });

      // Prevent duplicate active subscription on same plan
      const exists = subscriptions.find(
        (s) => s.planId === b.planId && s.customer === b.customer && s.status === "active"
      );
      if (exists) return json(res, 409, { error: "already subscribed" });

      const sub: Subscription = {
        id:             randomUUID(),
        planId:         plan.id,
        planName:       plan.name,
        customer:       String(b.customer),
        spendCap:       b.spendCap ? Number(b.spendCap) : null,
        chargeCount:    0,
        totalPaid:      0,
        nextChargeAt:   Date.now() / 1000, // charge immediately on first tick
        status:         "active",
        createdAt:      new Date().toISOString(),
      };
      subscriptions.push(sub);
      log(`subscribed ${sub.customer.slice(0, 10)} → ${plan.name}`);
      return json(res, 201, sub);
    }
  }

  const subCancel = path.match(/^\/api\/subscriptions\/([^/]+)\/cancel$/);
  if (subCancel && method === "POST") {
    const sub = subscriptions.find((s) => s.id === subCancel[1]);
    if (!sub) return json(res, 404, { error: "subscription not found" });
    sub.status = "cancelled";
    return json(res, 200, sub);
  }

  // ── Transactions ───────────────────────────────────────────────────────────
  if (path === "/api/transactions" && method === "GET") {
    const planId  = url.searchParams.get("planId");
    const custQ   = url.searchParams.get("customer");
    const statusQ = url.searchParams.get("status");
    let result = transactions;
    if (planId)  result = result.filter((t) => t.planId === planId);
    if (custQ)   result = result.filter((t) => t.customer.includes(custQ));
    if (statusQ) result = result.filter((t) => t.status === statusQ);
    return json(res, 200, result);
  }

  // ── Pay Manager — Payees ───────────────────────────────────────────────────
  if (path === "/api/payees") {
    if (method === "GET") {
      const user = url.searchParams.get("user") ?? "";
      const list = payeeBook.get(user.toLowerCase()) ?? [];
      return json(res, 200, list);
    }
    if (method === "POST") {
      const b = await readBody(req) as { user?: string; address?: string; label?: string };
      if (!b.user || !b.address) return json(res, 400, { error: "user and address are required" });
      const key = b.user.toLowerCase();
      if (!payeeBook.has(key)) payeeBook.set(key, []);
      const list = payeeBook.get(key)!;
      if (list.find((p) => p.address.toLowerCase() === b.address!.toLowerCase())) {
        return json(res, 409, { error: "already a payee" });
      }
      const payee: Payee = { address: b.address, label: b.label ?? "", addedAt: new Date().toISOString() };
      list.push(payee);
      return json(res, 201, payee);
    }
  }

  // DELETE /api/payees/:addr?user=0x…
  const payeeDelete = path.match(/^\/api\/payees\/([^/?]+)/);
  if (payeeDelete && method === "DELETE") {
    const user    = url.searchParams.get("user") ?? "";
    const addrRaw = decodeURIComponent(payeeDelete[1]);
    const key     = user.toLowerCase();
    const list    = payeeBook.get(key) ?? [];
    const idx     = list.findIndex((p) => p.address.toLowerCase() === addrRaw.toLowerCase());
    if (idx === -1) return json(res, 404, { error: "payee not found" });
    list.splice(idx, 1);
    payeeBook.set(key, list);
    return json(res, 200, { ok: true });
  }

  // ── Pay Manager — Balance ──────────────────────────────────────────────────
  if (path === "/api/balance" && method === "GET") {
    const user = url.searchParams.get("user") ?? "";
    return json(res, 200, { address: user, balance: getBalance(user) });
  }

  if (path === "/api/fund" && method === "POST") {
    const b = await readBody(req) as { user?: string; amount?: number };
    if (!b.user) return json(res, 400, { error: "user is required" });
    const amount = Number(b.amount ?? 10_000);
    setBalance(b.user, getBalance(b.user) + amount);
    return json(res, 200, { address: b.user, balance: getBalance(b.user) });
  }

  // ── Pay Manager — Payments ─────────────────────────────────────────────────
  if (path === "/api/pay" && method === "POST") {
    const b = await readBody(req) as { from?: string; to?: string; amount?: number; label?: string };
    if (!b.from || !b.to || !b.amount) return json(res, 400, { error: "from, to, amount are required" });

    const gross = Number(b.amount);
    const fee   = round2(gross * PAY_FEE_BPS / 10_000);
    const net   = round2(gross - fee);

    const fromBal = getBalance(b.from);
    if (fromBal < gross) return json(res, 400, { error: "insufficient balance" });

    setBalance(b.from, fromBal - gross);
    setBalance(b.to, getBalance(b.to) + net);

    // Fee goes to payManagerOwner or defaults.feeRecipient
    const feeOwner = cfg.payManagerOwner ?? cfg.defaults.feeRecipient;
    setBalance(feeOwner, getBalance(feeOwner) + fee);

    const tx: Transaction = {
      id:             randomUUID(),
      direction:      "out",
      customer:       b.from,
      payee:          b.to,
      planName:       b.label,
      merchantAmount: net,
      fee,
      gross,
      status:         "success",
      timestamp:      new Date().toISOString(),
    };

    transactions.unshift(tx);
    if (transactions.length > cfg.maxTransactions) transactions.pop();

    return json(res, 200, tx);
  }

  if (path === "/api/pay/batch" && method === "POST") {
    const b = await readBody(req) as { from?: string; payments?: Array<{ to?: string; amount?: number; label?: string }> };
    if (!b.from || !Array.isArray(b.payments)) return json(res, 400, { error: "from and payments are required" });

    const results: Transaction[] = [];

    for (const p of b.payments) {
      if (!p.to || !p.amount) continue;
      const gross = Number(p.amount);
      const fee   = round2(gross * PAY_FEE_BPS / 10_000);
      const net   = round2(gross - fee);

      const fromBal = getBalance(b.from);
      if (fromBal < gross) {
        return json(res, 400, { error: `insufficient balance for payment to ${p.to}` });
      }

      setBalance(b.from, fromBal - gross);
      setBalance(p.to, getBalance(p.to) + net);

      const feeOwner = cfg.payManagerOwner ?? cfg.defaults.feeRecipient;
      setBalance(feeOwner, getBalance(feeOwner) + fee);

      const tx: Transaction = {
        id:             randomUUID(),
        direction:      "out",
        customer:       b.from,
        payee:          p.to,
        planName:       p.label,
        merchantAmount: net,
        fee,
        gross,
        status:         "success",
        timestamp:      new Date().toISOString(),
      };

      transactions.unshift(tx);
      if (transactions.length > cfg.maxTransactions) transactions.pop();
      results.push(tx);
    }

    return json(res, 200, results);
  }

  // ── Static files ────────────────────────────────────────────────────────────
  if (path === "/" || path === "") return serveFile(res, "index.html");
  serveFile(res, path);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 3000);

schedulerTick();

createServer((req, res) => {
  handle(req, res).catch((err: Error) => {
    console.error("handler error:", err);
    json(res, 500, { error: err.message });
  });
}).listen(PORT, () => {
  console.log(`\n  ⚡ Pulse dashboard  →  http://localhost:${PORT}`);
  console.log(`  Test mode: ${state.testMode ? "ON" : "OFF"}`);
  console.log(`  Scheduler tick: ${state.testMode ? cfg.scheduler.testTickMs : cfg.scheduler.productionTickMs}ms\n`);
});

// ─── Util ──────────────────────────────────────────────────────────────────────

function round2(n: number) { return Math.round(n * 100) / 100; }
function log(msg: string) { console.log(`[${new Date().toISOString()}] ${msg}`); }
