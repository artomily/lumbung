import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { owatchSnapshots } from "@/lib/db/schema";
import { verifyHmacSignature } from "@/lib/hmac";

// ── Input schema ──────────────────────────────────────────────────────────────
const SnapshotBodySchema = z.object({
  pointsOutstanding: z.string().regex(/^\d+$/).transform((v) => BigInt(v)),
  microUsdcPerPoint: z.string().regex(/^\d+$/).transform((v) => BigInt(v)),
  activeUsers7d: z.number().int().nonnegative().optional(),
  asOf: z.string().datetime(),
});

// ── POST /api/owatch/snapshot ─────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const timestamp = req.headers.get("x-lumbung-timestamp");
  const signature = req.headers.get("x-lumbung-signature");

  const hmacResult = verifyHmacSignature({
    timestamp,
    signature,
    rawPayload: rawBody,
  });

  if (!hmacResult.valid) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: hmacResult.error ?? "Invalid signature" } },
      { status: 401 },
    );
  }

  let parsed: z.infer<typeof SnapshotBodySchema>;
  try {
    parsed = SnapshotBodySchema.parse(JSON.parse(rawBody));
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.errors[0]?.message : "Validation error";
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: msg } }, { status: 422 });
  }

  await db.insert(owatchSnapshots).values({
    pointsOutstanding: parsed.pointsOutstanding,
    microUsdcPerPoint: parsed.microUsdcPerPoint,
    activeUsers7d: parsed.activeUsers7d ?? null,
    asOf: new Date(parsed.asOf),
  });

  return NextResponse.json({ ok: true });
}
