"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { usePulseActions } from "@/lib/wallet-actions";
import type { IntervalDef } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  testIntervals: IntervalDef[];
  productionIntervals: IntervalDef[];
  onCreated: () => void;
}

export function CreatePlanDialog({
  open,
  onOpenChange,
  testIntervals,
  productionIntervals,
  onCreated,
}: Props) {
  const { toast } = useToast();
  const actions = usePulseActions();
  const [name, setName] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [feeBps, setFeeBps] = React.useState("100");
  const [interval, setIntervalVal] = React.useState("");
  const [cancelAfter, setCancelAfter] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName("");
      setDesc("");
      setPrice("");
      setFeeBps("100");
      setCancelAfter("");
      setIntervalVal("");
    }
  }, [open]);

  async function handleSubmit() {
    if (!name.trim()) return toast("Name is required", "error");
    const priceNum = parseFloat(price);
    if (!priceNum || priceNum <= 0) return toast("Price must be greater than 0", "error");
    const intervalSeconds = parseInt(interval, 10);
    if (!intervalSeconds) return toast("Please select a billing interval", "error");

    const all = [...testIntervals, ...productionIntervals];
    const intervalLabel = all.find((i) => i.seconds === intervalSeconds)?.label ?? `${intervalSeconds}s`;
    const cancelAfterCharges = cancelAfter.trim() ? parseInt(cancelAfter, 10) : null;

    setSubmitting(true);
    try {
      toast("Confirm in your wallet…", "success");
      const { planId } = await actions.createPlan({
        priceUsdc: priceNum,
        periodSeconds: intervalSeconds,
        feeBps: parseInt(feeBps, 10),
      });
      // Persist off-chain metadata (name, description, interval label, cancel-after)
      // so the UI can show "Pro Plan" instead of "Plan 0x12345…".
      await api("POST", "/api/plans", {
        planId,
        name: name.trim(),
        description: desc.trim(),
        intervalLabel,
        intervalSeconds,
        cancelAfterCharges,
      });
      toast(`Product "${name.trim()}" created`, "success");
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
        <DialogHeader title="Create Product" onClose={() => onOpenChange(false)} />
        <DialogBody className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pro Plan" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Full access to all features"
            />
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <Label>Price (USDC)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="9.99"
              />
            </div>
            <div>
              <Label>Fee (basis points)</Label>
              <Input
                type="number"
                min="0"
                max="10000"
                value={feeBps}
                onChange={(e) => setFeeBps(e.target.value)}
              />
              <div className="mt-1 text-[11.5px] text-slate-500">100 bps = 1%</div>
            </div>
          </div>
          <div>
            <Label>Billing Interval</Label>
            <Select value={interval} onChange={(e) => setIntervalVal(e.target.value)}>
              <option value="">Select an interval…</option>
              <optgroup label="— Test Intervals —">
                {testIntervals.map((iv) => (
                  <option key={iv.seconds} value={iv.seconds}>
                    {iv.label} ⚡ test
                  </option>
                ))}
              </optgroup>
              <optgroup label="— Production Intervals —">
                {productionIntervals.map((iv) => (
                  <option key={iv.seconds} value={iv.seconds}>
                    {iv.label}
                  </option>
                ))}
              </optgroup>
            </Select>
          </div>
          <div>
            <Label>Auto-cancel after charges (optional)</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={cancelAfter}
              onChange={(e) => setCancelAfter(e.target.value)}
              placeholder="Leave blank for unlimited"
            />
            <div className="mt-1 text-[11.5px] text-slate-500">
              e.g. 12 to auto-cancel after 12 charges (1 year monthly)
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !actions.account.address}>
            {submitting ? "Confirming…" : actions.account.address ? "Create Product" : "Connect wallet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
