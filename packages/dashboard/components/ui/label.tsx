import * as React from "react";
import { cn } from "@/lib/utils";

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("block text-xs font-semibold text-foreground mb-1.5 tracking-[0.01em]", className)}
      {...props}
    />
  ),
);
Label.displayName = "Label";

export { Label };
