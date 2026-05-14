import * as React from "react";

interface Props {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: Props) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div>
        <h2 className="font-display text-[26px] font-bold leading-tight tracking-tight text-foreground">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-[13.5px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11.5px] font-medium text-muted-foreground shadow-soft">
      <span className="relative inline-block h-2 w-2 rounded-full bg-emerald-500">
        <span className="absolute -inset-0.5 animate-live-ping rounded-full bg-emerald-500 opacity-40" />
      </span>
      Live
    </span>
  );
}
