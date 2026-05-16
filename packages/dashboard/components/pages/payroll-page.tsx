"use client";

import * as React from "react";
import {
  Wallet,
  Users,
  CalendarClock,
  AlertTriangle,
  Plus,
  Zap,
  Upload,
  Send,
  RefreshCw,
  Trash2,
  Search,
  Clock,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { AreaChart } from "@/components/charts";
import { useToast } from "@/components/ui/toast";
import { fmt$, fmtAddr } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Recipient {
  id: string;
  label: string;
  address: string;
  ens?: string;
  role: string;
  token: string;
  totalPaid: number;
}

interface Schedule {
  id: string;
  name: string;
  recipients: number;
  amountPerRun: number;
  interval: string;
  nextRun: string;
  status: "active" | "paused";
}

interface HistoryRow {
  id: string;
  recipient: string;
  address: string;
  amount: number;
  token: string;
  status: "success" | "failed" | "pending";
  time: string;
}

const SEED_RECIPIENTS: Recipient[] = [
  { id: "r1", label: "Ava Chen", address: "0x8f3c91d4e2a7b6c5d8e9f0a1b2c3d4e5f6a72a4c", ens: "ava.eth", role: "Engineering", token: "USDC", totalPaid: 38400 },
  { id: "r2", label: "Marcus Reed", address: "0x1b7d2e9f0a3c4b5d6e7f8091a2b3c4d5e6f79d0e", role: "Design", token: "USDC", totalPaid: 27600 },
  { id: "r3", label: "Priya Nair", address: "0xa39f7c12b4d5e6f78091a2b3c4d5e6f7a8b97f12", ens: "priya.eth", role: "Contractor", token: "USDC", totalPaid: 19200 },
  { id: "r4", label: "Diego Santos", address: "0xc7e44e8891a2b3c4d5e6f7a8b9c0d1e2f3a44e88", role: "Growth", token: "USDT", totalPaid: 31050 },
];

const SEED_SCHEDULES: Schedule[] = [
  { id: "s1", name: "Core team — monthly", recipients: 8, amountPerRun: 64200, interval: "Monthly", nextRun: "Jun 1, 2026", status: "active" },
  { id: "s2", name: "Contractors — biweekly", recipients: 5, amountPerRun: 18400, interval: "Every 14 days", nextRun: "May 28, 2026", status: "active" },
  { id: "s3", name: "Advisors — quarterly", recipients: 3, amountPerRun: 9000, interval: "Quarterly", nextRun: "Jul 1, 2026", status: "paused" },
];

const SEED_HISTORY: HistoryRow[] = [
  { id: "h1", recipient: "Ava Chen", address: "0x8f3c…2a4c", amount: 4800, token: "USDC", status: "success", time: "Today · 09:12" },
  { id: "h2", recipient: "Marcus Reed", address: "0x1b7d…9d0e", amount: 3450, token: "USDC", status: "success", time: "Today · 09:12" },
  { id: "h3", recipient: "Diego Santos", address: "0xc7e4…4e88", amount: 3900, token: "USDT", status: "failed", time: "Today · 09:12" },
  { id: "h4", recipient: "Priya Nair", address: "0xa39f…7f12", amount: 2400, token: "USDC", status: "success", time: "May 1 · 09:00" },
  { id: "h5", recipient: "Ava Chen", address: "0x8f3c…2a4c", amount: 4800, token: "USDC", status: "pending", time: "Queued" },
];

const PAYROLL_TREND = [32, 36, 34, 41, 39, 47, 52, 49, 58, 61, 67, 74];
const TREND_LABELS = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];

type Tab = "addresses" | "recurring" | "timeline" | "history";

const TABS: { key: Tab; label: string }[] = [
  { key: "addresses", label: "Stored Addresses" },
  { key: "recurring", label: "Recurring Payroll" },
  { key: "timeline", label: "Upcoming Timeline" },
  { key: "history", label: "History & Retries" },
];

export function PayrollPage({ testMode }: { testMode: boolean }) {
  const { toast } = useToast();
  const [tab, setTab] = React.useState<Tab>("addresses");
  const [recipients, setRecipients] = React.useState<Recipient[]>(SEED_RECIPIENTS);
  const [schedules, setSchedules] = React.useState<Schedule[]>(SEED_SCHEDULES);
  const [history, setHistory] = React.useState<HistoryRow[]>(SEED_HISTORY);
  const [search, setSearch] = React.useState("");
  const [quickPayOpen, setQuickPayOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);

  const filteredRecipients = recipients.filter(
    (r) =>
      r.label.toLowerCase().includes(search.toLowerCase()) ||
      r.address.toLowerCase().includes(search.toLowerCase()) ||
      (r.ens ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const totalVolume = history
    .filter((h) => h.status === "success")
    .reduce((s, h) => s + h.amount, 0);
  const failedCount = history.filter((h) => h.status === "failed").length;

  function quickPay(recipientId: string, amount: number, token: string) {
    const r = recipients.find((x) => x.id === recipientId);
    if (!r) return;
    const fee = 1 + amount * 0.0025 + amount * 0.001;
    setHistory((h) => [
      {
        id: `h${Date.now()}`,
        recipient: r.label,
        address: fmtAddr(r.address),
        amount,
        token,
        status: "success",
        time: "Just now",
      },
      ...h,
    ]);
    setRecipients((rs) =>
      rs.map((x) => (x.id === r.id ? { ...x, totalPaid: x.totalPaid + amount } : x)),
    );
    toast(
      `Paid ${fmt$(amount)} ${token} to ${r.label} · fee ${fmt$(fee)}`,
      "success",
    );
  }

  function retry(id: string) {
    setHistory((h) =>
      h.map((row) => (row.id === id ? { ...row, status: "success", time: "Retried" } : row)),
    );
    toast("Payroll payment retried successfully", "success");
  }

  function toggleSchedule(id: string) {
    setSchedules((s) =>
      s.map((sch) =>
        sch.id === id
          ? { ...sch, status: sch.status === "active" ? "paused" : "active" }
          : sch,
      ),
    );
  }

  function addRecipient(label: string, address: string, role: string, token: string) {
    setRecipients((r) => [
      {
        id: `r${Date.now()}`,
        label,
        address,
        role,
        token,
        totalPaid: 0,
        ens: address.endsWith(".eth") ? address : undefined,
      },
      ...r,
    ]);
    toast(`${label} saved onchain to your payroll registry`, "success");
  }

  return (
    <section className="animate-page-in mx-auto w-full max-w-[1180px] px-8 pb-20 pt-9 lg:px-12">
      <PageHeader
        title="Payroll"
        subtitle="Store recipients onchain, run instant or recurring distributions"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => toast("CSV import — drop a file to map columns", "success")}>
              <Upload className="h-3.5 w-3.5" strokeWidth={2.5} />
              Import CSV
            </Button>
            <Button onClick={() => setQuickPayOpen(true)}>
              <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
              Quick Pay
            </Button>
          </div>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Payroll Volume"
          value={totalVolume}
          format="money"
          sub="settled this cycle"
          delta={8.7}
          spark={[30, 34, 33, 40, 44, 50, 58]}
          icon={<Wallet className="h-3 w-3" strokeWidth={2.5} />}
        />
        <StatCard
          label="Stored Recipients"
          value={recipients.length}
          format="int"
          sub="onchain registry"
          icon={<Users className="h-3 w-3" strokeWidth={2.5} />}
        />
        <StatCard
          label="Active Schedules"
          value={schedules.filter((s) => s.status === "active").length}
          format="int"
          sub={`next run ${schedules[1]?.nextRun ?? "—"}`}
          icon={<CalendarClock className="h-3 w-3" strokeWidth={2.5} />}
        />
        <StatCard
          label="Failed Payrolls"
          value={failedCount}
          format="int"
          sub="in retry queue"
          delta={-1.0}
          icon={<AlertTriangle className="h-3 w-3" strokeWidth={2.5} />}
        />
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Payroll analytics</CardTitle>
          <span className="text-[12px] text-muted-foreground">
            distributed volume · last 12 months
          </span>
        </CardHeader>
        <div className="p-4">
          <AreaChart
            data={PAYROLL_TREND}
            labels={TREND_LABELS}
            height={200}
            color="#0a84ff"
          />
        </div>
      </Card>

      {/* tabs */}
      <div className="mb-5 inline-flex rounded-xl border border-border bg-secondary/50 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
              tab === t.key
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "addresses" && (
        <Card>
          <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/40 px-5 py-3.5">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search label, address, or ENS…"
                className="h-9 pl-9"
              />
            </div>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              Save Address
            </Button>
          </div>
          {filteredRecipients.length === 0 ? (
            <EmptyState
              Icon={Users}
              title="No stored addresses"
              description="Save employee and contractor wallets to your onchain payroll registry for one-click payouts."
              action={
                <Button onClick={() => setAddOpen(true)}>
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Save Address
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Recipient</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Total Paid</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecipients.map((r, i) => (
                  <TableRow
                    key={r.id}
                    className="animate-row-in"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-gradient text-[11px] font-bold text-white">
                          {r.label.slice(0, 1)}
                        </span>
                        <strong className="font-semibold">{r.label}</strong>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs">{fmtAddr(r.address)}</div>
                      {r.ens && (
                        <div className="mt-0.5 text-[11px] text-brand-600 dark:text-brand-300">
                          {r.ens}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.role}</TableCell>
                    <TableCell>
                      <Badge variant="completed">{r.token}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {fmt$(r.totalPaid)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => quickPay(r.id, 2500, r.token)}
                        >
                          <Send className="h-3 w-3" />
                          Pay
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() =>
                            setRecipients((rs) => rs.filter((x) => x.id !== r.id))
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {tab === "recurring" && (
        <Card>
          <CardHeader>
            <CardTitle>Recurring payroll manager</CardTitle>
            <Button size="sm" onClick={() => toast("New schedule wizard opening…", "success")}>
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              New Schedule
            </Button>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Schedule</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Amount / run</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((s, i) => (
                <TableRow
                  key={s.id}
                  className="animate-row-in"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <TableCell>
                    <strong className="font-semibold">{s.name}</strong>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      executor-automated · same model as subscriptions
                    </div>
                  </TableCell>
                  <TableCell>{s.recipients}</TableCell>
                  <TableCell className="font-semibold tabular-nums">
                    {fmt$(s.amountPerRun)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.interval}</TableCell>
                  <TableCell>{s.nextRun}</TableCell>
                  <TableCell>
                    <StatusBadge status={s.status === "active" ? "active" : "inactive"} />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleSchedule(s.id)}
                    >
                      {s.status === "active" ? "Pause" : "Resume"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {tab === "timeline" && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming payroll timeline</CardTitle>
          </CardHeader>
          <div className="p-5">
            <ol className="relative space-y-1 border-l border-border pl-6">
              {schedules
                .filter((s) => s.status === "active")
                .concat(SEED_SCHEDULES.filter((s) => s.status === "paused"))
                .map((s, i) => (
                  <li key={s.id} className="relative pb-5">
                    <span
                      className={cn(
                        "absolute -left-[31px] grid h-5 w-5 place-items-center rounded-full border-2 border-background",
                        s.status === "active"
                          ? "bg-brand-500 text-white"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      <Clock className="h-2.5 w-2.5" />
                    </span>
                    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                      <div>
                        <div className="text-[13.5px] font-semibold text-foreground">
                          {s.name}
                        </div>
                        <div className="text-[12px] text-muted-foreground">
                          {s.recipients} recipients · {s.interval}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[13px] font-semibold tabular-nums text-foreground">
                          {fmt$(s.amountPerRun)}
                        </div>
                        <div className="text-[12px] text-muted-foreground">
                          {s.nextRun}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
            </ol>
            {testMode && (
              <p className="mt-2 text-[12px] text-amber-600 dark:text-amber-400">
                Test mode active — executors run these schedules at accelerated
                intervals.
              </p>
            )}
          </div>
        </Card>
      )}

      {tab === "history" && (
        <Card>
          <CardHeader>
            <CardTitle>Payroll history &amp; retry queue</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Recipient</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h, i) => (
                <TableRow
                  key={h.id}
                  className="animate-row-in"
                  style={{ animationDelay: `${i * 25}ms` }}
                >
                  <TableCell>
                    <strong className="font-semibold">{h.recipient}</strong>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{h.address}</TableCell>
                  <TableCell className="font-semibold tabular-nums">
                    {fmt$(h.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="completed">{h.token}</Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={h.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{h.time}</TableCell>
                  <TableCell>
                    {h.status === "failed" && (
                      <Button size="sm" variant="outline" onClick={() => retry(h.id)}>
                        <RefreshCw className="h-3 w-3" />
                        Retry
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <QuickPayDialog
        open={quickPayOpen}
        onOpenChange={setQuickPayOpen}
        recipients={recipients}
        onPay={quickPay}
      />
      <AddRecipientDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={addRecipient}
      />
    </section>
  );
}

function QuickPayDialog({
  open,
  onOpenChange,
  recipients,
  onPay,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recipients: Recipient[];
  onPay: (id: string, amount: number, token: string) => void;
}) {
  const [recipientId, setRecipientId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [token, setToken] = React.useState("USDC");

  React.useEffect(() => {
    if (open) {
      setRecipientId(recipients[0]?.id ?? "");
      setAmount("");
      setToken("USDC");
    }
  }, [open, recipients]);

  const amt = Number(amount) || 0;
  const flat = 1;
  const protocol = amt * 0.0025;
  const executor = amt * 0.001;
  const net = Math.max(0, amt - flat - protocol - executor);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader title="Quick Pay" onClose={() => onOpenChange(false)} />
        <DialogBody className="space-y-4">
          <div>
            <Label>Recipient</Label>
            <Select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
            >
              {recipients.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} — {r.ens ?? fmtAddr(r.address)}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Token</Label>
              <Select value={token} onChange={(e) => setToken(e.target.value)}>
                <option value="USDC">USDC</option>
                <option value="USDT">USDT</option>
                <option value="DAI">DAI</option>
              </Select>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-secondary/50 p-3.5 text-[12.5px]">
            <Row label="Flat protocol fee" value={fmt$(flat)} />
            <Row label="Protocol fee · 0.25%" value={fmt$(protocol)} />
            <Row label="Executor fee · 0.10%" value={fmt$(executor)} />
            <div className="my-2 border-t border-border" />
            <Row label="Recipient receives" value={fmt$(net)} strong />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!recipientId || amt <= 0}
            onClick={() => {
              onPay(recipientId, amt, token);
              onOpenChange(false);
            }}
          >
            <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
            Pay {amt > 0 ? fmt$(amt) : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddRecipientDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (label: string, address: string, role: string, token: string) => void;
}) {
  const [label, setLabel] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [role, setRole] = React.useState("Contractor");
  const [token, setToken] = React.useState("USDC");

  React.useEffect(() => {
    if (open) {
      setLabel("");
      setAddress("");
      setRole("Contractor");
      setToken("USDC");
    }
  }, [open]);

  const valid =
    label.trim().length > 0 &&
    (/^0x[0-9a-fA-F]{40}$/.test(address.trim()) ||
      address.trim().endsWith(".eth"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader title="Save payroll address" onClose={() => onOpenChange(false)} />
        <DialogBody className="space-y-4">
          <div>
            <Label>Label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Ava Chen"
            />
          </div>
          <div>
            <Label>Wallet address or ENS</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x… or name.eth"
              className="font-mono text-xs"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Stored in your onchain payroll registry —{" "}
              <code className="font-mono">payerStoredAddresses[you]</code>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Role</Label>
              <Select value={role} onChange={(e) => setRole(e.target.value)}>
                <option>Engineering</option>
                <option>Design</option>
                <option>Growth</option>
                <option>Contractor</option>
                <option>Advisor</option>
              </Select>
            </div>
            <div>
              <Label>Default token</Label>
              <Select value={token} onChange={(e) => setToken(e.target.value)}>
                <option value="USDC">USDC</option>
                <option value="USDT">USDT</option>
                <option value="DAI">DAI</option>
              </Select>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid}
            onClick={() => {
              onAdd(label.trim(), address.trim(), role, token);
              onOpenChange(false);
            }}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Save onchain
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-mono tabular-nums",
          strong ? "font-bold text-foreground" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}
