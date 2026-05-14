"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { usePulseActions } from "@/lib/wallet-actions";
import { fmt$ } from "@/lib/format";
import type { IntervalDef, Plan } from "@/lib/types";
import type { Hex } from "viem";
import { CreatePlanDialog } from "@/components/dialogs/create-plan-dialog";

interface Props {
  plans: Plan[];
  testIntervals: IntervalDef[];
  productionIntervals: IntervalDef[];
  refresh: () => void;
}

export function ProductsPage({ plans, testIntervals, productionIntervals, refresh }: Props) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const actions = usePulseActions();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  async function deactivate(id: string) {
    if (!actions.account.address) return toast("Connect your merchant wallet first", "error");
    const ok = await confirm({
      title: "Deactivate plan?",
      description:
        "Future charges for subscribers on this plan will revert. Existing subscriptions can still be cancelled. This is one-way — to re-enable, create a new plan.",
      okLabel: "Deactivate",
      danger: true,
    });
    if (!ok) return;
    setPendingId(id);
    try {
      toast("Confirm deactivation in your wallet…", "success");
      await actions.deactivatePlan(id as Hex);
      toast("Plan deactivated", "success");
      refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="animate-page-in mx-auto w-full max-w-[1180px] px-12 pb-20 pt-11">
      <PageHeader
        title="Products"
        subtitle="Define billing plans and pricing"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Create Product
          </Button>
        }
      />

      <Card>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Interval</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>Auto-cancel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-12 text-center text-sm text-slate-500">
                  No products yet — create one to get started
                </TableCell>
              </TableRow>
            ) : (
              plans.map((p, i) => (
                <TableRow key={p.id} className="animate-row-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <TableCell>
                    <strong className="font-semibold">{p.name}</strong>
                    {p.description && (
                      <div className="mt-0.5 text-xs text-slate-500">{p.description}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <strong className="font-semibold">{fmt$(p.price)}</strong>{" "}
                    <span className="text-slate-500">USDC</span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      {p.intervalLabel}
                      {p.isTestInterval && <Badge variant="test">test</Badge>}
                    </span>
                  </TableCell>
                  <TableCell>{p.feeBps / 100}%</TableCell>
                  <TableCell>
                    {p.cancelAfterCharges !== null
                      ? `After ${p.cancelAfterCharges} charges`
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.active ? "active" : "inactive"} />
                  </TableCell>
                  <TableCell>
                    {p.active ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => deactivate(p.id)}
                        disabled={pendingId === p.id}
                      >
                        {pendingId === p.id ? "Deactivating…" : "Deactivate"}
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-500">Cannot re-activate</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <CreatePlanDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        testIntervals={testIntervals}
        productionIntervals={productionIntervals}
        onCreated={refresh}
      />
    </section>
  );
}
