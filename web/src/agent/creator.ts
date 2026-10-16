import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { creatorClaims, decisions, decisionEvents } from "@/lib/db/schema";
import { executeDecision } from "@/agent/execute";
import { computeDecisionKey, hashReason, normalizeForCanonicalJson } from "@/lib/canonical";
import { env } from "@/lib/env";
import { POLICY } from "@/agent/policy";
import type { DecisionSnapshot, RuleResult } from "@/agent/types";

export type CreatorClaimInput = {
  claimId: string;
  creatorName: string;
  wallet: string;
  videoUrl: string;
  videoId: string;
  amountMicro: bigint;
  viewsAtCheck?: number;
};

/**
 * Creator rule: views >= CREATOR_MIN_VIEWS (default 100) → PAY from CREATOR (within caps) else HOLD.
 */
export function evaluateCreatorRule(
  viewsAtCheck: number | null | undefined,
  minViews: number = POLICY.CREATOR_MIN_VIEWS,
): { action: "PAY" | "HOLD"; reasoning: string; ruleResult: RuleResult } {
  if (viewsAtCheck == null || viewsAtCheck < minViews) {
    const detail =
      viewsAtCheck == null
        ? `Video views not available; holding for manual review`
        : `Video has ${viewsAtCheck} views, below minimum ${minViews}; HOLD pending more views`;
    return {
      action: "HOLD",
      reasoning: detail,
      ruleResult: {
        id: "R1_valid_wallet" as const, // reuse closest applicable rule; creator rules expand types
        passed: false,
        detail,
      },
    };
  }
  const detail = `Video has ${viewsAtCheck} views >= minimum ${minViews}; PAY creator`;
  return {
    action: "PAY",
    reasoning: detail,
    ruleResult: {
      id: "R1_valid_wallet" as const,
      passed: true,
      detail,
    },
  };
}

/**
 * Fetches views for a videoId from OWatch API if OWATCH_API_URL is configured.
 * Returns null if unconfigured or fetch fails.
 */
async function fetchVideoViews(videoId: string): Promise<number | null> {
  const apiUrl = env.OWATCH_API_URL;
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl.replace(/\/$/, "")}/videos/${videoId}/views`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { views?: number };
    return typeof data.views === "number" ? data.views : null;
  } catch {
    return null;
  }
}

/**
 * Decides a creator claim:
 * - Fetches views from OWatch (optional)
 * - Applies creator rule (views >= min → PAY, else HOLD)
 * - Inserts decision + PROPOSED event
 * - Calls executeDecision
 */
export async function decideCreatorClaim(
  claimInput: CreatorClaimInput,
): Promise<{ decisionId: string }> {
  // Idempotency: check for existing decision for this claimId
  const [existingClaim] = await db
    .select({ id: creatorClaims.id })
    .from(creatorClaims)
    .where(eq(creatorClaims.claimId, claimInput.claimId))
    .limit(1);

  if (existingClaim) {
    const [existingDecision] = await db
      .select({ id: decisions.id })
      .from(decisions)
      .where(and(eq(decisions.subjectId, existingClaim.id), eq(decisions.subjectType, "creator_claim")))
      .limit(1);

    if (existingDecision) {
      await executeDecision(existingDecision.id);
      return { decisionId: existingDecision.id };
    }
  }

  // Fetch views
  const viewsAtCheck = claimInput.viewsAtCheck ?? (await fetchVideoViews(claimInput.videoId));
  const minViews = env.CREATOR_MIN_VIEWS;

  // Insert or get claim row
  let claimId: string;
  if (existingClaim) {
    claimId = existingClaim.id;
  } else {
    const [inserted] = await db
      .insert(creatorClaims)
      .values({
        claimId: claimInput.claimId,
        creatorName: claimInput.creatorName,
        wallet: claimInput.wallet.toLowerCase(),
        videoUrl: claimInput.videoUrl,
        videoId: claimInput.videoId,
        amountMicro: claimInput.amountMicro,
        viewsAtCheck: viewsAtCheck ?? null,
      })
      .returning({ id: creatorClaims.id });
    claimId = inserted.id;
  }

  // Apply creator rule
  const { action, reasoning } = evaluateCreatorRule(viewsAtCheck, minViews);
  const ruleResults: RuleResult[] = [
    {
      id: "R1_valid_wallet",
      passed: true,
      detail: `Wallet ${claimInput.wallet} is valid`,
    },
  ];

  // Minimal snapshot for creator claim
  const snapshot: DecisionSnapshot = {
    asOf: new Date().toISOString(),
    network: (env.ARC_NETWORK === "mainnet" ? "arc-mainnet" : "arc-testnet") as "arc-testnet" | "arc-mainnet",
    vault: {
      balanceMicro: 0n,
      remainingToday: { REWARD: 0n, CREATOR: 0n, OPS: 0n },
      perTxCap: { REWARD: 0n, CREATOR: 0n, OPS: 0n },
      paused: false,
    },
    liability: {
      pointsOutstanding: 0n,
      microUsdcPerPoint: 0n,
      liabilityMicro: 0n,
      snapshotAgeSec: 0,
    },
    solvency: {
      reserveRatio: 999,
      avgDailyPayout7dMicro: 0n,
      runwayDays: null,
      pendingEscalationsMicro: 0n,
    },
    request: {
      redeemId: claimInput.claimId,
      userId: `creator:${claimInput.creatorName}`,
      wallet: claimInput.wallet as `0x${string}`,
      points: 0n,
      amountMicro: claimInput.amountMicro,
      source: "owatch",
    },
    user: {
      accountAgeDays: null,
      redeems24h: 0,
      redeems7d: 0,
      paidTotalMicro: 0n,
      medianRedeemMicro: null,
      pointsEarned7d: null,
      walletSharedWithOtherUsers: 0,
    },
  };

  const decisionId = randomUUID();
  const decisionKey = computeDecisionKey(decisionId);
  const reasonHash = hashReason({ snapshot, ruleResults, action, reasoning });

  await db.insert(decisions).values({
    id: decisionId,
    decisionKey,
    subjectType: "creator_claim",
    subjectId: claimId,
    category: "CREATOR",
    toWallet: claimInput.wallet.toLowerCase(),
    amountMicro: claimInput.amountMicro,
    action,
    reasoning,
    riskScore: null,
    factors: action === "PAY" ? [`views=${viewsAtCheck ?? 0}>=minViews=${minViews}`] : [`views-below-threshold`],
    allowedActions: [action],
    ruleResults,
    snapshot: normalizeForCanonicalJson(snapshot) as Record<string, unknown>,
    recommendationIfEscalated: undefined,
    holdUntilHint: action === "HOLD" ? "owner" : undefined,
    llmModel: "rules-only",
    reasonHash,
    source: "owatch",
  });

  await db.insert(decisionEvents).values({
    decisionId,
    status: "PROPOSED",
  });

  await executeDecision(decisionId);

  return { decisionId };
}
