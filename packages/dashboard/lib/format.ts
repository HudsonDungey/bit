export function fmt$(n: number): string {
  return "$" + Number(n).toFixed(2);
}

export function fmtAddr(a?: string): string {
  if (!a) return "—";
  if (a.length > 18) return a.slice(0, 8) + "…" + a.slice(-6);
  return a;
}

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) +
    " " +
    d.toLocaleDateString([], { month: "short", day: "numeric" })
  );
}

export function fmtNextCharge(unixSec: number): { text: string; soon: boolean } {
  const diff = Math.round(unixSec - Date.now() / 1000);
  if (diff <= 0) return { text: "now", soon: true };
  if (diff < 60) return { text: `in ${diff}s`, soon: false };
  if (diff < 3600) return { text: `in ${Math.round(diff / 60)}m`, soon: false };
  if (diff < 86400) return { text: `in ${Math.round(diff / 3600)}h`, soon: false };
  return { text: `in ${Math.round(diff / 86400)}d`, soon: false };
}
