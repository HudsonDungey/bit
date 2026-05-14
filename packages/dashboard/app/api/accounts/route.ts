import { NextResponse } from "next/server";
import { accounts, publicClient, USDC_ADDRESS, erc20Abi, usdcDisplay } from "@/lib/chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const enriched = await Promise.all(
    accounts.map(async (a) => {
      const [eth, usdc] = await Promise.all([
        publicClient.getBalance({ address: a.address }),
        publicClient.readContract({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [a.address],
        }) as Promise<bigint>,
      ]);
      return {
        name: a.name,
        address: a.address,
        ethBalance: Number(eth) / 1e18,
        usdcBalance: usdcDisplay(usdc),
      };
    }),
  );
  return NextResponse.json(enriched);
}
