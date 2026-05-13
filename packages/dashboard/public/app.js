// ── State ──────────────────────────────────────────────────────────────────────
let appConfig = { testMode: false, testIntervals: [], productionIntervals: [] };
let plans = [], subscriptions = [], transactions = [];
let pollTimer = null;

// ── Navigation ─────────────────────────────────────────────────────────────────
document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    const page = item.dataset.page;
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    item.classList.add("active");
    document.getElementById("page-" + page).classList.add("active");
    refresh();
    if (page === "paymanager") refreshPayManager();
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
  if (diff <= 0) return '<span style="color:var(--warning)">now</span>';
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

// ── Config / test mode ─────────────────────────────────────────────────────────
const testToggle = document.getElementById("testModeToggle");
const testBanner = document.getElementById("test-banner");

testToggle.addEventListener("change", async () => {
  try {
    appConfig = await api("POST", "/api/config", { testMode: testToggle.checked });
    updateBanner();
  } catch (e) {
    alert("Could not update test mode: " + e.message);
    testToggle.checked = !testToggle.checked;
  }
});

function updateBanner() {
  testToggle.checked = appConfig.testMode;
  if (appConfig.testMode) {
    testBanner.classList.add("show");
    document.getElementById("main").style.paddingTop = "32px";
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
  document.getElementById("stat-revenue").textContent = fmt$(s.totalRevenue);
  document.getElementById("stat-fees").textContent = fmt$(s.totalFees);
  document.getElementById("stat-charges").textContent = s.totalCharges;
  document.getElementById("stat-subs").textContent = s.activeSubs;
  document.getElementById("stat-plans").textContent = s.activePlans;
  renderRecentTx(s.recentTransactions || []);
}

function renderRecentTx(txs) {
  const tbody = document.getElementById("recent-tx-body");
  if (!txs.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No transactions yet</td></tr>';
    return;
  }
  tbody.innerHTML = txs.map(t => `
    <tr>
      <td class="mono">${fmtAddr(t.customer)}</td>
      <td>${t.planName}</td>
      <td class="amount-positive">${fmt$(t.merchantAmount)}</td>
      <td class="text-muted">${fmt$(t.fee)}</td>
      <td>${badge(t.status)}</td>
      <td class="text-muted">${fmtTime(t.timestamp)}</td>
    </tr>
  `).join("");
}

// ── Plans ──────────────────────────────────────────────────────────────────────
async function refreshPlans() {
  plans = await api("GET", "/api/plans");
  const tbody = document.getElementById("plans-body");
  if (!plans.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No products yet — create one to get started</td></tr>';
    return;
  }
  tbody.innerHTML = plans.map(p => `
    <tr>
      <td>
        <strong>${p.name}</strong>
        ${p.description ? `<div class="text-muted" style="font-size:12px">${p.description}</div>` : ""}
      </td>
      <td>${fmt$(p.price)} USDC</td>
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
}

async function deactivatePlan(id) {
  if (!confirm("Deactivate this plan? All active subscriptions will be cancelled.")) return;
  await api("POST", `/api/plans/${id}/deactivate`);
  refresh();
}

async function activatePlan(id) {
  await api("POST", `/api/plans/${id}/activate`);
  refresh();
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

  if (!name) { alert("Name is required"); return; }
  if (!price || price <= 0) { alert("Price must be greater than 0"); return; }
  if (!intervalSeconds) { alert("Please select a billing interval"); return; }

  try {
    await api("POST", "/api/plans", { name, description: desc, price, feeBps, intervalSeconds, intervalLabel, cancelAfterCharges });
    closeModal("modal-plan");
    refresh();
  } catch (e) {
    alert("Error: " + e.message);
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
  tbody.innerHTML = filtered.map(s => `
    <tr>
      <td class="mono">${fmtAddr(s.customer)}</td>
      <td>${s.planName}</td>
      <td>${s.chargeCount}</td>
      <td>${fmt$(s.totalPaid)}</td>
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
}

document.getElementById("sub-search").addEventListener("input", renderSubsTable);
document.getElementById("sub-status-filter").addEventListener("change", renderSubsTable);

async function cancelSub(id) {
  if (!confirm("Cancel this subscription?")) return;
  await api("POST", `/api/subscriptions/${id}/cancel`);
  refresh();
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

  if (!customer) { alert("Customer address is required"); return; }
  if (!planId) { alert("Please select a plan"); return; }

  try {
    await api("POST", "/api/subscriptions", { customer, planId, spendCap });
    closeModal("modal-sub");
    refresh();
    // Navigate to subscriptions page
    document.querySelector('[data-page="subscriptions"]').click();
  } catch (e) {
    alert("Error: " + e.message);
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
  tbody.innerHTML = transactions.map(t => `
    <tr>
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
function openModal(id) { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

document.querySelectorAll("[data-close]").forEach(btn => {
  btn.addEventListener("click", () => closeModal(btn.dataset.close));
});

document.querySelectorAll(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", e => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// ── Polling ────────────────────────────────────────────────────────────────────
function refresh() {
  const active = document.querySelector(".page.active")?.id;
  refreshStats();
  if (active === "page-products")       refreshPlans();
  if (active === "page-subscriptions")  refreshSubs();
  if (active === "page-transactions")   refreshTx();
  if (active === "page-paymanager")     refreshPayManager();
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
  await Promise.all([refreshStats(), refreshPlans()]);
  startPolling();
}

init();

// ── Pay Manager ────────────────────────────────────────────────────────────────

let pmWallet = localStorage.getItem("pmWallet") || "";
let pmPayees = [];

function getPmWallet() {
  return document.getElementById("pm-wallet").value.trim() || "0xDemo";
}

// on wallet input change: save to localStorage, refresh balance + payees
document.getElementById("pm-wallet").addEventListener("input", e => {
  localStorage.setItem("pmWallet", e.target.value);
  if (document.getElementById("page-paymanager").classList.contains("active")) {
    refreshPayManager();
  }
});

// on page load, restore wallet
document.getElementById("pm-wallet").value = pmWallet;

async function refreshPayManager() {
  const user = getPmWallet();
  // fetch balance
  const bal = await api("GET", `/api/balance?user=${encodeURIComponent(user)}`);
  document.getElementById("pm-balance").textContent = fmt$(bal.balance);
  // fetch payees
  pmPayees = await api("GET", `/api/payees?user=${encodeURIComponent(user)}`);
  renderPayees();
  // fetch recent pay transactions (direction=out, customer=user)
  const txs = await api("GET", `/api/transactions?customer=${encodeURIComponent(user)}`);
  renderPayTx(txs.filter(t => t.direction === "out").slice(0, 20));
}

function renderPayees() {
  const tbody = document.getElementById("payees-body");
  if (!pmPayees.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No payees yet — add one to get started</td></tr>';
    return;
  }
  tbody.innerHTML = pmPayees.map(p => `
    <tr>
      <td><strong>${p.label || "—"}</strong></td>
      <td class="mono">${fmtAddr(p.address)}</td>
      <td class="text-muted">${fmtTime(p.addedAt)}</td>
      <td style="display:flex;gap:6px">
        <button class="btn btn-primary btn-sm" onclick="openQuickPay('${p.address}','${p.label}')">Pay</button>
        <button class="btn btn-danger btn-sm" onclick="removePayee('${p.address}')">Remove</button>
      </td>
    </tr>
  `).join("");
}

function renderPayTx(txs) {
  const tbody = document.getElementById("pay-tx-body");
  if (!txs.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No payments yet</td></tr>';
    return;
  }
  tbody.innerHTML = txs.map(t => `
    <tr>
      <td class="mono">${fmtAddr(t.payee || t.customer)}</td>
      <td>${t.planName || "—"}</td>
      <td class="amount-negative">-${fmt$(t.gross)}</td>
      <td>${fmt$(t.merchantAmount)}</td>
      <td class="text-muted">${fmt$(t.fee)}</td>
      <td class="text-muted">${fmtTime(t.timestamp)}</td>
    </tr>
  `).join("");
}

// Add payee
document.getElementById("btn-add-payee").addEventListener("click", () => {
  document.getElementById("add-payee-address").value = "";
  document.getElementById("add-payee-label").value = "";
  openModal("modal-add-payee");
});

document.getElementById("btn-save-payee").addEventListener("click", async () => {
  const user    = getPmWallet();
  const address = document.getElementById("add-payee-address").value.trim();
  const label   = document.getElementById("add-payee-label").value.trim();
  if (!address) { alert("Address is required"); return; }
  try {
    await api("POST", "/api/payees", { user, address, label });
    closeModal("modal-add-payee");
    refreshPayManager();
  } catch (e) { alert("Error: " + e.message); }
});

async function removePayee(address) {
  if (!confirm("Remove this payee?")) return;
  const user = getPmWallet();
  await api("DELETE", `/api/payees/${encodeURIComponent(address)}?user=${encodeURIComponent(user)}`);
  refreshPayManager();
}

// Quick pay
function openQuickPay(address, label) {
  document.getElementById("qp-address").textContent = address;
  document.getElementById("qp-label").textContent   = label || "—";
  document.getElementById("qp-amount").value = "";
  document.getElementById("qp-fee-preview").textContent = "$0.00";
  document.getElementById("qp-net-preview").textContent = "$0.00";
  document.getElementById("qp-address-hidden").value = address;
  openModal("modal-quick-pay");
}

document.getElementById("qp-amount").addEventListener("input", e => {
  const gross = parseFloat(e.target.value) || 0;
  const fee   = Math.round(gross * 50) / 10000;
  document.getElementById("qp-fee-preview").textContent = fmt$(fee);
  document.getElementById("qp-net-preview").textContent  = fmt$(gross - fee);
});

document.getElementById("btn-send-payment").addEventListener("click", async () => {
  const from   = getPmWallet();
  const to     = document.getElementById("qp-address-hidden").value;
  const amount = parseFloat(document.getElementById("qp-amount").value);
  if (!amount || amount <= 0) { alert("Enter a valid amount"); return; }
  const payee = pmPayees.find(p => p.address === to);
  try {
    await api("POST", "/api/pay", { from, to, amount, label: payee?.label });
    closeModal("modal-quick-pay");
    refreshPayManager();
  } catch (e) { alert("Error: " + e.message); }
});

// Fund account
document.getElementById("btn-fund").addEventListener("click", async () => {
  const user = getPmWallet();
  await api("POST", "/api/fund", { user, amount: 10000 });
  refreshPayManager();
});

// Batch payroll
document.getElementById("btn-run-payroll").addEventListener("click", () => {
  renderPayrollTable();
  openModal("modal-payroll");
});

function renderPayrollTable() {
  const tbody = document.getElementById("payroll-table-body");
  if (!pmPayees.length) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--text-muted)">No payees — add some first</td></tr>';
    return;
  }
  tbody.innerHTML = pmPayees.map((p, i) => `
    <tr>
      <td><strong>${p.label || "—"}</strong><div class="mono text-muted" style="font-size:11px">${fmtAddr(p.address)}</div></td>
      <td><input type="number" class="payroll-amount" data-address="${p.address}" data-label="${p.label}" min="0" step="0.01" placeholder="0.00" style="width:100px;padding:6px 8px;border:1px solid var(--border);border-radius:5px;font-size:13px" oninput="updatePayrollSummary()" /></td>
      <td class="payroll-net text-muted" id="pr-net-${i}">—</td>
    </tr>
  `).join("");
  updatePayrollSummary();
}

function updatePayrollSummary() {
  let totalGross = 0;
  document.querySelectorAll(".payroll-amount").forEach((el, i) => {
    const gross = parseFloat(el.value) || 0;
    const net   = Math.round((gross - gross * 50 / 10000) * 100) / 100;
    document.getElementById(`pr-net-${i}`).textContent = gross > 0 ? fmt$(net) : "—";
    totalGross += gross;
  });
  const totalFee = Math.round(totalGross * 50) / 10000;
  document.getElementById("pr-total-gross").textContent = fmt$(totalGross);
  document.getElementById("pr-total-fee").textContent   = fmt$(totalFee);
  document.getElementById("pr-total-net").textContent   = fmt$(totalGross - totalFee);
}

document.getElementById("btn-run-payroll-confirm").addEventListener("click", async () => {
  const from = getPmWallet();
  const payments = [];
  document.querySelectorAll(".payroll-amount").forEach(el => {
    const amount = parseFloat(el.value) || 0;
    if (amount > 0) payments.push({ to: el.dataset.address, amount, label: el.dataset.label });
  });
  if (!payments.length) { alert("Enter at least one amount"); return; }
  try {
    await api("POST", "/api/pay/batch", { from, payments });
    closeModal("modal-payroll");
    refreshPayManager();
  } catch (e) { alert("Error: " + e.message); }
});
