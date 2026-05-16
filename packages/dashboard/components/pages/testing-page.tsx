"use client";

import * as React from "react";
import {
  FlaskConical,
  Play,
  Webhook,
  Terminal,
  Cpu,
  Zap,
  AlertOctagon,
  RotateCcw,
  Trash2,
  Send,
  ChevronRight,
  ShieldCheck,
  Gauge,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type LogLevel = "info" | "success" | "warn" | "error";
interface LogLine {
  id: number;
  ts: string;
  level: LogLevel;
  msg: string;
}

const MOCK_WALLETS = [
  { id: "w1", label: "Merchant", address: "0x8f3c…2a4c", balance: "12,480 USDC" },
  { id: "w2", label: "Customer A", address: "0x1b7d…9d0e", balance: "940 USDC" },
  { id: "w3", label: "Executor", address: "0xa39f…7f12", balance: "3.2 ETH" },
  { id: "w4", label: "Treasury", address: "0xc7e4…4e88", balance: "248,000 USDC" },
];

const NETWORKS = ["Base Sepolia", "OP Sepolia", "Arbitrum Sepolia", "Anvil (local fork)"];

const WEBHOOK_EVENTS = [
  { id: "evt_91a2", type: "subscription.charged", status: 200 },
  { id: "evt_7f0c", type: "payroll.executed", status: 200 },
  { id: "evt_3d44", type: "subscription.failed", status: 500 },
  { id: "evt_b8e1", type: "executor.reward.paid", status: 200 },
];

let logId = 0;

export function TestingPage({ testMode }: { testMode: boolean }) {
  const { toast } = useToast();
  const [network, setNetwork] = React.useState(NETWORKS[0]);
  const [wallet, setWallet] = React.useState(MOCK_WALLETS[0].id);
  const [nodeConnected, setNodeConnected] = React.useState(true);
  const [log, setLog] = React.useState<LogLine[]>([
    { id: ++logId, ts: ts(), level: "info", msg: "Sandbox initialised · forked chain ready" },
  ]);
  const logRef = React.useRef<HTMLDivElement | null>(null);

  // API playground
  const [apiMethod, setApiMethod] = React.useState("POST");
  const [apiPath, setApiPath] = React.useState("/v1/subscriptions");
  const [apiBody, setApiBody] = React.useState(
    '{\n  "planId": "plan_0x9d0e",\n  "customer": "0x1b7d…9d0e"\n}',
  );
  const [apiResp, setApiResp] = React.useState<string | null>(null);

  // webhook inspector
  const [selectedEvt, setSelectedEvt] = React.useState(WEBHOOK_EVENTS[0].id);

  function push(level: LogLevel, msg: string) {
    setLog((l) => [...l.slice(-80), { id: ++logId, ts: ts(), level, msg }]);
  }

  React.useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  function simulate(kind: string) {
    const wl = MOCK_WALLETS.find((w) => w.id === wallet)!;
    switch (kind) {
      case "subscription":
        push("info", `→ execute() subscription charge from ${wl.label}`);
        window.setTimeout(() => push("success", "✓ charge settled · 49.00 USDC · gas 84,210"), 400);
        break;
      case "payroll":
        push("info", "→ runPayroll() distributing to 8 recipients");
        window.setTimeout(() => push("success", "✓ payroll settled · 64,200 USDC · 8/8 ok"), 500);
        break;
      case "executor":
        push("info", "→ executor tick · scanning due agreements");
        window.setTimeout(() => push("success", "✓ 3 agreements executed · reward 0.42 USDC"), 450);
        break;
      case "failure":
        push("warn", "→ injecting failure: insufficient allowance");
        window.setTimeout(() => push("error", "✗ execute() reverted: ERC20InsufficientAllowance"), 380);
        break;
      case "malformed":
        push("warn", "→ posting malformed webhook payload");
        window.setTimeout(() => push("error", "✗ 422 schema validation failed: missing `txHash`"), 360);
        break;
      case "signature":
        push("info", "→ verifying EIP-712 subscription signature");
        window.setTimeout(() => push("success", "✓ signature valid · signer matches customer"), 420);
        break;
      case "gas":
        push("info", "→ estimating gas for settle()");
        window.setTimeout(() => push("success", "✓ estimate: 84,210 gas · ~$0.012 at 0.4 gwei"), 400);
        break;
      case "trace":
        push("info", "→ tracing tx 0x9d0e…4e88");
        window.setTimeout(() => {
          push("info", "  CALL PulseManager.execute(bytes32)");
          push("info", "  → CALL USDC.transferFrom() · 49000000");
          push("success", "✓ trace complete · 3 internal calls");
        }, 480);
        break;
      default:
        push("info", `→ ${kind}`);
    }
  }

  function runApi() {
    push("info", `→ ${apiMethod} ${apiPath}`);
    window.setTimeout(() => {
      const body = {
        id: "sub_0x" + Math.random().toString(16).slice(2, 10),
        object: "subscription",
        status: "active",
        planId: "plan_0x9d0e",
        nextChargeAt: Math.floor(Date.now() / 1000) + 2592000,
        createdAt: Math.floor(Date.now() / 1000),
      };
      setApiResp(JSON.stringify(body, null, 2));
      push("success", `✓ 200 OK · ${apiPath}`);
    }, 420);
  }

  function replayWebhook() {
    const evt = WEBHOOK_EVENTS.find((e) => e.id === selectedEvt)!;
    push("info", `→ replaying webhook ${evt.id} (${evt.type})`);
    window.setTimeout(
      () =>
        evt.status === 200
          ? push("success", `✓ endpoint responded 200 · ${evt.id}`)
          : push("error", `✗ endpoint responded 500 · ${evt.id} queued for retry`),
      400,
    );
  }

  const SIMULATORS = [
    { kind: "subscription", label: "Subscription execution", Icon: Play, tone: "brand" },
    { kind: "payroll", label: "Payroll execution", Icon: Send, tone: "brand" },
    { kind: "executor", label: "Executor tick", Icon: Cpu, tone: "brand" },
    { kind: "gas", label: "Gas estimator", Icon: Gauge, tone: "neutral" },
    { kind: "signature", label: "Signature verification", Icon: ShieldCheck, tone: "neutral" },
    { kind: "trace", label: "Transaction trace", Icon: Terminal, tone: "neutral" },
    { kind: "failure", label: "Failure injection", Icon: AlertOctagon, tone: "danger" },
    { kind: "malformed", label: "Malformed payload", Icon: AlertOctagon, tone: "danger" },
  ];

  return (
    <section className="animate-page-in mx-auto w-full max-w-[1180px] px-8 pb-20 pt-9 lg:px-12">
      <PageHeader
        title="Testing Suite"
        subtitle="A full developer sandbox for Pulse integrations — simulate, inspect, replay"
        action={
          <Badge variant={testMode ? "active" : "inactive"}>
            {testMode ? "test mode on" : "test mode off"}
          </Badge>
        }
      />

      {/* environment bar */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Network
            </span>
            <Select
              value={network}
              onChange={(e) => {
                setNetwork(e.target.value);
                push("info", `switched network → ${e.target.value}`);
              }}
              className="h-9 w-52"
            >
              {NETWORKS.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Mock wallet
            </span>
            <Select
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              className="h-9 w-56"
            >
              {MOCK_WALLETS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label} — {w.address} · {w.balance}
                </option>
              ))}
            </Select>
          </div>
          <button
            onClick={() => {
              setNodeConnected((c) => !c);
              push(
                nodeConnected ? "warn" : "success",
                nodeConnected ? "local node disconnected" : "local node connected · http://127.0.0.1:8545",
              );
            }}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-[12.5px] font-medium"
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                nodeConnected ? "bg-emerald-500" : "bg-rose-500",
              )}
            />
            {nodeConnected ? "Local node connected" : "Local node offline"}
          </button>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
        {/* left column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Simulators</CardTitle>
              <span className="text-[12px] text-muted-foreground">
                executor &amp; failure scenarios
              </span>
            </CardHeader>
            <div className="grid grid-cols-2 gap-2.5 p-4">
              {SIMULATORS.map((s) => (
                <button
                  key={s.kind}
                  onClick={() => simulate(s.kind)}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 text-left transition-all duration-200 ease-spring hover:-translate-y-0.5 hover:shadow-soft",
                    s.tone === "danger"
                      ? "border-rose-200 hover:border-rose-400 dark:border-rose-500/30"
                      : "border-border hover:border-brand-300",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg",
                      s.tone === "danger"
                        ? "bg-rose-500/12 text-rose-600 dark:text-rose-400"
                        : s.tone === "brand"
                        ? "bg-brand-500/12 text-brand-600 dark:text-brand-300"
                        : "bg-secondary text-foreground",
                    )}
                  >
                    <s.Icon className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                  <span className="text-[12px] font-semibold text-foreground">
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contract interaction</CardTitle>
            </CardHeader>
            <div className="space-y-3 p-4">
              <div>
                <Label>Function</Label>
                <Select className="h-9">
                  <option>execute(bytes32 agreementId)</option>
                  <option>subscribe(bytes32 planId, uint256 cap)</option>
                  <option>createPlan(uint256 price, uint256 period)</option>
                  <option>runPayroll(bytes32 runId)</option>
                  <option>cancel(bytes32 agreementId)</option>
                </Select>
              </div>
              <div>
                <Label>Argument</Label>
                <Input
                  defaultValue="0x9d0e4e88a2b3c4d5e6f7a8b9c0d1e2f3"
                  className="h-9 font-mono text-xs"
                />
              </div>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => simulate("trace")}
              >
                <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
                Call &amp; trace
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhook inspector &amp; replay</CardTitle>
            </CardHeader>
            <div className="p-2">
              {WEBHOOK_EVENTS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedEvt(e.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                    selectedEvt === e.id ? "bg-accent" : "hover:bg-accent/60",
                  )}
                >
                  <Webhook className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono text-[11.5px] text-muted-foreground">
                    {e.id}
                  </span>
                  <span className="text-[12.5px] text-foreground">{e.type}</span>
                  <Badge
                    variant={e.status === 200 ? "success" : "failed"}
                    className="ml-auto"
                  >
                    {e.status}
                  </Badge>
                </button>
              ))}
              <div className="p-2">
                <Button size="sm" variant="outline" onClick={replayWebhook}>
                  <RotateCcw className="h-3 w-3" />
                  Replay selected event
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API request playground</CardTitle>
            </CardHeader>
            <div className="space-y-3 p-4">
              <div className="flex gap-2">
                <Select
                  value={apiMethod}
                  onChange={(e) => setApiMethod(e.target.value)}
                  className="h-9 w-28"
                >
                  <option>GET</option>
                  <option>POST</option>
                  <option>DELETE</option>
                </Select>
                <Input
                  value={apiPath}
                  onChange={(e) => setApiPath(e.target.value)}
                  className="h-9 font-mono text-xs"
                />
                <Button size="default" className="h-9" onClick={runApi}>
                  <Send className="h-3.5 w-3.5" />
                  Send
                </Button>
              </div>
              <textarea
                value={apiBody}
                onChange={(e) => setApiBody(e.target.value)}
                spellCheck={false}
                rows={4}
                className="w-full rounded-lg border border-border bg-secondary/40 p-3 font-mono text-[11.5px] text-foreground outline-none focus-visible:border-brand-500 focus-visible:ring-4 focus-visible:ring-brand-500/15"
              />
              {apiResp && (
                <div className="rounded-lg border border-border bg-[#0b1020]">
                  <div className="flex items-center gap-2 border-b border-white/8 px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="font-mono text-[10.5px] text-white/50">
                      200 OK · 412ms
                    </span>
                  </div>
                  <pre className="code-shell overflow-x-auto p-3 text-emerald-300">
                    {apiResp}
                  </pre>
                </div>
              )}
            </div>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Event log viewer</CardTitle>
              <button
                onClick={() => setLog([])}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </button>
            </CardHeader>
            <div
              ref={logRef}
              className="scrollbar-thin h-[280px] overflow-y-auto bg-[#0b1020] p-3 font-mono text-[11.5px] leading-relaxed"
            >
              {log.length === 0 ? (
                <div className="flex h-full items-center justify-center text-white/30">
                  Run a simulator to stream events…
                </div>
              ) : (
                log.map((l) => (
                  <div key={l.id} className="flex gap-2 animate-ticker-up">
                    <span className="text-white/25">{l.ts}</span>
                    <span
                      className={cn(
                        "uppercase",
                        l.level === "success" && "text-emerald-400",
                        l.level === "info" && "text-sky-400",
                        l.level === "warn" && "text-amber-400",
                        l.level === "error" && "text-rose-400",
                      )}
                    >
                      {l.level}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap text-white/80">
                      {l.msg}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscription state simulator</CardTitle>
            </CardHeader>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { label: "created", on: true },
                  { label: "active", on: true },
                  { label: "charging", on: true },
                  { label: "past_due", on: false },
                  { label: "retrying", on: false },
                  { label: "cancelled", on: false },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11.5px] font-medium",
                      s.on
                        ? "border-brand-300 bg-brand-500/8 text-foreground"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        s.on ? "bg-brand-500" : "bg-muted-foreground/40",
                      )}
                    />
                    {s.label}
                  </div>
                ))}
              </div>
              <button
                onClick={() => simulate("subscription")}
                className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-600 hover:underline dark:text-brand-300"
              >
                Advance state machine
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </Card>
        </div>
      </div>

      <p className="mt-6 flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <FlaskConical className="h-3.5 w-3.5" />
        Everything here runs against a forked chain — no mainnet funds are ever
        touched.
      </p>
    </section>
  );
}

function ts() {
  return new Date().toLocaleTimeString([], {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
