import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { type Hex, parseEventLogs } from "viem";
import { db } from "@/lib/db/client";
import { decisions, decisionEvents } from "@/lib/db/schema";
import { arcClient } from "@/lib/arc";
import { LumbungVaultAbi } from "@/lib/abi/LumbungVault";
import { env } from "@/lib/env";

const ConfirmBodySchema = z.object({
  decisionId: z.string().uuid(),
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
});

// ── POST /api/approvals/confirm ───────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!env.LUMBUNG_VAULT_ADDRESS) {
    return NextResponse.json(
      { error: { code: "NOT_CONFIGURED", message: "LUMBUNG_VAULT_ADDRESS is not configured" } },
      { status: 503 },
    );
  }

  let parsed: z.infer<typeof ConfirmBodySchema>;
  try {
    parsed = ConfirmBodySchema.parse(await req.json());
  } catch (err) {
    const msg = err instanceof z.ZodError ? err.errors[0]?.message : "Validation error";
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: msg } }, { status: 422 });
  }

  const { decisionId, txHash } = parsed;

  // Load decision
  const [decision] = await db.select().from(decisions).where(eq(decisions.id, decisionId)).limit(1);

  if (!decision) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Decision not found" } }, { status: 404 });
  }

  if (decision.action !== "ESCALATE") {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Decision action is not ESCALATE" } },
      { status: 422 },
    );
  }

  // Check for idempotency: already resolved?
  const events = await db
    .select()
    .from(decisionEvents)
    .where(eq(decisionEvents.decisionId, decisionId))
    .orderBy(decisionEvents.id);
  const latestEvent = events[events.length - 1];

  if (
    latestEvent?.status === "OWNER_APPROVED" ||
    latestEvent?.status === "OWNER_REJECTED" ||
    latestEvent?.status === "CONFIRMED"
  ) {
    return NextResponse.json({ ok: true, status: latestEvent.status, idempotent: true });
  }

  const vaultAddress = env.LUMBUNG_VAULT_ADDRESS.toLowerCase();

  // Verify the tx via viem
  let approved: boolean;
  try {
    const receipt = await arcClient.getTransactionReceipt({ hash: txHash as Hex });

    if (!receipt || receipt.status === "reverted") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Transaction reverted or not found" } },
        { status: 422 },
      );
    }

    // Verify tx was sent to the vault
    if (!receipt.to || receipt.to.toLowerCase() !== vaultAddress) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Transaction was not sent to the vault" } },
        { status: 422 },
      );
    }

    // Parse ApprovalResolved event
    const logs = parseEventLogs({
      abi: LumbungVaultAbi,
      logs: receipt.logs,
      eventName: "ApprovalResolved",
    });

    const matchingLog = logs.find(
      (log) =>
        log.address?.toLowerCase() === vaultAddress &&
        log.args.decisionKey?.toLowerCase() === decision.decisionKey.toLowerCase(),
    );

    if (!matchingLog) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "ApprovalResolved event not found for this decision from vault" } },
        { status: 422 },
      );
    }

    approved = matchingLog.args.approved;

    if (approved) {
      // Also verify matching Paid event from vault with ownerApproved=true and same decisionKey
      const paidLogs = parseEventLogs({
        abi: LumbungVaultAbi,
        logs: receipt.logs,
        eventName: "Paid",
      });

      const matchingPaidLog = paidLogs.find(
        (log) =>
          log.address?.toLowerCase() === vaultAddress &&
          log.args.decisionKey?.toLowerCase() === decision.decisionKey.toLowerCase() &&
          log.args.ownerApproved === true,
      );

      if (!matchingPaidLog) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: "Paid event with ownerApproved=true not found from vault" } },
          { status: 422 },
        );
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: { code: "INTERNAL", message: `Failed to verify tx receipt: ${msg}` } },
      { status: 500 },
    );
  }

  // Append decision events
  if (approved) {
    await db.insert(decisionEvents).values({
      decisionId,
      status: "OWNER_APPROVED",
      txHash,
    });
    await db.insert(decisionEvents).values({
      decisionId,
      status: "CONFIRMED",
      txHash,
    });
  } else {
    await db.insert(decisionEvents).values({
      decisionId,
      status: "OWNER_REJECTED",
      txHash,
    });
  }

  return NextResponse.json({ ok: true, status: approved ? "OWNER_APPROVED" : "OWNER_REJECTED" });
}
