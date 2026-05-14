"use client";

import * as React from "react";
import { DollarSign, Activity, CheckCircle2, Users, LayoutGrid } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { PageHeader, LiveBadge } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { fmt$, fmtAddr, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Stats, Transaction } from "@/lib/types";

interface Props {
  stats: Stats | null;
  newTxIds: Set<string>;
}

export function DashboardPage({ stats, newTxIds }: Props) {
  const recent: Transaction[] = stats?.recentTransactions ?? [];

  return (
    <section className="animate-page-in mx-auto w-full max-w-[1180px] px-12 pb-20 pt-11">
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your Pulse subscription business"
        action={<LiveBadge />}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total Revenue"
          value={stats?.totalRevenue ?? 0}
          format="money"
          sub="net to merchant"
          icon={<DollarSign className="h-3 w-3" strokeWidth={2.5} />}
        />
        <StatCard
          label="Total Fees"
          value={stats?.totalFees ?? 0}
          format="money"
          sub="protocol earnings"
          icon={<Activity className="h-3 w-3" strokeWidth={2.5} />}
        />
        <StatCard
          label="Total Charges"
          value={stats?.totalCharges ?? 0}
          format="int"
          sub="successful"
          icon={<CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />}
        />
        <StatCard
          label="Active Subs"
          value={stats?.activeSubs ?? 0}
          format="int"
          sub="subscriptions"
          icon={<Users className="h-3 w-3" strokeWidth={2.5} />}
        />
        <StatCard
          label="Active Plans"
          value={stats?.activePlans ?? 0}
          format="int"
          sub="products"
          icon={<LayoutGrid className="h-3 w-3" strokeWidth={2.5} />}
        />
      </div>

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
                <TableCell colSpan={6} className="py-12 text-center text-sm text-slate-500">
                  No transactions yet
                </TableCell>
              </TableRow>
            ) : (
              recent.map((t, i) => {
                const isNew = newTxIds.has(t.id);
                return (
                  <TableRow
                    key={t.id}
                    className={cn(
                      "animate-row-in",
                      isNew && "[&_td]:animate-flash",
                    )}
                    style={{ animationDelay: `${i * 35}ms` }}
                  >
                    <TableCell className="font-mono text-xs">{fmtAddr(t.customer)}</TableCell>
                    <TableCell>{t.planName}</TableCell>
                    <TableCell className="font-semibold text-emerald-600 tabular-nums">
                      {fmt$(t.merchantAmount)}
                    </TableCell>
                    <TableCell className="text-slate-500">{fmt$(t.fee)}</TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="text-slate-500">{fmtTime(t.timestamp)}</TableCell>
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
