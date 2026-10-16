import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { redeemRequests, decisions, decisionEvents } from "@/lib/db/schema";
import { buildSnapshot } from "./snapshot";
import { evaluateRules } from "./rules";
import { callLlm } from "./llm";
import { executeDecision } from "./execute";
import { computeDecisionKey, hashReason, normalizeForCanonicalJson } from "@/lib/canonical";
import { POLICY } from "./policy";
import type { Action, DecisionSnapshot } from "./types";

/**
 * Orchestrates the full decision pipeline for a redeem request:
 * 1. Checks DB for existing decision (Layer 1 idempotency)
 * 2. Builds fresh DecisionSnapshot (chain, liability, solvency, user history)
 * 3. Evaluates hard rules (pure, narrowing allowedActions)
 * 4. LLM judgment (only if allowedActions > 1 and no forced action)
 * 5. Applies risk downgrade rule (riskScore >= 0.7 -> downgrade PAY to ESCALATE/HOLD)
 * 6. Computes reasonHash (canonical JSON hash) & decisionKey (keccak256(decisionId))
 * 7. Inserts immutable decision row + initial PROPOSED event
 * 8. Triggers executeDecision(decisionId)
 */
export async function decideRedeem(
  redeemRequestId: string,
  providedDecisionId?: string,
): Promise<{ decisionId: string }> {
  const [request] = await db
    .select()
    .from(redeemRequests)
    .where(eq(redeemRequests.id, redeemRequestId))
    .limit(1);

  if (!request) {
    throw new Error(`Redeem request not found: ${redeemRequestId}`);
  }

  // Check if a decision was already created for this redeem request (idempotency layer 1)
  const [existingDecision] = await db
    .select({ id: decisions.id })
    .from(decisions)
    .where(and(eq(decisions.subjectId, request.id), eq(decisions.subjectType, "redeem")))
    .limit(1);

  if (existingDecision) {
    await executeDecision(existingDecision.id);
    return { decisionId: existingDecision.id };
  }

  // 1. Build fresh snapshot
  const snapshot: DecisionSnapshot = await buildSnapshot({
    redeemId: request.redeemId,
    userId: request.userId,
    wallet: request.wallet,
    points: request.points,
    amountMicro: request.amountMicro,
    source: request.source as "owatch" | "simulator",
    accountCreatedAt: request.accountCreatedAt,
    pointsEarned7d: request.pointsEarned7d,
  });

  // 2. Evaluate hard rules
  const { allowedActions, ruleResults, forced } = evaluateRules(snapshot);

  let finalAction: Action;
  let finalReasoning: string;
  let finalRiskScore: number | null = null;
  let finalFactors: string[] = [];
  let recommendationIfEscalated: "APPROVE" | "REJECT" | undefined;
  let holdUntilHint: "next_tick" | "daily_reset" | "top_up" | "owner" | undefined;
  let llmModel = "rules-only";

  // 3. Determine action
  if (forced) {
    finalAction = forced;
    finalReasoning =
      forced === "REJECT"
        ? ruleResults.find((r) => !r.passed)?.detail || "Hard rule violation; rejected for security"
        : ruleResults.find((r) => !r.passed)?.detail || "Treasury condition triggered; held for safety";
    finalFactors = [`forced-${forced.toLowerCase()}`, ...ruleResults.filter((r) => !r.passed).map((r) => r.id)];
    holdUntilHint = forced === "HOLD" ? "owner" : undefined;
  } else if (allowedActions.length === 1) {
    finalAction = allowedActions[0];
    finalReasoning = `Single permissible action (${finalAction}) based on hard policy rules`;
    finalFactors = [`single-action-${finalAction.toLowerCase()}`];
    holdUntilHint = finalAction === "HOLD" ? "owner" : undefined;
  } else {
    // Multiple choices allowed and not forced -> call LLM judgment
    const llmResult = await callLlm(snapshot, ruleResults, allowedActions);
    finalAction = llmResult.decision.action;
    finalReasoning = llmResult.decision.reasoning;
    finalRiskScore = llmResult.decision.riskScore;
    finalFactors = [...llmResult.decision.factors];
    recommendationIfEscalated = llmResult.decision.recommendationIfEscalated;
    holdUntilHint = llmResult.decision.holdUntilHint;
    llmModel = llmResult.llmModel;

    // Post-rule per 04-AGENT.md Section 3:
    // If riskScore >= 0.7 and action is PAY -> downgrade to ESCALATE (if allowed) else HOLD
    if (finalRiskScore !== null && finalRiskScore >= POLICY.RISK_SCORE_ESCALATE_THRESHOLD && finalAction === "PAY") {
      if (allowedActions.includes("ESCALATE")) {
        finalAction = "ESCALATE";
        finalFactors.push(
          `risk-downgrade-to-escalate (riskScore=${finalRiskScore.toFixed(2)} >= ${POLICY.RISK_SCORE_ESCALATE_THRESHOLD})`,
        );
      } else {
        finalAction = "HOLD";
        finalFactors.push(
          `risk-downgrade-to-hold (riskScore=${finalRiskScore.toFixed(2)} >= ${POLICY.RISK_SCORE_ESCALATE_THRESHOLD})`,
        );
        holdUntilHint = "owner";
      }
    }

    // Safety constraint: action must remain strictly within allowedActions
    if (!allowedActions.includes(finalAction)) {
      finalAction = "HOLD";
      finalFactors.push("out-of-policy-downgrade-to-hold");
      holdUntilHint = "owner";
    }
  }

  // 4. Identifiers & cryptographic proofs
  const decisionId = providedDecisionId || randomUUID();
  const decisionKey = computeDecisionKey(decisionId);
  const reasonHash = hashReason({
    snapshot,
    ruleResults,
    action: finalAction,
    reasoning: finalReasoning,
  });

  // 5. Append decision record
  await db.insert(decisions).values({
    id: decisionId,
    decisionKey,
    subjectType: "redeem",
    subjectId: request.id,
    category: "REWARD",
    toWallet: request.wallet.toLowerCase(),
    amountMicro: request.amountMicro,
    action: finalAction,
    reasoning: finalReasoning,
    riskScore: finalRiskScore,
    factors: finalFactors,
    allowedActions,
    ruleResults,
    snapshot: normalizeForCanonicalJson(snapshot) as Record<string, unknown>,
    recommendationIfEscalated,
    holdUntilHint,
    llmModel,
    reasonHash,
    source: request.source,
  });

  // 6. Append initial decision event
  await db.insert(decisionEvents).values({
    decisionId,
    status: "PROPOSED",
  });

  // 7. Execute decision asynchronously
  await executeDecision(decisionId);

  return { decisionId };
}
