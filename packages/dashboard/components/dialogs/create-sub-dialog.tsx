"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { fmt$ } from "@/lib/format";
import type { Plan } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  plans: Plan[];
  onCreated: () => void;
}

export function CreateSubDialog({ open, onOpenChange, plans, onCreated }: Props) {
  const { toast } = useToast();
  const activePlans = plans.filter((p) => p.active);
  const [customer, setCustomer] = React.useState("");
  const [planId, setPlanId] = React.useState("");
  const [spendCap, setSpendCap] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setCustomer("");
      setSpendCap("");
      setPlanId(activePlans[0]?.id ?? "");
    }
  }, [open, activePlans]);

  async function handleSubmit() {
    if (!customer.trim()) return toast("Customer address is required", "error");
    if (!planId) return toast("Please select a plan", "error");

    setSubmitting(true);
    try {
      await api("POST", "/api/subscriptions", {
        customer: customer.trim(),
        planId,
        spendCap: spendCap.trim() ? parseFloat(spendCap) : null,
      });
      toast("Subscription created", "success");
      onCreated();
      onOpenChange(false);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader title="Create Subscription" onClose={() => onOpenChange(false)} />
        <DialogBody className="space-y-4">
          <div>
            <Label>Customer address</Label>
            <Input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="0x…"
              className="font-mono text-[12.5px]"
            />
            <div className="mt-1 text-[11.5px] text-slate-500">Wallet address of the subscriber</div>
          </div>
          <div>
            <Label>Product</Label>
            <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {activePlans.length === 0 && <option value="">No active plans</option>}
              {activePlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {fmt$(p.price)} / {p.intervalLabel}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Spend cap (USDC, optional)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={spendCap}
              onChange={(e) => setSpendCap(e.target.value)}
              placeholder="Leave blank for unlimited"
            />
            <div className="mt-1 text-[11.5px] text-slate-500">
              Subscription auto-completes when total paid reaches this limit
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || activePlans.length === 0}>
            {submitting ? "Subscribing…" : "Subscribe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
