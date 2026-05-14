import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/// Cancellation must be signed by the connected wallet (customer OR merchant).
/// The dashboard now calls `manager.cancel(subId)` directly via wagmi.
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Cancellation must be signed by the connected wallet (customer or merchant). " +
        "Use the dashboard's cancel button (wagmi useWriteContract).",
    },
    { status: 410 },
  );
}
