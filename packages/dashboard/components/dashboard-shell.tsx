"use client";

import * as React from "react";
import { Sidebar, type PageKey } from "@/components/sidebar";
import { TestBanner } from "@/components/test-banner";
import { DashboardPage } from "@/components/pages/dashboard-page";
import { ProductsPage } from "@/components/pages/products-page";
import { SubscriptionsPage } from "@/components/pages/subscriptions-page";
import { TransactionsPage } from "@/components/pages/transactions-page";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import type { IntervalDef, Plan, Stats, Subscription } from "@/lib/types";

interface ConfigState {
  testMode: boolean;
  testIntervals: IntervalDef[];
  productionIntervals: IntervalDef[];
}

export function DashboardShell() {
  const { toast } = useToast();
  const [page, setPage] = React.useState<PageKey>("dashboard");
  const [config, setConfig] = React.useState<ConfigState>({
    testMode: false,
    testIntervals: [],
    productionIntervals: [],
  });
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [subs, setSubs] = React.useState<Subscription[]>([]);

  const knownTxIdsRef = React.useRef<Set<string>>(new Set());
  const [newTxIds, setNewTxIds] = React.useState<Set<string>>(new Set());

  const fetchConfig = React.useCallback(async () => {
    try {
      const r = await api<ConfigState>("GET", "/api/config");
      setConfig(r);
    } catch (e) {
      console.error("config load failed", e);
    }
  }, []);

  const fetchStats = React.useCallback(async () => {
    try {
      const s = await api<Stats>("GET", "/api/stats");
      setStats(s);
      const incoming = s.recentTransactions.map((t) => t.id);
      const fresh = new Set<string>();
      const known = knownTxIdsRef.current;
      for (const id of incoming) {
        if (!known.has(id)) fresh.add(id);
      }
      knownTxIdsRef.current = new Set(incoming);
      setNewTxIds(fresh);
    } catch (e) {
      console.error("stats load failed", e);
    }
  }, []);

  const fetchPlans = React.useCallback(async () => {
    try {
      setPlans(await api<Plan[]>("GET", "/api/plans"));
    } catch (e) {
      console.error("plans load failed", e);
    }
  }, []);

  const fetchSubs = React.useCallback(async () => {
    try {
      setSubs(await api<Subscription[]>("GET", "/api/subscriptions"));
    } catch (e) {
      console.error("subs load failed", e);
    }
  }, []);

  const refreshAll = React.useCallback(() => {
    fetchStats();
    if (page === "products") fetchPlans();
    if (page === "subscriptions") {
      fetchPlans();
      fetchSubs();
    }
  }, [fetchStats, fetchPlans, fetchSubs, page]);

  React.useEffect(() => {
    fetchConfig();
    fetchStats();
    fetchPlans();
  }, [fetchConfig, fetchStats, fetchPlans]);

  React.useEffect(() => {
    if (page === "products") fetchPlans();
    if (page === "subscriptions") {
      fetchPlans();
      fetchSubs();
    }
  }, [page, fetchPlans, fetchSubs]);

  React.useEffect(() => {
    const interval = config.testMode ? 2000 : 10000;
    const id = window.setInterval(refreshAll, interval);
    return () => window.clearInterval(id);
  }, [config.testMode, refreshAll]);

  async function setTestMode(v: boolean) {
    try {
      const r = await api<{ testMode: boolean }>("POST", "/api/config", { testMode: v });
      setConfig((c) => ({ ...c, testMode: r.testMode }));
      toast(v ? "Test mode enabled" : "Test mode disabled", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <>
      <Sidebar
        page={page}
        onPageChange={setPage}
        testMode={config.testMode}
        onTestModeChange={setTestMode}
      />
      <TestBanner show={config.testMode} />
      <main
        className="relative z-[1] ml-[240px] flex min-h-screen flex-col bg-hero-mesh"
        style={{ paddingTop: config.testMode ? 36 : 0 }}
      >
        {page === "dashboard" && <DashboardPage stats={stats} newTxIds={newTxIds} />}
        {page === "products" && (
          <ProductsPage
            plans={plans}
            testIntervals={config.testIntervals}
            productionIntervals={config.productionIntervals}
            refresh={refreshAll}
          />
        )}
        {page === "subscriptions" && (
          <SubscriptionsPage subscriptions={subs} plans={plans} refresh={refreshAll} />
        )}
        {page === "transactions" && <TransactionsPage visible={page === "transactions"} />}
      </main>
    </>
  );
}
