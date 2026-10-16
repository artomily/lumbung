import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { redeemRequests, decisions, decisionEvents } from "@/lib/db/schema";
import { verifyHmacSignature } from "@/lib/hmac";
import { decideRedeem } from "@/agent/decide";
import { env } from "@/lib/env";

// ── Input schema ──────────────────────────────────────────────────────────────
const RedeemBodySchema = z.object({
  redeemId: z.string().min(1),
  userId: z.string().min(1),
  wallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  points: z.string().regex(/^\d+$/).transform((v) => BigInt(v)),
  amountMicro: z.string().regex(/^\d+$/).transform((v) => BigInt(v)),
  user: z
    .object({
      accountCreatedAt: z.string().optional(),
      pointsEarned7d: z
        .string()
        .regex(/^\d+$/)
        .transform((v) => BigInt(v))
        .optional(),
    })
    .optional(),
  source: z.enum(["owatch", "simulator"]).default("owatch"),
});

type RedeemBody = z.infer<typeof RedeemBodySchema>;

// ── Status mapper (06-DATA-MODEL.md mapping table) ───────────────────────────
function mapStatusToOwatch(
  action: string,
  latestStatus: string | undefined,
): "PENDING" | "PAID" | "HELD" | "AWAITING_OWNER" | "REJECTED" | "FAILED" {
  if (
    !latestStatus ||
    latestStatus === "PROPOSED" ||
    latestStatus === "SUBMITTED" ||
    latestStatus === "SUBMIT_UNKNOWN"
  ) {
    return "PENDING";
  }
  if (action === "PAY" && latestStatus === "CONFIRMED") return "PAID";
  if (action === "PAY" && latestStatus === "FAILED") return "FAILED";
  if (action === "ESCALATE" && latestStatus === "AWAITING_OWNER") return "AWAITING_OWNER";
  if (action === "ESCALATE" && (latestEventStatusIsApproved(latestStatus))) return "PAID";
  if (action === "ESCALATE" && latestStatus === "OWNER_REJECTED") return "REJECTED";
  if (action === "HOLD" && latestStatus === "HELD") return "HELD";
  if (action === "REJECT" && latestStatus === "REJECTED") return "REJECTED";
  return "PENDING";
}

function latestEventStatusIsApproved(status: string): boolean {
  return status === "OWNER_APPROVED" || status === "CONFIRMED";
}

async function buildDecisionResponse(redeemId: string) {
  // Get the redeem request
  const [req] = await db
    .select()
    .from(redeemRequests)
    .where(eq(redeemRequests.redeemId, redeemId))
    .limit(1);
  if (!req) return null;

  // Get latest decision for this request
  const [decision] = await db
    .select()
    .from(decisions)
    .where(and(eq(decisions.subjectId, req.id), eq(decisions.subjectType, "redeem")))
    .orderBy(desc(decisions.createdAt))
    .limit(1);

  if (!decision) {
    return {
      redeemId,
      status: "PENDING" as const,
      decisionId: null,
      reason: null,
      txHash: null,
      explorerUrl: null,
      updatedAt: req.createdAt.toISOString(),
    };
  }

  // Get latest event
  const events = await db
    .select()
    .from(decisionEvents)
    .where(eq(decisionEvents.decisionId, decision.id))
    .orderBy(decisionEvents.id);
  const latestEvent = events[events.length - 1];

  const status = mapStatusToOwatch(decision.action, latestEvent?.status);
  const txHash = latestEvent?.txHash ?? null;

  return {
    redeemId,
    status,
    decisionId: decision.id,
    reason: decision.reasoning,
    txHash,
    explorerUrl: txHash ? `${env.NEXT_PUBLIC_ARC_EXPLORER}/tx/${txHash}` : null,
    updatedAt: (latestEvent?.createdAt ?? decision.createdAt).toISOString(),
  };
}

// ── POST /api/owatch/redeem ───────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Read raw body for HMAC verification
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

  // Parse and validate body
  let parsed: RedeemBody;
  try {
    parsed = RedeemBodySchema.parse(JSON.parse(rawBody));
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.errors[0]?.message : "Validation error";
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: msg } }, { status: 422 });
  }

  // Idempotency layer 1: check for existing request by redeemId
  const [existing] = await db
    .select()
    .from(redeemRequests)
    .where(eq(redeemRequests.redeemId, parsed.redeemId))
    .limit(1);

  if (existing) {
    // Replay: return current decision status
    const response = await buildDecisionResponse(parsed.redeemId);
    return NextResponse.json(response, { status: 200 });
  }

  // Insert the new redeem request
  let inserted: { id: string } | undefined;
  try {
    const [row] = await db
      .insert(redeemRequests)
      .values({
        redeemId: parsed.redeemId,
        userId: parsed.userId,
        wallet: parsed.wallet.toLowerCase(),
        points: parsed.points,
        amountMicro: parsed.amountMicro,
        accountCreatedAt: parsed.user?.accountCreatedAt ? new Date(parsed.user.accountCreatedAt) : null,
        pointsEarned7d: parsed.user?.pointsEarned7d ?? null,
        source: parsed.source,
        raw: JSON.parse(rawBody) as Record<string, unknown>,
      })
      .returning({ id: redeemRequests.id });
    inserted = row;
  } catch (err: unknown) {
    const pgCode = (err as { code?: string })?.code;
    const msg = err instanceof Error ? err.message : String(err);
    if (pgCode === "23505" || msg.includes("unique") || msg.includes("duplicate key")) {
      const replay = await buildDecisionResponse(parsed.redeemId);
      if (replay) {
        return NextResponse.json(replay, { status: 200 });
      }
      return NextResponse.json(
        {
          decisionId: null,
          status: "PENDING",
          redeemId: parsed.redeemId,
        },
        { status: 200 },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL", message: `Failed to insert redeem request: ${msg}` } },
      { status: 500 },
    );
  }

  if (!inserted) {
    return NextResponse.json({ error: { code: "INTERNAL", message: "Failed to insert redeem request" } }, { status: 500 });
  }

  const redeemRequestId = inserted.id;

  // Immediately generate a decision ID for the response
  // The actual decision runs in background via after()
  after(async () => {
    try {
      await decideRedeem(redeemRequestId);
    } catch (err) {
      console.error("[api/owatch/redeem] Background decideRedeem failed:", err);
    }
  });

  return NextResponse.json(
    {
      decisionId: null, // not yet assigned; poll GET for status
      status: "PENDING",
      redeemId: parsed.redeemId,
    },
    { status: 202 },
  );
}
