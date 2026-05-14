"use client";

import * as React from "react";
import {
  Wallet,
  TrendingUp,
  Users,
  Banknote,
  Clock,
  XCircle,
  Gift,
  Landmark,
  Plus,
  Send,
  Zap,
  RefreshCw,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { PageHeader, LiveBadge } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { IncomeChart } from "@/components/income-chart";
import { AreaChart, BarChart, Donut } from "@/components/charts";
import { fmt$, fmtAddr, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PageKey } from "@/components/sidebar";
import type { Stats, Transaction } from "@/lib/types";

interface Props {
  stats: Stats | null;
  newTxIds: Set<string>;
  onNavigate: (p: PageKey) => void;
  onCreateProduct: () => void;
  onCreateSubscription: () => void;
}

const SUB_GROWTH = [120, 138, 152, 149, 171, 198, 214, 236, 261, 248, 289, 318];
const SUB_LABELS = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];
const PAYROLL_DIST = [42, 38, 51, 47, 63, 58, 71];
const PAYROLL_LABELS = ["W1", "W2", "W3", "W4", "W5", "W6", "W7"];
const CHAIN_SEGMENTS = [
  { label: "Base", value: 48, color: "#0052ff" },
  { label: "Optimism", value: 27, color: "#ff5a5f" },
  { label: "Arbitrum", value: 18, color: "#28a0f0" },
  { label: "Ethereum", value: 7, color: "#8c80ff" },
];

export function DashboardPage({
  stats,
  newTxIds,
  onNavigate,
  onCreateProduct,
  onCreateSubscription,
}: Props) {
  const recent: Transaction[] = stats?.recentTransactions ?? [];
  const revenue = stats?.totalRevenue ?? 0;
  const fees = stats?.totalFees ?? 0;
  const charges = stats?.totalCharges ?? 0;
  const activeSubs = stats?.activeSubs ?? 0;

  // Derived / synthesized metrics for surfaces without a dedicated backend yet.
  const payrollVolume = revenue * 3.4 + 84_200;
  const executorRewards = fees * 0.4 + 12.6;
  const pendingExecutions = 3 + (charges % 9);
  const failedTx = recent.filter((t) => t.status === "failed").length;
  const totalBalance = revenue + payrollVolume * 0.18 + 248_000;

  const QUICK = [
    { label: "Create Product", Icon: Plus, run: onCreateProduct },
    { label: "Run Payroll", Icon: Send, run: () => onNavigate("payroll") },
    { label: "Quick Pay", Icon: Zap, run: () => onNavigate("payroll") },
    { label: "Create Subscription", Icon: RefreshCw, run: onCreateSubscription },
    { label: "View Docs", Icon: BookOpen, run: () => (window.location.href = "/docs") },
  ];

  return (
    <section className="animate-page-in mx-auto w-full max-w-[1180px] px-8 pb-20 pt-9 lg:px-12">
      <PageHeader
        title="Overview"
        subtitle="A real-time view of your Pulse billing & payroll operations"
        action={<LiveBadge />}
      />

      {/* quick actions */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {QUICK.map((q) => (
          <button
            key={q.label}
            onClick={q.run}
            className="group flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-left shadow-soft transition-all duration-200 ease-spring hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift"
          >
            <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-500/15 to-brand-500/5 text-brand-600 transition-colors group-hover:from-brand-500/25 dark:text-brand-300">
              <q.Icon className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <span className="text-[12.5px] font-semibold text-foreground">
              {q.label}
            </span>
          </button>
        ))}
      </div>

      {/* widgets */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Balance"
          value={totalBalance}
          format="money"
          sub="treasury + receivables"
          delta={9.4}
          spark={[40, 44, 42, 50, 55, 60, 72]}
          icon={<Wallet className="h-3 w-3" strokeWidth={2.5} />}
        />
        <StatCard
          label="Monthly Revenue"
          value={revenue}
          format="money"
          sub="net to merchant"
          delta={12.1}
          spark={[20, 28, 26, 35, 33, 44, 52]}
          icon={<TrendingUp className="h-3 w-3" strokeWidth={2.5} />}
        />
        <StatCard
          label="Active Subscriptions"
          value={activeSubs}
          format="int"
          sub="recurring customers"
          delta={3.6}
          spark={[10, 12, 11, 14, 16, 15, 19]}
          icon={<Users className="h-3 w-3" strokeWidth={2.5} />}
        />
        <StatCard
          label="Payroll Volume"
          value={payrollVolume}
          format="money"
          sub="distributed this month"
          delta={8.2}
          spark={[30, 33, 38, 36, 44, 49, 55]}
          icon={<Banknote className="h-3 w-3" strokeWidth={2.5} />}
        />
        <StatCard
          label="Pending Executions"
          value={pendingExecutions}
          format="int"
          sub="queued for executors"
          icon={<Clock className="h-3 w-3" strokeWidth={2.5} />}
        />
        <StatCard
          label="Failed Transactions"
          value={failedTx}
          format="int"
          sub="needs retry"
          delta={-1.2}
          icon={<XCircle className="h-3 w-3" strokeWidth={2.5} />}
        />
        <StatCard
          label="Executor Rewards"
          value={executorRewards}
          format="money"
          sub="paid to network"
          delta={5.5}
          icon={<Gift className="h-3 w-3" strokeWidth={2.5} />}
        />
        <StatCard
          label="Protocol Fees"
          value={fees}
          format="money"
          sub="protocol earnings"
          delta={6.8}
          icon={<Landmark className="h-3 w-3" strokeWidth={2.5} />}
        />
      </div>

      <IncomeChart />

      {/* secondary charts */}
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Subscription growth</CardTitle>
            <span className="text-[12px] text-muted-foreground">last 12 months</span>
          </CardHeader>
          <div className="p-4">
            <AreaChart data={SUB_GROWTH} labels={SUB_LABELS} height={200} />
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Chain activity</CardTitle>
          </CardHeader>
          <div className="flex items-center gap-5 p-5">
            <Donut segments={CHAIN_SEGMENTS} size={132} thickness={20} />
            <ul className="flex-1 space-y-2">
              {CHAIN_SEGMENTS.map((s) => (
                <li key={s.label} className="flex items-center gap-2 text-[12.5px]">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: s.color }}
                  />
                  <span className="text-foreground">{s.label}</span>
                  <span className="ml-auto font-semibold tabular-nums text-muted-foreground">
                    {s.value}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Payroll distributions</CardTitle>
            <span className="text-[12px] text-muted-foreground">7 weeks</span>
          </CardHeader>
          <div className="p-4">
            <BarChart
              data={PAYROLL_DIST}
              labels={PAYROLL_LABELS}
              height={180}
              color="#0a84ff"
            />
          </div>
        </Card>

        {/* activity feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Activity feed</CardTitle>
            <button
              onClick={() => onNavigate("transactions")}
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-600 hover:underline dark:text-brand-300"
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </CardHeader>
          <div className="divide-y divide-border">
            {recent.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                No activity yet — create a product and subscribe to start
              </div>
            ) : (
              recent.slice(0, 7).map((t, i) => {
                const isNew = newTxIds.has(t.id);
                const ok = t.status === "success";
                return (
                  <div
                    key={t.id}
                    className={cn(
                      "flex animate-row-in items-center gap-3 px-5 py-3",
                      isNew && "animate-flash",
                    )}
                    style={{ animationDelay: `${i * 35}ms` }}
                  >
                    <span
                      className={cn(
                        "grid h-8 w-8 flex-shrink-0 place-items-center rounded-full",
                        ok
                          ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/12 text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {ok ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-foreground">
                        {ok ? "Charge settled" : "Settlement failed"} ·{" "}
                        {t.planName}
                      </div>
                      <div className="truncate font-mono text-[11px] text-muted-foreground">
                        {fmtAddr(t.customer)} · {fmtTime(t.timestamp)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={cn(
                          "text-[13px] font-semibold tabular-nums",
                          ok
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground",
                        )}
                      >
                        {fmt$(t.merchantAmount)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        fee {fmt$(t.fee)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* recent transactions table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Customer</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No transactions yet
                </TableCell>
              </TableRow>
            ) : (
              recent.map((t, i) => {
                const isNew = newTxIds.has(t.id);
                return (
                  <TableRow
                    key={t.id}
                    className={cn("animate-row-in", isNew && "[&_td]:animate-flash")}
                    style={{ animationDelay: `${i * 35}ms` }}
                  >
                    <TableCell className="font-mono text-xs">
                      {fmtAddr(t.customer)}
                    </TableCell>
                    <TableCell>{t.planName}</TableCell>
                    <TableCell className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {fmt$(t.merchantAmount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {fmt$(t.fee)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {fmtTime(t.timestamp)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </section>
  );
}
