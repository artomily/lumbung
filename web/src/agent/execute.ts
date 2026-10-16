import { parseEventLogs, decodeErrorResult, type Hex } from "viem";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { decisions, decisionEvents, redeemRequests, alerts } from "@/lib/db/schema";
import { executeVaultCall, pollTx } from "@/lib/circle";
import { sendOwnerMessage } from "@/lib/telegram";
import { computeHmac } from "@/lib/hmac";
import { arcClient } from "@/lib/arc";
import { LumbungVaultAbi } from "@/lib/abi/LumbungVault";
import { env } from "@/lib/env";
import { formatMicroUsdc } from "@/lib/money";
import type { Category } from "@/agent/types";

type DecisionRow = typeof decisions.$inferSelect;

/**
 * Attempts to decode a custom revert error from a hex string against LumbungVaultAbi.
 */
function tryDecodeRevertError(errorData?: string): string | undefined {
  if (!errorData || !errorData.startsWith("0x") || errorData.length < 10) {
    return undefined;
  }
  try {
    const decoded = decodeErrorResult({
      abi: LumbungVaultAbi,
      data: errorData as Hex,
    });
    return decoded.errorName;
  } catch {
    return undefined;
  }
}

function decodeRevertMessage(errorReason?: string, errorDetails?: string): string {
  const combined = `${errorReason ?? ""} ${errorDetails ?? ""}`.trim();
  const hexMatch = combined.match(/0x[a-fA-F0-9]{8,}/);
  if (hexMatch) {
    const decodedName = tryDecodeRevertError(hexMatch[0]);
    if (decodedName) {
      return `Reverted with ${decodedName}`;
    }
  }
  return combined || "Execution failed";
}

function isPreSubmissionError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (
      msg.includes("missing") ||
      msg.includes("not configured") ||
      msg.includes("unsupported category") ||
      msg.includes("unsupported decision action")
    ) {
      return true;
    }
  }

  const anyErr = err as {
    status?: number;
    statusCode?: number;
    response?: { status?: number };
  };
  const status = anyErr.response?.status ?? anyErr.status ?? anyErr.statusCode;
  if (typeof status === "number") {
    if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
      return true;
    }
    return false;
  }

  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (
      msg.includes("timeout") ||
      msg.includes("network") ||
      msg.includes("econnrefused") ||
      msg.includes("econnreset") ||
      msg.includes("etimedout") ||
      msg.includes("fetch failed") ||
      msg.includes("socket") ||
      msg.includes("abort") ||
      msg.includes("server error") ||
      msg.includes("500") ||
      msg.includes("502") ||
      msg.includes("503") ||
      msg.includes("504")
    ) {
      return false;
    }
  }

  return false;
}

/**
 * Sends a signed HMAC webhook callback to OWATCH_CALLBACK_URL if configured.
 * Implements HMAC-SHA256 signature per docs/05-API.md.
 */
async function notifyOwatchCallback(
  decision: DecisionRow,
  status: "PENDING" | "PAID" | "HELD" | "AWAITING_OWNER" | "REJECTED" | "FAILED",
  txHash?: string,
): Promise<void> {
  const callbackUrl = env.OWATCH_CALLBACK_URL;
  if (!callbackUrl) {
    return;
  }

  const secret = env.OWATCH_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[execute] OWATCH_WEBHOOK_SECRET is unset, skipping OWatch callback");
    return;
  }

  let redeemId = decision.id;
  if (decision.subjectType === "redeem") {
    try {
      const [req] = await db
        .select({ redeemId: redeemRequests.redeemId })
        .from(redeemRequests)
        .where(eq(redeemRequests.id, decision.subjectId))
        .limit(1);
      if (req?.redeemId) {
        redeemId = req.redeemId;
      }
    } catch (err) {
      console.warn("[execute] Could not load redeemId for callback:", err);
    }
  }

  const payload = {
    redeemId,
    status,
    decisionId: decision.id,
    reason: decision.reasoning,
    txHash: txHash ?? null,
    explorerUrl: txHash ? `${env.NEXT_PUBLIC_ARC_EXPLORER}/tx/${txHash}` : null,
    updatedAt: new Date().toISOString(),
  };

  const rawBody = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = computeHmac(secret, `${timestamp}.${rawBody}`);

  try {
    const res = await fetch(callbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Lumbung-Timestamp": timestamp.toString(),
        "X-Lumbung-Signature": signature,
      },
      body: rawBody,
    });

    if (!res.ok) {
      console.warn(`[execute] OWatch callback returned HTTP ${res.status}: ${res.statusText}`);
    }
  } catch (err) {
    console.warn("[execute] Failed to send OWatch callback:", err);
  }
}

/**
 * Polls Circle for a transaction and finalizes on-chain state verification.
 */
async function pollAndFinalize(decision: DecisionRow, circleTxId: string, budgetMs = 25000): Promise<void> {
  const pollResult = await pollTx(circleTxId, budgetMs);

  if (pollResult.state === "COMPLETE") {
    const txHash = pollResult.txHash;
    if (!txHash) {
      await db.insert(decisionEvents).values({
        decisionId: decision.id,
        status: "FAILED",
        circleTxId,
        error: "Circle returned COMPLETE status but txHash is missing",
      });
      await notifyOwatchCallback(decision, "FAILED");
      return;
    }

    try {
      const receipt = await arcClient.getTransactionReceipt({ hash: txHash as Hex });

      if (receipt.status === "reverted") {
        const decoded = decodeRevertMessage(pollResult.errorReason);
        await db.insert(decisionEvents).values({
          decisionId: decision.id,
          status: "FAILED",
          circleTxId,
          txHash,
          error: decoded,
        });

        if (decision.action === "PAY") {
          await db.insert(alerts).values({
            kind: "TX_FAILED",
            message: `Transaction reverted on-chain for decision ${decision.id}: ${decoded}`,
            data: { decisionId: decision.id, txHash, circleTxId, error: decoded },
            sentTelegram: false,
          });
        }

        await notifyOwatchCallback(decision, "FAILED");
        return;
      }

      if (decision.action === "PAY") {
        const paidLogs = parseEventLogs({
          abi: LumbungVaultAbi,
          logs: receipt.logs,
          eventName: "Paid",
        });

        const matching = paidLogs.find(
          (log) => log.args.decisionKey.toLowerCase() === decision.decisionKey.toLowerCase(),
        );

        if (matching) {
          await db.insert(decisionEvents).values({
            decisionId: decision.id,
            status: "CONFIRMED",
            circleTxId,
            txHash,
          });
          await notifyOwatchCallback(decision, "PAID", txHash);
        } else {
          await db.insert(decisionEvents).values({
            decisionId: decision.id,
            status: "FAILED",
            circleTxId,
            txHash,
            error: "Paid event missing or decisionKey mismatch in transaction logs",
          });
          await notifyOwatchCallback(decision, "FAILED");
        }
      } else if (decision.action === "ESCALATE") {
        const approvalLogs = parseEventLogs({
          abi: LumbungVaultAbi,
          logs: receipt.logs,
          eventName: "ApprovalRequested",
        });

        const matching = approvalLogs.find(
          (log) => log.args.decisionKey.toLowerCase() === decision.decisionKey.toLowerCase(),
        );

        if (matching) {
          await db.insert(decisionEvents).values({
            decisionId: decision.id,
            status: "AWAITING_OWNER",
            circleTxId,
            txHash,
          });

          // Send Telegram alert to owner
          const text =
            `🔔 [Lumbung] Escalation requested for payout of ${formatMicroUsdc(decision.amountMicro)} to ${decision.toWallet}.\n` +
            `Reason: ${decision.reasoning}\n` +
            `Recommendation: ${decision.recommendationIfEscalated ?? "none"}\n` +
            `Review and approve at: ${env.APP_URL}/app/approvals`;
          const sentTelegram = await sendOwnerMessage(text);

          await db.insert(alerts).values({
            kind: "ESCALATION",
            message: `Escalation requested for decision ${decision.id}`,
            data: {
              decisionId: decision.id,
              amountMicro: decision.amountMicro.toString(),
              toWallet: decision.toWallet,
              txHash,
            },
            sentTelegram,
          });

          await notifyOwatchCallback(decision, "AWAITING_OWNER", txHash);
        } else {
          await db.insert(decisionEvents).values({
            decisionId: decision.id,
            status: "FAILED",
            circleTxId,
            txHash,
            error: "ApprovalRequested event missing or decisionKey mismatch in transaction logs",
          });
          await notifyOwatchCallback(decision, "FAILED");
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await db.insert(decisionEvents).values({
        decisionId: decision.id,
        status: "FAILED",
        circleTxId,
        txHash,
        error: `Receipt verification failed: ${errorMsg}`,
      });
      await notifyOwatchCallback(decision, "FAILED");
    }
  } else if (pollResult.state === "FAILED" || pollResult.state === "DENIED" || pollResult.state === "CANCELLED") {
    const errorMsg = decodeRevertMessage(pollResult.errorReason);
    await db.insert(decisionEvents).values({
      decisionId: decision.id,
      status: "FAILED",
      circleTxId,
      txHash: pollResult.txHash,
      error: `Circle transaction ${pollResult.state}: ${errorMsg}`,
    });

    if (decision.action === "PAY") {
      await db.insert(alerts).values({
        kind: "TX_FAILED",
        message: `Circle payout failed for decision ${decision.id}: ${errorMsg}`,
        data: { decisionId: decision.id, circleTxId, error: errorMsg },
        sentTelegram: false,
      });
    }

    await notifyOwatchCallback(decision, "FAILED");
  } else {
    // Non-terminal state (e.g. SENT, QUEUED, INITIATED, etc.) after polling budget
    // Status remains SUBMITTED. Next poll round or tick will pick it up.
  }
}

/**
 * Executes a decision based on its action (PAY, ESCALATE, HOLD, REJECT).
 * Strictly adheres to 04-AGENT.md Section 5 and AGENTS.md safety rules.
 */
export async function executeDecision(decisionId: string): Promise<void> {
  const [decision] = await db
    .select()
    .from(decisions)
    .where(eq(decisions.id, decisionId))
    .limit(1);

  if (!decision) {
    throw new Error(`Decision not found: ${decisionId}`);
  }

  // Check existing events to ensure idempotency and terminal states
  const existingEvents = await db
    .select()
    .from(decisionEvents)
    .where(eq(decisionEvents.decisionId, decisionId))
    .orderBy(desc(decisionEvents.createdAt), desc(decisionEvents.id));

  const latestEvent = existingEvents[0];
  const terminalStatuses = new Set([
    "CONFIRMED",
    "FAILED",
    "HELD",
    "REJECTED",
    "AWAITING_OWNER",
    "OWNER_APPROVED",
    "OWNER_REJECTED",
  ]);

  if (latestEvent && terminalStatuses.has(latestEvent.status)) {
    return;
  }

  if (latestEvent?.status === "SUBMITTED" && latestEvent.circleTxId) {
    await repollDecision(decisionId);
    return;
  }

  if (latestEvent?.status === "SUBMIT_UNKNOWN") {
    await repollDecision(decisionId);
    return;
  }

  switch (decision.action) {
    case "HOLD": {
      if (latestEvent?.status !== "HELD") {
        await db.insert(decisionEvents).values({
          decisionId: decision.id,
          status: "HELD",
          data: { holdUntilHint: decision.holdUntilHint },
        });
      }

      // Notify owner via Telegram only if amount >= 1 USDC (1_000_000 micro-USDC)
      if (decision.amountMicro >= 1_000_000n) {
        const text =
          `⚠️ [Lumbung] Payout HELD: ${formatMicroUsdc(decision.amountMicro)} for ${decision.toWallet}.\n` +
          `Reason: ${decision.reasoning}\n` +
          `Hint: ${decision.holdUntilHint ?? "none"}`;
        await sendOwnerMessage(text);
      }

      await notifyOwatchCallback(decision, "HELD");
      break;
    }

    case "REJECT": {
      if (latestEvent?.status !== "REJECTED") {
        await db.insert(decisionEvents).values({
          decisionId: decision.id,
          status: "REJECTED",
          data: { reasoning: decision.reasoning },
        });
      }

      await notifyOwatchCallback(decision, "REJECTED");
      break;
    }

    case "PAY": {
      let circleTxId: string;
      try {
        const result = await executeVaultCall(
          "pay",
          {
            category: decision.category as Category,
            to: decision.toWallet as Hex,
            amountMicro: decision.amountMicro,
            decisionKey: decision.decisionKey as Hex,
            reasonHash: decision.reasonHash as Hex,
          },
          decision.id,
        );
        circleTxId = result.circleTxId;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (isPreSubmissionError(err)) {
          await db.insert(decisionEvents).values({
            decisionId: decision.id,
            status: "FAILED",
            error: `Circle execution submission failed: ${errorMsg}`,
          });

          await db.insert(alerts).values({
            kind: "TX_FAILED",
            message: `Circle submission failed for decision ${decision.id}: ${errorMsg}`,
            data: { decisionId: decision.id, error: errorMsg },
            sentTelegram: false,
          });

          await notifyOwatchCallback(decision, "FAILED");
          return;
        }

        // Network / 5xx / timeout: Circle tx may have been created
        await db.insert(decisionEvents).values({
          decisionId: decision.id,
          status: "SUBMIT_UNKNOWN",
          error: `Circle execution submission status unknown: ${errorMsg}`,
        });
        return;
      }

      await db.insert(decisionEvents).values({
        decisionId: decision.id,
        status: "SUBMITTED",
        circleTxId,
      });

      await pollAndFinalize(decision, circleTxId, 25000);
      break;
    }

    case "ESCALATE": {
      let circleTxId: string;
      try {
        const result = await executeVaultCall(
          "requestApproval",
          {
            category: decision.category as Category,
            to: decision.toWallet as Hex,
            amountMicro: decision.amountMicro,
            decisionKey: decision.decisionKey as Hex,
            reasonHash: decision.reasonHash as Hex,
          },
          decision.id,
        );
        circleTxId = result.circleTxId;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (isPreSubmissionError(err)) {
          await db.insert(decisionEvents).values({
            decisionId: decision.id,
            status: "FAILED",
            error: `Circle approval request submission failed: ${errorMsg}`,
          });

          await notifyOwatchCallback(decision, "FAILED");
          return;
        }

        // Network / 5xx / timeout: Circle tx may have been created
        await db.insert(decisionEvents).values({
          decisionId: decision.id,
          status: "SUBMIT_UNKNOWN",
          error: `Circle approval request submission status unknown: ${errorMsg}`,
        });
        return;
      }

      await db.insert(decisionEvents).values({
        decisionId: decision.id,
        status: "SUBMITTED",
        circleTxId,
      });

      await pollAndFinalize(decision, circleTxId, 25000);
      break;
    }

    default: {
      throw new Error(`Unsupported decision action: ${String(decision.action)}`);
    }
  }
}

/**
 * Repolls an unfinished Circle transaction for a decision and finalizes if complete.
 * If latest status is SUBMIT_UNKNOWN, retries executeVaultCall with the SAME idempotencyKey
 * (decision.id) to recover the circleTxId (Circle dedupes; contract decisionKey blocks double pay).
 */
export async function repollDecision(decisionId: string): Promise<void> {
  const [decision] = await db
    .select()
    .from(decisions)
    .where(eq(decisions.id, decisionId))
    .limit(1);

  if (!decision) {
    throw new Error(`Decision not found: ${decisionId}`);
  }

  const existingEvents = await db
    .select()
    .from(decisionEvents)
    .where(eq(decisionEvents.decisionId, decisionId))
    .orderBy(desc(decisionEvents.createdAt), desc(decisionEvents.id));

  const latestEvent = existingEvents[0];
  if (!latestEvent) {
    return;
  }

  if (latestEvent.status === "SUBMIT_UNKNOWN") {
    if (decision.action !== "PAY" && decision.action !== "ESCALATE") {
      return;
    }
    const fn = decision.action === "PAY" ? "pay" : "requestApproval";
    try {
      const result = await executeVaultCall(
        fn,
        {
          category: decision.category as Category,
          to: decision.toWallet as Hex,
          amountMicro: decision.amountMicro,
          decisionKey: decision.decisionKey as Hex,
          reasonHash: decision.reasonHash as Hex,
        },
        decision.id, // SAME idempotencyKey
      );
      const circleTxId = result.circleTxId;
      await db.insert(decisionEvents).values({
        decisionId: decision.id,
        status: "SUBMITTED",
        circleTxId,
      });
      await pollAndFinalize(decision, circleTxId, 15000);
      return;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (isPreSubmissionError(err)) {
        await db.insert(decisionEvents).values({
          decisionId: decision.id,
          status: "FAILED",
          error: `Circle retry submission failed: ${errorMsg}`,
        });
        if (decision.action === "PAY") {
          await db.insert(alerts).values({
            kind: "TX_FAILED",
            message: `Circle submission failed for decision ${decision.id}: ${errorMsg}`,
            data: { decisionId: decision.id, error: errorMsg },
            sentTelegram: false,
          });
        }
        await notifyOwatchCallback(decision, "FAILED");
      } else {
        await db.insert(decisionEvents).values({
          decisionId: decision.id,
          status: "SUBMIT_UNKNOWN",
          error: `Submission retry status unknown: ${errorMsg}`,
        });
      }
      return;
    }
  }

  if (latestEvent.status !== "SUBMITTED" || !latestEvent.circleTxId) {
    return;
  }

  await pollAndFinalize(decision, latestEvent.circleTxId, 15000);
}
