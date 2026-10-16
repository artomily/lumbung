import { z } from "zod";
import type { Address, Hex } from "viem";

export type Category = "REWARD" | "CREATOR" | "OPS";

export type Action = "PAY" | "HOLD" | "ESCALATE" | "REJECT";

export type RuleId =
  | "R1_valid_wallet"
  | "R2_amount_matches_points"
  | "R3_vault_paused"
  | "R4_liability_fresh"
  | "R5_within_per_tx"
  | "R6_within_daily"
  | "R7_balance"
  | "R8_solvency_critical"
  | "R9_solvency_low"
  | "R10_velocity"
  | "R11_new_account_big"
  | "R12_shared_wallet";

export type RuleResult = {
  id: RuleId;
  passed: boolean;
  detail: string;
};

export type DecisionSnapshot = {
  asOf: string; // ISO time
  network: "arc-testnet" | "arc-mainnet";
  vault: {
    balanceMicro: bigint; // usdc.balanceOf(vault)
    remainingToday: { REWARD: bigint; CREATOR: bigint; OPS: bigint };
    perTxCap: { REWARD: bigint; CREATOR: bigint; OPS: bigint };
    paused: boolean;
  };
  liability: {
    pointsOutstanding: bigint; // latest OWatch snapshot
    microUsdcPerPoint: bigint;
    liabilityMicro: bigint; // points * rate
    snapshotAgeSec: number;
  };
  solvency: {
    reserveRatio: number; // balanceMicro / liabilityMicro (∞ -> 999 if liability 0)
    avgDailyPayout7dMicro: bigint; // from decisions (CONFIRMED PAY, last 7d)
    runwayDays: number | null; // balance / avgDaily
    pendingEscalationsMicro: bigint; // open approval requests
  };
  request: {
    redeemId: string;
    userId: string;
    wallet: Address;
    points: bigint;
    amountMicro: bigint;
    source: "owatch" | "simulator";
  };
  user: {
    accountAgeDays: number | null;
    redeems24h: number;
    redeems7d: number;
    paidTotalMicro: bigint;
    medianRedeemMicro: bigint | null;
    pointsEarned7d: bigint | null;
    walletSharedWithOtherUsers: number;
  };
};

export type EvaluateRulesResult = {
  allowedActions: Action[];
  ruleResults: RuleResult[];
  forced?: Action;
};

export const LlmDecisionSchema = z.object({
  action: z.enum(["PAY", "HOLD", "ESCALATE", "REJECT"]),
  reasoning: z.string().min(10).max(600),
  riskScore: z.number().min(0).max(1),
  factors: z.array(z.string()).max(6),
  recommendationIfEscalated: z.enum(["APPROVE", "REJECT"]).optional(),
  holdUntilHint: z.enum(["next_tick", "daily_reset", "top_up", "owner"]).optional(),
});

export type LlmDecision = z.infer<typeof LlmDecisionSchema>;

export type Decision = {
  id: string; // uuid v4 (also Circle idempotencyKey)
  decisionKey: Hex; // keccak256(toBytes(id))
  subjectType: "redeem" | "creator_claim";
  subjectId: string;
  category: Category;
  amountMicro: bigint;
  to: Address;
  action: Action;
  reasoning: string;
  riskScore: number | null;
  factors: string[];
  allowedActions: Action[];
  ruleResults: RuleResult[];
  snapshot: DecisionSnapshot;
  recommendationIfEscalated?: "APPROVE" | "REJECT";
  holdUntilHint?: "next_tick" | "daily_reset" | "top_up" | "owner";
  llmModel: string; // e.g. "fallback" | "rules-only" | model name
  reasonHash: Hex; // keccak256(canonicalJson({snapshot, ruleResults, action, reasoning}))
};
