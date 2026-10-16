import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    network: env.ARC_NETWORK,
    vaultAddress: env.LUMBUNG_VAULT_ADDRESS ?? null,
  });
}
