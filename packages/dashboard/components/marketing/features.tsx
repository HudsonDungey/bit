import * as React from "react";
import {
  Repeat,
  Wallet,
  Network,
  Code2,
  BarChart3,
  Layers,
  Coins,
  Webhook,
} from "lucide-react";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";
import { cn } from "@/lib/utils";

interface Feature {
  icon: React.ElementType;
  title: string;
  body: string;
  span?: boolean;
  accent?: string;
}

const FEATURES: Feature[] = [
  {
    icon: Repeat,
    title: "Recurring subscriptions",
    body: "Monthly, yearly, or custom intervals. Customers approve once — executors handle every charge after that.",
    span: true,
    accent: "from-brand-500/14",
  },
  {
    icon: Wallet,
    title: "Automated payroll",
    body: "Store recipients onchain, schedule runs, and pay contractors and employees in stablecoins on autopilot.",
    accent: "from-electric-500/14",
  },
  {
    icon: Network,
    title: "Executor network",
    body: "A permissionless network of executors triggers settlement and earns rewards. No cron jobs to babysit.",
    accent: "from-emerald-500/14",
  },
  {
    icon: Code2,
    title: "Developer SDKs",
    body: "Typed SDKs for TypeScript, React, and Solidity. Integrate billing in an afternoon.",
    accent: "from-amber-500/14",
  },
  {
    icon: BarChart3,
    title: "Real-time analytics",
    body: "MRR, churn, payroll volume, failed settlements, and protocol fees — streamed live to your dashboard.",
    span: true,
    accent: "from-brand-500/14",
  },
  {
    icon: Layers,
    title: "Multi-chain",
    body: "Deploy once, settle across every major EVM chain from a single integration.",
    accent: "from-electric-500/14",
  },
  {
    icon: Coins,
    title: "Stablecoin payments",
    body: "Native USDC and stablecoin support with transparent, onchain-verifiable settlement.",
    accent: "from-emerald-500/14",
  },
  {
    icon: Webhook,
    title: "Programmable billing",
    body: "Webhooks, spend caps, auto-cancel rules, and metered usage — billing logic that lives in code.",
    accent: "from-amber-500/14",
  },
];

export function Features() {
  return (
    <section id="features" className="relative scroll-mt-24 py-24 sm:py-32">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <SectionHeading
          eyebrow="Platform"
          title={
            <>
              Everything you need to bill{" "}
              <span className="text-gradient">onchain</span>
            </>
          }
          description="One programmable platform for subscriptions, payroll, and settlement — built for engineers who want billing to disappear into their stack."
        />

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal
              key={f.title}
              delay={(i % 3) * 80}
              className={cn(f.span && "lg:col-span-1", "h-full")}
            >
              <article className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-soft transition-all duration-300 ease-spring hover:-translate-y-1 hover:border-brand-300 hover:shadow-lift">
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                    f.accent,
                  )}
                />
                <div className="relative">
                  <span className="inline-grid h-11 w-11 place-items-center rounded-xl border border-border bg-secondary/70 text-brand-600 transition-colors group-hover:border-brand-300 group-hover:bg-brand-500/10 dark:text-brand-300">
                    <f.icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <h3 className="mt-4 font-display text-[17px] font-bold tracking-tight text-foreground">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                    {f.body}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
