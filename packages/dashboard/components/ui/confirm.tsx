"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from "./dialog";
import { Button } from "./button";

interface ConfirmOptions {
  title: string;
  description: string;
  okLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<{
    open: boolean;
    opts: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirm = React.useCallback<ConfirmContextValue["confirm"]>((opts) => {
    return new Promise<boolean>((resolve) => {
      setState({ open: true, opts, resolve });
    });
  }, []);

  function close(v: boolean) {
    state?.resolve(v);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={!!state?.open} onOpenChange={(o) => !o && close(false)}>
        <DialogContent className="w-[400px]">
          <DialogHeader title={state?.opts.title || "Are you sure?"} onClose={() => close(false)} />
          <DialogBody>
            <p className="text-sm leading-relaxed text-slate-700">
              {state?.opts.description}
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => close(false)}>
              {state?.opts.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              variant={state?.opts.danger ? "danger" : "default"}
              onClick={() => close(true)}
            >
              {state?.opts.okLabel ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
