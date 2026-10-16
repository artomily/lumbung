import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { redeemRequests, decisions, decisionEvents } from "@/lib/db/schema";
import { verifyHmacSignature } from "@/lib/hmac";
import { repollDecision } from "@/agent/execute";
import { env } from "@/lib/env";

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
  if (action === "ESCALATE" && (latestStatus === "OWNER_APPROVED" || latestStatus === "CONFIRMED")) return "PAID";
  if (action === "ESCALATE" && latestStatus === "OWNER_REJECTED") return "REJECTED";
  if (action === "HOLD" && latestStatus === "HELD") return "HELD";
  if (action === "REJECT" && latestStatus === "REJECTED") return "REJECTED";
  return "PENDING";
}

// ── GET /api/owatch/redeem/[id] ───────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id: redeemId } = await params;

  // HMAC verification: sign timestamp + "." + redeemId
  const timestamp = req.headers.get("x-lumbung-timestamp");
  const signature = req.headers.get("x-lumbung-signature");

  const hmacResult = verifyHmacSignature({
    timestamp,
    signature,
    rawPayload: redeemId,
  });

  if (!hmacResult.valid) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: hmacResult.error ?? "Invalid signature" } },
      { status: 401 },
    );
  }

  // Look up the redeem request
  const [req_] = await db
    .select()
    .from(redeemRequests)
    .where(eq(redeemRequests.redeemId, redeemId))
    .limit(1);

  if (!req_) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Redeem request not found" } }, { status: 404 });
  }

  // Find latest decision for this request
  const [decision] = await db
    .select()
    .from(decisions)
    .where(eq(decisions.subjectId, req_.id))
    .orderBy(desc(decisions.createdAt))
    .limit(1);

  if (!decision) {
    return NextResponse.json({
      redeemId,
      status: "PENDING",
      decisionId: null,
      reason: null,
      txHash: null,
      explorerUrl: null,
      updatedAt: req_.createdAt.toISOString(),
    });
  }

  // Get latest event; re-poll if SUBMITTED or SUBMIT_UNKNOWN
  const events = await db
    .select()
    .from(decisionEvents)
    .where(eq(decisionEvents.decisionId, decision.id))
    .orderBy(decisionEvents.id);
  const latestEvent = events[events.length - 1];

  // Re-poll Circle if still SUBMITTED or SUBMIT_UNKNOWN
  if (
    (latestEvent?.status === "SUBMITTED" && latestEvent.circleTxId) ||
    latestEvent?.status === "SUBMIT_UNKNOWN"
  ) {
    try {
      await repollDecision(decision.id);
      // Refetch after repoll
      const refreshedEvents = await db
        .select()
        .from(decisionEvents)
        .where(eq(decisionEvents.decisionId, decision.id))
        .orderBy(decisionEvents.id);
      const refreshedEvent = refreshedEvents[refreshedEvents.length - 1];
      if (refreshedEvent) {
        const status = mapStatusToOwatch(decision.action, refreshedEvent.status);
        const txHash = refreshedEvent.txHash ?? null;
        return NextResponse.json({
          redeemId,
          status,
          decisionId: decision.id,
          reason: decision.reasoning,
          txHash,
          explorerUrl: txHash ? `${env.NEXT_PUBLIC_ARC_EXPLORER}/tx/${txHash}` : null,
          updatedAt: refreshedEvent.createdAt.toISOString(),
        });
      }
    } catch (err) {
      console.warn("[api/owatch/redeem/[id]] repollDecision failed:", err);
    }
  }

  const status = mapStatusToOwatch(decision.action, latestEvent?.status);
  const txHash = latestEvent?.txHash ?? null;

  return NextResponse.json({
    redeemId,
    status,
    decisionId: decision.id,
    reason: decision.reasoning,
    txHash,
    explorerUrl: txHash ? `${env.NEXT_PUBLIC_ARC_EXPLORER}/tx/${txHash}` : null,
    updatedAt: (latestEvent?.createdAt ?? decision.createdAt).toISOString(),
  });
}
