"use client";

import * as React from "react";

interface Props {
  value: number;
  format?: "money" | "int";
  duration?: number;
  className?: string;
}

export function AnimatedNumber({ value, format = "money", duration = 600, className }: Props) {
  const [display, setDisplay] = React.useState(value);
  const fromRef = React.useRef(value);

  React.useEffect(() => {
    const start = fromRef.current;
    if (start === value) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = start + (value - start) * eased;
      setDisplay(v);
      if (t < 1) raf = requestAnimationFrame(step);
      else {
        setDisplay(value);
        fromRef.current = value;
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const text = format === "money" ? "$" + Number(display).toFixed(2) : String(Math.round(display));
  return <span className={className}>{text}</span>;
}
