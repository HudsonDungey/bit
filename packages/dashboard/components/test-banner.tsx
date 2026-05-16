import { Zap } from "lucide-react";

export function TestBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      className="fixed top-0 left-[248px] right-0 z-[95] animate-slide-down border-b border-amber-400/35 px-6 py-2 text-center text-xs font-semibold tracking-wide text-amber-900 backdrop-blur dark:text-amber-200"
      style={{
        background:
          "linear-gradient(90deg, rgba(245,166,35,0.10), rgba(245,166,35,0.18), rgba(245,166,35,0.10))",
      }}
    >
      <Zap className="mr-1 inline h-3 w-3" />
      Test mode active — scheduler runs at accelerated intervals
    </div>
  );
}
