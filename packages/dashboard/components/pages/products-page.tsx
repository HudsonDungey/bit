"use client";

import * as React from "react";
import { Plus, Package, Users, TrendingDown, AlertTriangle, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { usePulseActions } from "@/lib/wallet-actions";
import { fmt$ } from "@/lib/format";
import type { Plan } from "@/lib/types";
import type { Hex } from "viem";

interface Props {
  plans: Plan[];
  refresh: () => void;
  onCreate: () => void;
}

/// Deterministic pseudo-metrics derived from a plan id — keeps the product
/// performance view populated before a metrics backend exists.
function planMetrics(p: Plan) {
  let h = 0;
  for (let i = 0; i < p.id.length; i++) h = (h * 31 + p.id.charCodeAt(i)) >>> 0;
  const subscribers = p.active ? 12 + (h % 240) : h % 18;
  const mrr = subscribers * p.price;
  const churn = ((h >> 4) % 70) / 10 + 0.4;
  const failed = (h >> 8) % 6;
  return { subscribers, mrr, churn, failed };
}

export function ProductsPage({ plans, refresh, onCreate }: Props) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const actions = usePulseActions();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const totals = React.useMemo(() => {
    let mrr = 0;
    let subscribers = 0;
    let failed = 0;
    let churnSum = 0;
    for (const p of plans) {
      const m = planMetrics(p);
      mrr += m.mrr;
      subscribers += m.subscribers;
      failed += m.failed;
      churnSum += m.churn;
    }
    return {
      mrr,
      subscribers,
      failed,
      churn: plans.length ? churnSum / plans.length : 0,
    };
  }, [plans]);

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
    <section className="animate-page-in mx-auto w-full max-w-[1180px] px-8 pb-20 pt-9 lg:px-12">
      <PageHeader
        title="Products"
        subtitle="Create subscription products and track their performance"
        action={
          <Button onClick={onCreate}>
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Create Product
          </Button>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total MRR"
          value={totals.mrr}
          format="money"
          sub="across all products"
          delta={6.2}
          icon={<DollarSign className="h-3 w-3" strokeWidth={2.5} />}
        />
        <StatCard
          label="Subscribers"
          value={totals.subscribers}
          format="int"
          sub="active customers"
          delta={4.1}
          icon={<Users className="h-3 w-3" strokeWidth={2.5} />}
        />
        <StatCard
          label="Avg churn"
          value={Number(totals.churn.toFixed(1))}
          format="int"
          sub="% monthly"
          delta={-0.8}
          icon={<TrendingDown className="h-3 w-3" strokeWidth={2.5} />}
        />
        <StatCard
          label="Failed payments"
          value={totals.failed}
          format="int"
          sub="last 30 days"
          delta={-2.4}
          icon={<AlertTriangle className="h-3 w-3" strokeWidth={2.5} />}
        />
      </div>

      <Card>
        {plans.length === 0 ? (
          <EmptyState
            Icon={Package}
            title="No products yet"
            description="Create your first subscription product to start billing customers onchain."
            action={
              <Button onClick={onCreate}>
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                Create Product
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>MRR</TableHead>
                <TableHead>Subscribers</TableHead>
                <TableHead>Churn</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((p, i) => {
                const m = planMetrics(p);
                return (
                  <TableRow
                    key={p.id}
                    className="animate-row-in"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <TableCell>
                      <strong className="font-semibold">{p.name}</strong>
                      {p.description && (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {p.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <strong className="font-semibold">{fmt$(p.price)}</strong>{" "}
                      <span className="text-muted-foreground">USDC</span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        {p.intervalLabel}
                        {p.isTestInterval && <Badge variant="test">test</Badge>}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {fmt$(m.mrr)}
                    </TableCell>
                    <TableCell className="tabular-nums">{m.subscribers}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {m.churn.toFixed(1)}%
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
                        <span className="text-xs text-muted-foreground">
                          Cannot re-activate
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </section>
  );
}
