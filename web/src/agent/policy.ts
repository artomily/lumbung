/**
 * Policy constants and thresholds for decision engine.
 *
 * Rules:
 * - Pure constants; money values as bigint micro-USDC.
 * - These thresholds determine hard-rule boundaries in rules.ts.
 */

export const POLICY = {
  // R4: Stale liability threshold (seconds)
  LIABILITY_MAX_AGE_SEC: 3600,

  // R8 & R9: Solvency reserve ratio boundaries
  CRITICAL_RESERVE_RATIO: 0.5,
  LOW_RESERVE_RATIO: 1.0,
  LOW_RESERVE_MAX_PAY_MICRO: 1_000_000n, // 1 USDC max payout when reserve is low

  // R10: Velocity threshold
  MAX_REDEEMS_24H: 3,

  // R11: New account threshold
  NEW_ACCOUNT_AGE_DAYS: 1,
  NEW_ACCOUNT_MAX_MICRO: 1_000_000n, // 1 USDC

  // R12: Sybil / shared wallet threshold
  SHARED_WALLET_MAX_USERS: 2,

  // LLM Risk score threshold for automatic downgrade from PAY to ESCALATE/HOLD
  RISK_SCORE_ESCALATE_THRESHOLD: 0.7,

  // P1 Creator claim min views
  CREATOR_MIN_VIEWS: 100,
} as const;
