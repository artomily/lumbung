import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runTick } from "@/agent/tick";

// ── POST /api/agent/tick ──────────────────────────────────────────────────────
// Authorization: Bearer ${CRON_SECRET}
export async function POST(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization");

  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "CRON_SECRET not configured" } },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid or missing cron secret" } },
      { status: 401 },
    );
  }

  try {
    const result = await runTick();
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/agent/tick] Tick failed:", err);
    return NextResponse.json({ error: { code: "INTERNAL", message: msg } }, { status: 500 });
  }
}
