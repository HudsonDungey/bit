import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/// Server-side deactivation isn't supported on Sepolia — the merchant must sign
/// `manager.deactivatePlan(planId)` from the connected wallet. Kept as a 410 to
/// make the old client behavior fail loudly until callers are migrated.
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Plan deactivation must be signed by the connected merchant wallet. " +
        "Use the dashboard's deactivate button (wagmi useWriteContract).",
    },
    { status: 410 },
  );
}
