import { getAddress, isAddress } from "viem";
import type { Action, DecisionSnapshot, EvaluateRulesResult, RuleResult } from "./types";
import { POLICY } from "./policy";

/**
 * Validates whether an address is a valid checksummed non-zero EVM address.
 */
export function isValidChecksummedAddress(wallet: string): boolean {
  if (!wallet || !isAddress(wallet)) return false;
  if (wallet.toLowerCase() === "0x0000000000000000000000000000000000000000") return false;
  try {
    return getAddress(wallet) === wallet;
  } catch {
    return false;
  }
}

/**
 * Pure function evaluating hard rules against a DecisionSnapshot.
 * 
 * Flow per 04-AGENT.md:
 * - Evaluate all 12 rules (R1 to R12) and record each result.
 * - Base allowed actions: [PAY, HOLD, ESCALATE, REJECT].
 * - REJECT is only kept when R1 or R2 failed.
 * - Forced actions:
 *   - R1 or R2 fail -> forced REJECT
 *   - R3 or R7 fail -> forced HOLD (if not already REJECT)
 * - Removals:
 *   - R4-R12 narrow allowed actions by removing PAY.
 * - Fallback to HOLD if nothing remains.
 */
export function evaluateRules(snapshot: DecisionSnapshot): EvaluateRulesResult {
  const ruleResults: RuleResult[] = [];

  // R1_valid_wallet: wallet is a checksummed non-zero address
  const r1Passed = isValidChecksummedAddress(snapshot.request.wallet);
  ruleResults.push({
    id: "R1_valid_wallet",
    passed: r1Passed,
    detail: r1Passed
      ? `Wallet ${snapshot.request.wallet} is a valid checksummed non-zero address`
      : `Wallet "${snapshot.request.wallet}" is invalid or not checksummed (must be non-zero)`,
  });

  // R2_amount_matches_points: amountMicro == points * microUsdcPerPoint (±0)
  const expectedMicro = snapshot.request.points * snapshot.liability.microUsdcPerPoint;
  const r2Passed = snapshot.request.amountMicro === expectedMicro;
  ruleResults.push({
    id: "R2_amount_matches_points",
    passed: r2Passed,
    detail: r2Passed
      ? `amountMicro ${snapshot.request.amountMicro} matches points ${snapshot.request.points} * rate ${snapshot.liability.microUsdcPerPoint}`
      : `amountMicro mismatch: requested ${snapshot.request.amountMicro} but expected ${expectedMicro} (points ${snapshot.request.points} * rate ${snapshot.liability.microUsdcPerPoint})`,
  });

  // R3_vault_paused: vault paused -> forced HOLD
  const r3Passed = !snapshot.vault.paused;
  ruleResults.push({
    id: "R3_vault_paused",
    passed: r3Passed,
    detail: r3Passed ? "Vault is active (not paused)" : "Vault is currently paused",
  });

  // R4_liability_fresh: snapshotAgeSec <= 3600
  const r4Passed = snapshot.liability.snapshotAgeSec <= POLICY.LIABILITY_MAX_AGE_SEC;
  ruleResults.push({
    id: "R4_liability_fresh",
    passed: r4Passed,
    detail: r4Passed
      ? `Liability snapshot age ${snapshot.liability.snapshotAgeSec}s <= ${POLICY.LIABILITY_MAX_AGE_SEC}s`
      : `Liability snapshot is stale (${snapshot.liability.snapshotAgeSec}s > ${POLICY.LIABILITY_MAX_AGE_SEC}s)`,
  });

  // R5_within_per_tx: amountMicro <= perTxCap.REWARD
  const r5Passed = snapshot.request.amountMicro <= snapshot.vault.perTxCap.REWARD;
  ruleResults.push({
    id: "R5_within_per_tx",
    passed: r5Passed,
    detail: r5Passed
      ? `amountMicro ${snapshot.request.amountMicro} <= perTxCap.REWARD ${snapshot.vault.perTxCap.REWARD}`
      : `amountMicro ${snapshot.request.amountMicro} exceeds perTxCap.REWARD ${snapshot.vault.perTxCap.REWARD}`,
  });

  // R6_within_daily: amountMicro <= remainingToday.REWARD
  const r6Passed = snapshot.request.amountMicro <= snapshot.vault.remainingToday.REWARD;
  ruleResults.push({
    id: "R6_within_daily",
    passed: r6Passed,
    detail: r6Passed
      ? `amountMicro ${snapshot.request.amountMicro} <= remainingToday.REWARD ${snapshot.vault.remainingToday.REWARD}`
      : `amountMicro ${snapshot.request.amountMicro} exceeds remainingToday.REWARD ${snapshot.vault.remainingToday.REWARD}`,
  });

  // R7_balance: amountMicro <= balanceMicro - pendingEscalationsMicro
  const availableBalanceMicro =
    snapshot.vault.balanceMicro > snapshot.solvency.pendingEscalationsMicro
      ? snapshot.vault.balanceMicro - snapshot.solvency.pendingEscalationsMicro
      : 0n;
  const r7Passed = snapshot.request.amountMicro <= availableBalanceMicro;
  ruleResults.push({
    id: "R7_balance",
    passed: r7Passed,
    detail: r7Passed
      ? `amountMicro ${snapshot.request.amountMicro} <= available vault balance ${availableBalanceMicro}`
      : `Insufficient vault balance: amount ${snapshot.request.amountMicro} > available ${availableBalanceMicro} (balance ${snapshot.vault.balanceMicro} - pending escalations ${snapshot.solvency.pendingEscalationsMicro})`,
  });

  // R8_solvency_critical: reserveRatio < 0.5
  const r8Passed = snapshot.solvency.reserveRatio >= POLICY.CRITICAL_RESERVE_RATIO;
  ruleResults.push({
    id: "R8_solvency_critical",
    passed: r8Passed,
    detail: r8Passed
      ? `Reserve ratio ${snapshot.solvency.reserveRatio} >= critical threshold ${POLICY.CRITICAL_RESERVE_RATIO}`
      : `Critical solvency: reserve ratio ${snapshot.solvency.reserveRatio} < ${POLICY.CRITICAL_RESERVE_RATIO}`,
  });

  // R9_solvency_low: 0.5 <= reserveRatio < 1.0 -> PAY allowed only if amountMicro <= 1 USDC
  const inLowReserveBand =
    snapshot.solvency.reserveRatio >= POLICY.CRITICAL_RESERVE_RATIO &&
    snapshot.solvency.reserveRatio < POLICY.LOW_RESERVE_RATIO;
  const r9Passed = !inLowReserveBand || snapshot.request.amountMicro <= POLICY.LOW_RESERVE_MAX_PAY_MICRO;
  ruleResults.push({
    id: "R9_solvency_low",
    passed: r9Passed,
    detail: inLowReserveBand
      ? r9Passed
        ? `Low reserve ratio (${snapshot.solvency.reserveRatio}), but amount ${snapshot.request.amountMicro} <= ${POLICY.LOW_RESERVE_MAX_PAY_MICRO} (1 USDC limit)`
        : `Low reserve ratio (${snapshot.solvency.reserveRatio}) and amount ${snapshot.request.amountMicro} exceeds ${POLICY.LOW_RESERVE_MAX_PAY_MICRO} (1 USDC limit)`
      : `Reserve ratio ${snapshot.solvency.reserveRatio} is not in low band [${POLICY.CRITICAL_RESERVE_RATIO}, ${POLICY.LOW_RESERVE_RATIO})`,
  });

  // R10_velocity: redeems24h >= 3 -> remove PAY
  const r10Passed = snapshot.user.redeems24h < POLICY.MAX_REDEEMS_24H;
  ruleResults.push({
    id: "R10_velocity",
    passed: r10Passed,
    detail: r10Passed
      ? `Redeems in 24h (${snapshot.user.redeems24h}) < limit ${POLICY.MAX_REDEEMS_24H}`
      : `Velocity limit reached: ${snapshot.user.redeems24h} redeems in 24h >= limit ${POLICY.MAX_REDEEMS_24H}`,
  });

  // R11_new_account_big: accountAgeDays < 1 && amountMicro > 1 USDC -> remove PAY
  const isNewAccount =
    snapshot.user.accountAgeDays !== null && snapshot.user.accountAgeDays < POLICY.NEW_ACCOUNT_AGE_DAYS;
  const r11Passed = !(isNewAccount && snapshot.request.amountMicro > POLICY.NEW_ACCOUNT_MAX_MICRO);
  ruleResults.push({
    id: "R11_new_account_big",
    passed: r11Passed,
    detail: r11Passed
      ? isNewAccount
        ? `New account (${snapshot.user.accountAgeDays}d) within 1 USDC limit (${snapshot.request.amountMicro} <= ${POLICY.NEW_ACCOUNT_MAX_MICRO})`
        : snapshot.user.accountAgeDays === null
          ? "Account age unknown (within policy)"
          : `Account age ${snapshot.user.accountAgeDays}d >= ${POLICY.NEW_ACCOUNT_AGE_DAYS}d`
      : `New account (${snapshot.user.accountAgeDays}d) attempting redeem above 1 USDC (${snapshot.request.amountMicro} > ${POLICY.NEW_ACCOUNT_MAX_MICRO})`,
  });

  // R12_shared_wallet: walletSharedWithOtherUsers >= 2 -> remove PAY
  const r12Passed = snapshot.user.walletSharedWithOtherUsers < POLICY.SHARED_WALLET_MAX_USERS;
  ruleResults.push({
    id: "R12_shared_wallet",
    passed: r12Passed,
    detail: r12Passed
      ? `Wallet shared with ${snapshot.user.walletSharedWithOtherUsers} other users < limit ${POLICY.SHARED_WALLET_MAX_USERS}`
      : `Sybil risk: wallet shared with ${snapshot.user.walletSharedWithOtherUsers} other users >= limit ${POLICY.SHARED_WALLET_MAX_USERS}`,
  });

  // Determine forced actions
  let forced: Action | undefined;
  if (!r1Passed || !r2Passed) {
    forced = "REJECT";
    return {
      allowedActions: ["REJECT"],
      ruleResults,
      forced,
    };
  }

  if (!r3Passed || !r7Passed) {
    forced = "HOLD";
    return {
      allowedActions: ["HOLD"],
      ruleResults,
      forced,
    };
  }

  // Base set: PAY, HOLD, ESCALATE (REJECT removed since R1 and R2 passed)
  const allowed = new Set<Action>(["PAY", "HOLD", "ESCALATE"]);

  // Apply removals from failing rules:
  if (!r4Passed) allowed.delete("PAY");
  if (!r5Passed) allowed.delete("PAY");
  if (!r6Passed) allowed.delete("PAY");
  if (!r8Passed) allowed.delete("PAY");
  if (!r9Passed) allowed.delete("PAY");
  if (!r10Passed) allowed.delete("PAY");
  if (!r11Passed) allowed.delete("PAY");
  if (!r12Passed) allowed.delete("PAY");

  if (allowed.size === 0) {
    allowed.add("HOLD");
  }

  const order: Action[] = ["PAY", "HOLD", "ESCALATE"];
  const allowedActions = order.filter((a) => allowed.has(a));

  return {
    allowedActions,
    ruleResults,
  };
}
