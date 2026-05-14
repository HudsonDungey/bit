// ── State ──────────────────────────────────────────────────────────────────────
let appConfig = { testMode: false, testIntervals: [], productionIntervals: [] };
let plans = [], subscriptions = [], transactions = [];
let pollTimer = null;
let lastTxIds = new Set();         // for highlighting newly-arrived transactions
let statValues = {                 // for animated counters
  "stat-revenue": 0, "stat-fees": 0, "stat-charges": 0, "stat-subs": 0, "stat-plans": 0,
};

// ── Ripple bubble effect ───────────────────────────────────────────────────────
function attachRipple(el) {
  el.addEventListener("pointerdown", (e) => {
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.2;
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
    ripple.style.top  = (e.clientY - rect.top  - size / 2) + "px";
    el.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  });
}

function attachRipplesToAll() {
  document.querySelectorAll(".btn:not([data-ripple])").forEach(b => {
    b.dataset.ripple = "1";
    attachRipple(b);
  });
  document.querySelectorAll(".nav-item:not([data-ripple])").forEach(b => {
    b.dataset.ripple = "1";
    attachRipple(b);
  });
}

// ── Navigation ─────────────────────────────────────────────────────────────────
document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    const page = item.dataset.page;
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    item.classList.add("active");
    document.getElementById("page-" + page).classList.add("active");
    refresh();
  });
});

// ── API helpers ────────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(path, opts);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || r.statusText);
  return data;
}

// ── Format helpers ─────────────────────────────────────────────────────────────
function fmt$(n) { return "$" + Number(n).toFixed(2); }

function fmtAddr(a) {
  if (!a) return "—";
  if (a.length > 18) return a.slice(0, 8) + "…" + a.slice(-6);
  return a;
}

function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    + " " + d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function fmtNextCharge(unixSec) {
  const diff = Math.round(unixSec - Date.now() / 1000);
  if (diff <= 0) return '<span style="color:var(--warning); font-weight:600">now</span>';
  if (diff < 60) return "in " + diff + "s";
  if (diff < 3600) return "in " + Math.round(diff / 60) + "m";
  if (diff < 86400) return "in " + Math.round(diff / 3600) + "h";
  return "in " + Math.round(diff / 86400) + "d";
}

function badge(status) {
  const cls = {
    active: "badge-active", cancelled: "badge-cancelled",
    completed: "badge-completed", success: "badge-success",
    failed: "badge-failed", inactive: "badge-inactive"
  }[status] || "badge-inactive";
  return `<span class="badge ${cls}">${status}</span>`;
}

// ── Animated number counter ────────────────────────────────────────────────────
function animateNumber(el, target, opts = {}) {
  const { duration = 600, format = "money" } = opts;
  const key = el.id;
  const start = statValues[key] ?? 0;
  if (start === target) {
    el.textContent = format === "money" ? fmt$(target) : String(Math.round(target));
    return;
  }
  const t0 = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - t0) / duration);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    const v = start + (target - start) * eased;
    el.textContent = format === "money" ? fmt$(v) : String(Math.round(v));
    if (t < 1) requestAnimationFrame(frame);
    else {
      el.textContent = format === "money" ? fmt$(target) : String(Math.round(target));
      statValues[key] = target;
    }
  }
  requestAnimationFrame(frame);
}

// ── Toasts (replaces alert) ────────────────────────────────────────────────────
const ICONS = {
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  warn:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="17" x2="12" y2="17"/></svg>`,
  info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="17" x2="12" y2="17"/></svg>`,
};

function toast(message, kind = "info", title = "") {
  const container = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = "toast toast-" + kind;
  el.innerHTML = `
    <div class="toast-icon">${ICONS[kind] ?? ICONS.info}</div>
    <div class="toast-body">${title ? `<strong>${title}</strong>` : ""}${message}</div>
  `;
  container.appendChild(el);
  const remove = () => {
    el.classList.add("removing");
    setTimeout(() => el.remove(), 320);
  };
  setTimeout(remove, 4200);
  el.addEventListener("click", remove);
}

// ── Confirm dialog (replaces window.confirm) ───────────────────────────────────
function confirmDialog(title, text, okLabel = "Confirm", danger = true) {
  return new Promise(resolve => {
    document.getElementById("confirm-title").textContent = title;
    document.getElementById("confirm-text").textContent = text;
    const okBtn = document.getElementById("btn-confirm-ok");
    const cancelBtn = document.getElementById("btn-confirm-cancel");
    okBtn.textContent = okLabel;
    okBtn.className = "btn " + (danger ? "btn-danger" : "btn-primary");
    openModal("modal-confirm");

    function cleanup(result) {
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      closeModal("modal-confirm");
      resolve(result);
    }
    function onOk()     { cleanup(true); }
    function onCancel() { cleanup(false); }
    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
  });
}

// ── Config / test mode ─────────────────────────────────────────────────────────
const testToggle = document.getElementById("testModeToggle");
const testBanner = document.getElementById("test-banner");

testToggle.addEventListener("change", async () => {
  try {
    appConfig = await api("POST", "/api/config", { testMode: testToggle.checked });
    updateBanner();
    toast(testToggle.checked ? "Test mode enabled" : "Test mode disabled", "success");
  } catch (e) {
    toast("Could not update test mode: " + e.message, "error");
    testToggle.checked = !testToggle.checked;
  }
});

function updateBanner() {
  testToggle.checked = appConfig.testMode;
  if (appConfig.testMode) {
    testBanner.classList.add("show");
    document.getElementById("main").style.paddingTop = "36px";
  } else {
    testBanner.classList.remove("show");
    document.getElementById("main").style.paddingTop = "";
  }
  rebuildIntervalOptions();
}

function rebuildIntervalOptions() {
  const testGroup = document.getElementById("test-interval-group");
  const prodGroup = document.getElementById("prod-interval-group");
  testGroup.innerHTML = "";
  prodGroup.innerHTML = "";

  (appConfig.testIntervals || []).forEach(iv => {
    const o = document.createElement("option");
    o.value = iv.seconds;
    o.dataset.label = iv.label;
    o.textContent = iv.label + " ⚡ test";
    testGroup.appendChild(o);
  });

  (appConfig.productionIntervals || []).forEach(iv => {
    const o = document.createElement("option");
    o.value = iv.seconds;
    o.dataset.label = iv.label;
    o.textContent = iv.label;
    prodGroup.appendChild(o);
  });
}

// ── Dashboard stats ────────────────────────────────────────────────────────────
async function refreshStats() {
  const s = await api("GET", "/api/stats");
  animateNumber(document.getElementById("stat-revenue"), s.totalRevenue, { format: "money" });
  animateNumber(document.getElementById("stat-fees"),    s.totalFees,    { format: "money" });
  animateNumber(document.getElementById("stat-charges"), s.totalCharges, { format: "int" });
  animateNumber(document.getElementById("stat-subs"),    s.activeSubs,   { format: "int" });
  animateNumber(document.getElementById("stat-plans"),   s.activePlans,  { format: "int" });
  renderRecentTx(s.recentTransactions || []);
}

function renderRecentTx(txs) {
  const tbody = document.getElementById("recent-tx-body");
  if (!txs.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No transactions yet</td></tr>';
    return;
  }
  const newIds = new Set(txs.map(t => t.id));
  tbody.innerHTML = txs.map((t, i) => {
    const isNew = !lastTxIds.has(t.id);
    return `
    <tr class="row-in${isNew ? " flash" : ""}" style="animation-delay:${i * 35}ms">
      <td class="mono">${fmtAddr(t.customer)}</td>
      <td>${t.planName}</td>
      <td class="amount-positive">${fmt$(t.merchantAmount)}</td>
      <td class="text-muted">${fmt$(t.fee)}</td>
      <td>${badge(t.status)}</td>
      <td class="text-muted">${fmtTime(t.timestamp)}</td>
    </tr>
  `;
  }).join("");
  lastTxIds = newIds;
}

// ── Plans ──────────────────────────────────────────────────────────────────────
async function refreshPlans() {
  plans = await api("GET", "/api/plans");
  const tbody = document.getElementById("plans-body");
  if (!plans.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No products yet — create one to get started</td></tr>';
    return;
  }
  tbody.innerHTML = plans.map((p, i) => `
    <tr class="row-in" style="animation-delay:${i * 30}ms">
      <td>
        <strong>${p.name}</strong>
        ${p.description ? `<div class="text-muted" style="font-size:12px; margin-top:2px">${p.description}</div>` : ""}
      </td>
      <td><strong>${fmt$(p.price)}</strong> <span class="text-muted">USDC</span></td>
      <td>
        ${p.intervalLabel}
        ${p.isTestInterval ? ' <span class="badge badge-test">test</span>' : ""}
      </td>
      <td>${p.feeBps / 100}%</td>
      <td>${p.cancelAfterCharges !== null ? "After " + p.cancelAfterCharges + " charges" : "Never"}</td>
      <td>${badge(p.active ? "active" : "inactive")}</td>
      <td>
        ${p.active
          ? `<button class="btn btn-danger btn-sm" onclick="deactivatePlan('${p.id}')">Deactivate</button>`
          : `<button class="btn btn-outline btn-sm" onclick="activatePlan('${p.id}')">Activate</button>`
        }
      </td>
    </tr>
  `).join("");
  attachRipplesToAll();
}

async function deactivatePlan(id) {
  const ok = await confirmDialog(
    "Deactivate plan?",
    "All active subscriptions for this plan will be cancelled. This cannot be undone.",
    "Deactivate"
  );
  if (!ok) return;
  try {
    await api("POST", `/api/plans/${id}/deactivate`);
    toast("Plan deactivated", "success");
    refresh();
  } catch (e) {
    toast(e.message, "error");
  }
}

async function activatePlan(id) {
  try {
    await api("POST", `/api/plans/${id}/activate`);
    toast("Plan activated", "success");
    refresh();
  } catch (e) {
    toast(e.message, "error");
  }
}

// Create plan modal
document.getElementById("btn-create-plan").addEventListener("click", () => {
  clearPlanForm();
  openModal("modal-plan");
});

document.getElementById("btn-save-plan").addEventListener("click", async () => {
  const name = document.getElementById("plan-name").value.trim();
  const desc = document.getElementById("plan-desc").value.trim();
  const price = parseFloat(document.getElementById("plan-price").value);
  const feeBps = parseInt(document.getElementById("plan-fee").value, 10);
  const intervalEl = document.getElementById("plan-interval");
  const intervalSeconds = parseInt(intervalEl.value, 10);
  const intervalLabel = intervalEl.selectedOptions[0]?.dataset.label || intervalEl.selectedOptions[0]?.text || "";
  const cancelAfterRaw = document.getElementById("plan-cancel-after").value.trim();
  const cancelAfterCharges = cancelAfterRaw ? parseInt(cancelAfterRaw, 10) : null;

  if (!name) { toast("Name is required", "error"); return; }
  if (!price || price <= 0) { toast("Price must be greater than 0", "error"); return; }
  if (!intervalSeconds) { toast("Please select a billing interval", "error"); return; }

  try {
    await api("POST", "/api/plans", { name, description: desc, price, feeBps, intervalSeconds, intervalLabel, cancelAfterCharges });
    closeModal("modal-plan");
    toast(`Product "${name}" created`, "success");
    refresh();
  } catch (e) {
    toast(e.message, "error");
  }
});

function clearPlanForm() {
  ["plan-name", "plan-desc", "plan-price", "plan-cancel-after"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("plan-fee").value = "100";
}

// ── Subscriptions ──────────────────────────────────────────────────────────────
async function refreshSubs() {
  subscriptions = await api("GET", "/api/subscriptions");
  renderSubsTable();
}

function renderSubsTable() {
  const search = document.getElementById("sub-search").value.toLowerCase();
  const statusF = document.getElementById("sub-status-filter").value;
  const tbody = document.getElementById("subs-body");

  let filtered = subscriptions;
  if (search) filtered = filtered.filter(s => s.customer.toLowerCase().includes(search));
  if (statusF) filtered = filtered.filter(s => s.status === statusF);

  if (!filtered.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No subscriptions found</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map((s, i) => `
    <tr class="row-in" style="animation-delay:${i * 30}ms">
      <td class="mono">${fmtAddr(s.customer)}</td>
      <td>${s.planName}</td>
      <td>${s.chargeCount}</td>
      <td><strong>${fmt$(s.totalPaid)}</strong></td>
      <td>${s.status === "active" ? fmtNextCharge(s.nextChargeAt) : "—"}</td>
      <td>${badge(s.status)}</td>
      <td>
        ${s.status === "active"
          ? `<button class="btn btn-danger btn-sm" onclick="cancelSub('${s.id}')">Cancel</button>`
          : ""
        }
      </td>
    </tr>
  `).join("");
  attachRipplesToAll();
}

document.getElementById("sub-search").addEventListener("input", renderSubsTable);
document.getElementById("sub-status-filter").addEventListener("change", renderSubsTable);

async function cancelSub(id) {
  const ok = await confirmDialog(
    "Cancel subscription?",
    "The customer will no longer be charged. You can re-subscribe them later.",
    "Cancel subscription"
  );
  if (!ok) return;
  try {
    await api("POST", `/api/subscriptions/${id}/cancel`);
    toast("Subscription cancelled", "success");
    refresh();
  } catch (e) {
    toast(e.message, "error");
  }
}

// Subscribe modal
document.getElementById("btn-create-sub").addEventListener("click", () => {
  const activePlans = plans.filter(p => p.active);
  const select = document.getElementById("sub-plan");
  select.innerHTML = activePlans.length
    ? activePlans.map(p => `<option value="${p.id}">${p.name} — ${fmt$(p.price)} / ${p.intervalLabel}</option>`).join("")
    : '<option value="">No active plans</option>';
  document.getElementById("sub-customer").value = "";
  document.getElementById("sub-spend-cap").value = "";
  openModal("modal-sub");
});

document.getElementById("btn-save-sub").addEventListener("click", async () => {
  const customer = document.getElementById("sub-customer").value.trim();
  const planId = document.getElementById("sub-plan").value;
  const spendCapRaw = document.getElementById("sub-spend-cap").value.trim();
  const spendCap = spendCapRaw ? parseFloat(spendCapRaw) : null;

  if (!customer) { toast("Customer address is required", "error"); return; }
  if (!planId) { toast("Please select a plan", "error"); return; }

  try {
    await api("POST", "/api/subscriptions", { customer, planId, spendCap });
    closeModal("modal-sub");
    toast("Subscription created", "success");
    refresh();
    document.querySelector('[data-page="subscriptions"]').click();
  } catch (e) {
    toast(e.message, "error");
  }
});

// ── Transactions ───────────────────────────────────────────────────────────────
async function refreshTx() {
  const customer = document.getElementById("tx-customer").value.trim();
  const status = document.getElementById("tx-status-filter").value;

  const params = new URLSearchParams();
  if (customer) params.set("customer", customer);
  if (status) params.set("status", status);

  transactions = await api("GET", "/api/transactions?" + params.toString());
  renderTxTable();
}

function renderTxTable() {
  const tbody = document.getElementById("tx-body");
  if (!transactions.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="8">No transactions found</td></tr>';
    return;
  }
  tbody.innerHTML = transactions.map((t, i) => `
    <tr class="row-in" style="animation-delay:${i * 22}ms">
      <td class="mono" style="font-size:11px">${t.id.slice(0, 8)}…</td>
      <td class="mono">${fmtAddr(t.customer)}</td>
      <td>${t.planName}</td>
      <td class="amount-positive">${fmt$(t.gross)}</td>
      <td>${fmt$(t.merchantAmount)}</td>
      <td class="text-muted">${fmt$(t.fee)}</td>
      <td>${badge(t.status)}</td>
      <td class="text-muted">${fmtTime(t.timestamp)}</td>
    </tr>
  `).join("");
}

document.getElementById("tx-customer").addEventListener("input", () => refreshTx());
document.getElementById("tx-status-filter").addEventListener("change", () => refreshTx());

// ── Modal helpers ──────────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
  document.body.style.overflow = "";
}

document.querySelectorAll("[data-close]").forEach(btn => {
  btn.addEventListener("click", () => closeModal(btn.dataset.close));
});

document.querySelectorAll(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", e => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// Close any open modal with Escape
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    document.querySelectorAll(".modal-overlay.open").forEach(m => closeModal(m.id));
  }
});

// ── Polling ────────────────────────────────────────────────────────────────────
function refresh() {
  const active = document.querySelector(".page.active")?.id;
  refreshStats();
  if (active === "page-products")       refreshPlans();
  if (active === "page-subscriptions")  refreshSubs();
  if (active === "page-transactions")   refreshTx();
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  const interval = appConfig.testMode ? 2000 : 10000;
  pollTimer = setInterval(refresh, interval);
}

// ── Init ───────────────────────────────────────────────────────────────────────
async function init() {
  try {
    appConfig = await api("GET", "/api/config");
  } catch (e) {
    console.error("Could not load config:", e);
  }
  updateBanner();
  attachRipplesToAll();
  await Promise.all([refreshStats(), refreshPlans()]);
  startPolling();
}

init();
