"use client";

import * as React from "react";
import { Wallet, Users, CalendarClock, Construction } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";

export function PayrollPage(_props: { testMode: boolean }) {
  return (
    <section className="animate-page-in mx-auto w-full max-w-[1180px] px-8 pb-20 pt-9 lg:px-12">
      <PageHeader
        title="Payroll"
        subtitle="Recurring onchain distributions to recipient registries"
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Payroll Volume"
          value={0}
          format="money"
          sub="no payroll contract deployed"
          icon={<Wallet className="h-3 w-3" strokeWidth={2.5} />}
        />
        <StatCard
          label="Stored Recipients"
          value={0}
          format="int"
          sub="awaiting payroll registry"
          icon={<Users className="h-3 w-3" strokeWidth={2.5} />}
        />
        <StatCard
          label="Active Schedules"
          value={0}
          format="int"
          sub="awaiting payroll registry"
          icon={<CalendarClock className="h-3 w-3" strokeWidth={2.5} />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll module</CardTitle>
        </CardHeader>
        <EmptyState
          Icon={Construction}
          title="Payroll is not yet wired to chain"
          description="Subscriptions on the Pulse manager are live, but the payroll contract and registry haven't been deployed yet. This page will populate once they are."
        />
      </Card>
    </section>
  );
}
