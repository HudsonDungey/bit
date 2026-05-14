"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { api } from "@/lib/api";
import { fmt$, fmtAddr, fmtNextCharge } from "@/lib/format";
import type { Plan, Subscription } from "@/lib/types";
import { CreateSubDialog } from "@/components/dialogs/create-sub-dialog";

interface Props {
  subscriptions: Subscription[];
  plans: Plan[];
  refresh: () => void;
}

export function SubscriptionsPage({ subscriptions, plans, refresh }: Props) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [statusF, setStatusF] = React.useState("");

  let filtered = subscriptions;
  if (search) filtered = filtered.filter((s) => s.customer.toLowerCase().includes(search.toLowerCase()));
  if (statusF) filtered = filtered.filter((s) => s.status === statusF);

  async function cancel(id: string) {
    const ok = await confirm({
      title: "Cancel subscription?",
      description: "The customer will no longer be charged. You can re-subscribe them later.",
      okLabel: "Cancel subscription",
      danger: true,
    });
    if (!ok) return;
    try {
      await api("POST", `/api/subscriptions/${id}/cancel`);
      toast("Subscription cancelled", "success");
      refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <section className="animate-page-in mx-auto w-full max-w-[1180px] px-12 pb-20 pt-11">
      <PageHeader
        title="Subscriptions"
        subtitle="Active and historical customer subscriptions"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Subscribe
          </Button>
        }
      />

      <Card>
        <div className="flex items-center gap-2.5 border-b border-slate-200 bg-slate-50/60 px-5 py-3.5">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by customer…"
            className="h-9 w-60"
          />
          <Select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="h-9 w-44">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Customer</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Charges</TableHead>
              <TableHead>Total Paid</TableHead>
              <TableHead>Next Charge</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-12 text-center text-sm text-slate-500">
                  No subscriptions found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s, i) => {
                const nc = s.status === "active" ? fmtNextCharge(s.nextChargeAt) : null;
                return (
                  <TableRow key={s.id} className="animate-row-in" style={{ animationDelay: `${i * 30}ms` }}>
                    <TableCell className="font-mono text-xs">{fmtAddr(s.customer)}</TableCell>
                    <TableCell>{s.planName}</TableCell>
                    <TableCell>{s.chargeCount}</TableCell>
                    <TableCell>
                      <strong className="font-semibold tabular-nums">{fmt$(s.totalPaid)}</strong>
                    </TableCell>
                    <TableCell>
                      {nc ? (
                        <span className={nc.soon ? "font-semibold text-amber-600" : ""}>{nc.text}</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell>
                      {s.status === "active" && (
                        <Button variant="danger" size="sm" onClick={() => cancel(s.id)}>
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <CreateSubDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        plans={plans}
        onCreated={refresh}
      />
    </section>
  );
}
