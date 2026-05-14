"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";
import { fmt$, fmtAddr, fmtTime } from "@/lib/format";
import type { Transaction } from "@/lib/types";

interface Props {
  visible: boolean;
}

export function TransactionsPage({ visible }: Props) {
  const [customer, setCustomer] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [items, setItems] = React.useState<Transaction[]>([]);

  const fetchTx = React.useCallback(async () => {
    const params = new URLSearchParams();
    if (customer) params.set("customer", customer);
    if (status) params.set("status", status);
    try {
      const r = await api<Transaction[]>("GET", "/api/transactions?" + params.toString());
      setItems(r);
    } catch {
      /* ignore */
    }
  }, [customer, status]);

  React.useEffect(() => {
    if (visible) fetchTx();
  }, [visible, fetchTx]);

  React.useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(fetchTx, 4000);
    return () => window.clearInterval(id);
  }, [visible, fetchTx]);

  return (
    <section className="animate-page-in mx-auto w-full max-w-[1180px] px-12 pb-20 pt-11">
      <PageHeader title="Transactions" subtitle="Full payment history" />

      <Card>
        <div className="flex items-center gap-2.5 border-b border-slate-200 bg-slate-50/60 px-5 py-3.5">
          <Input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="Filter by customer…"
            className="h-9 w-60"
          />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 w-44">
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Gross</TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="py-12 text-center text-sm text-slate-500">
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              items.map((t, i) => (
                <TableRow key={t.id} className="animate-row-in" style={{ animationDelay: `${i * 22}ms` }}>
                  <TableCell className="font-mono text-[11px]">{t.id.slice(0, 8)}…</TableCell>
                  <TableCell className="font-mono text-xs">{fmtAddr(t.customer)}</TableCell>
                  <TableCell>{t.planName}</TableCell>
                  <TableCell className="font-semibold text-emerald-600 tabular-nums">{fmt$(t.gross)}</TableCell>
                  <TableCell>{fmt$(t.merchantAmount)}</TableCell>
                  <TableCell className="text-slate-500">{fmt$(t.fee)}</TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="text-slate-500">{fmtTime(t.timestamp)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </section>
  );
}
