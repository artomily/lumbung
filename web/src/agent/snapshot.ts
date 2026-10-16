import { sql, desc, eq, and, gte, ne } from "drizzle-orm";
import type { Address } from "viem";
import { getAddress, isAddress } from "viem";
import { env } from "@/lib/env";
import { db } from "@/lib/db/client";
import {
  owatchSnapshots,
  decisions,
  decisionEvents,
  redeemRequests,
} from "@/lib/db/schema";
import { getVaultSnapshot } from "@/lib/arc";
import type { DecisionSnapshot } from "./types";

export type BuildSnapshotInput = {
  redeemId: string;
  userId: string;
  wallet: string;
  points: bigint;
  amountMicro: bigint;
  source: "owatch" | "simulator";
  accountCreatedAt?: Date | string | null;
  pointsEarned7d?: bigint | null;
};

/**
 * Builds a fresh DecisionSnapshot for the decision engine per 04-AGENT.md Section 1.
 * Fetches:
 * 1. Vault balances and budget limits from Arc chain via arc.ts
 * 2. Latest liability from OWatch snapshots in DB
 * 3. Solvency metrics (reserveRatio, avgDailyPayout7d, runwayDays, pendingEscalations)
 * 4. User redemption history and Sybil/shared-wallet signals
 *
 * Degrades gracefully if env or DB is missing/unreachable.
 */
export async function buildSnapshot(
  input: BuildSnapshotInput,
  overrides?: Partial<DecisionSnapshot>,
): Promise<DecisionSnapshot> {
  const asOf = new Date().toISOString();
  const network = env.ARC_NETWORK === "mainnet" ? "arc-mainnet" : "arc-testnet";

  // 1. Vault reads from chain
  let vault: DecisionSnapshot["vault"] = {
    balanceMicro: 0n,
    remainingToday: { REWARD: 0n, CREATOR: 0n, OPS: 0n },
    perTxCap: { REWARD: 5_000_000n, CREATOR: 25_000_000n, OPS: 10_000_000n },
    paused: true,
  };

  try {
    const vaultData = await getVaultSnapshot();
    vault = {
      balanceMicro: vaultData.balanceMicro,
      remainingToday: vaultData.remainingToday,
      perTxCap: vaultData.perTxCap,
      paused: vaultData.paused,
    };
  } catch (err) {
    // If vault address is not set or RPC call fails, default to paused = true (safe HOLD)
    console.warn("[snapshot] Could not read vault state from chain, defaulting to safe paused state:", err);
  }

  // 2. Latest OWatch liability snapshot
  let pointsOutstanding = 0n;
  let microUsdcPerPoint = 500n;
  let liabilityMicro = 0n;
  let snapshotAgeSec = 999999; // Stale by default if no snapshot exists

  try {
    const [latestSnapshot] = await db
      .select()
      .from(owatchSnapshots)
      .orderBy(desc(owatchSnapshots.asOf), desc(owatchSnapshots.id))
      .limit(1);

    if (latestSnapshot) {
      pointsOutstanding = latestSnapshot.pointsOutstanding;
      microUsdcPerPoint = latestSnapshot.microUsdcPerPoint;
      liabilityMicro = pointsOutstanding * microUsdcPerPoint;
      const snapshotTime = new Date(latestSnapshot.asOf).getTime();
      snapshotAgeSec = Math.max(0, Math.floor((Date.now() - snapshotTime) / 1000));
    }
  } catch (err) {
    console.warn("[snapshot] Could not load latest OWatch snapshot from DB:", err);
  }

  // 3. Solvency calculations
  // reserveRatio: balanceMicro / liabilityMicro (infinity -> 999 if liability is 0)
  let reserveRatio = 999;
  if (liabilityMicro > 0n) {
    reserveRatio = Number(vault.balanceMicro) / Number(liabilityMicro);
  }

  let avgDailyPayout7dMicro = 0n;
  let runwayDays: number | null = null;
  let pendingEscalationsMicro = 0n;

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Calculate confirmed PAY total in the last 7 days
    const recentPayouts = await db
      .select({ amountMicro: decisions.amountMicro })
      .from(decisions)
      .innerJoin(decisionEvents, eq(decisions.id, decisionEvents.decisionId))
      .where(
        and(
          eq(decisions.action, "PAY"),
          eq(decisionEvents.status, "CONFIRMED"),
          gte(decisionEvents.createdAt, sevenDaysAgo),
        ),
      );

    const totalPayout7d = recentPayouts.reduce((acc, row) => acc + row.amountMicro, 0n);
    avgDailyPayout7dMicro = totalPayout7d / 7n;

    if (avgDailyPayout7dMicro > 0n) {
      runwayDays = Number(vault.balanceMicro) / Number(avgDailyPayout7dMicro);
    }

    // Pending escalations: decisions with action ESCALATE whose latest status is AWAITING_OWNER or SUBMITTED
    const escalationRows = await db
      .select({
        id: decisions.id,
        amountMicro: decisions.amountMicro,
        status: decisionEvents.status,
      })
      .from(decisions)
      .innerJoin(decisionEvents, eq(decisions.id, decisionEvents.decisionId))
      .where(eq(decisions.action, "ESCALATE"))
      .orderBy(desc(decisionEvents.createdAt), desc(decisionEvents.id));

    // Map to find latest status per decision
    const seenDecisions = new Set<string>();
    for (const row of escalationRows) {
      if (!seenDecisions.has(row.id)) {
        seenDecisions.add(row.id);
        if (row.status === "AWAITING_OWNER" || row.status === "SUBMITTED") {
          pendingEscalationsMicro += row.amountMicro;
        }
      }
    }
  } catch (err) {
    console.warn("[snapshot] Could not calculate solvency history metrics from DB:", err);
  }

  // 4. User history
  let accountAgeDays: number | null = null;
  if (input.accountCreatedAt) {
    const createdTime = new Date(input.accountCreatedAt).getTime();
    accountAgeDays = Math.max(0, Math.floor((Date.now() - createdTime) / (24 * 60 * 60 * 1000)));
  }

  let redeems24h = 0;
  let redeems7d = 0;
  let paidTotalMicro = 0n;
  let medianRedeemMicro: bigint | null = null;
  let walletSharedWithOtherUsers = 0;

  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // User's redemption counts in 24h and 7d
    const userRequests = await db
      .select({ createdAt: redeemRequests.createdAt })
      .from(redeemRequests)
      .where(eq(redeemRequests.userId, input.userId));

    for (const req of userRequests) {
      const t = new Date(req.createdAt).getTime();
      if (t >= oneDayAgo.getTime()) redeems24h++;
      if (t >= sevenDaysAgo.getTime()) redeems7d++;
    }

    // User's past confirmed payouts
    const userPayouts = await db
      .select({ amountMicro: decisions.amountMicro })
      .from(decisions)
      .innerJoin(decisionEvents, eq(decisions.id, decisionEvents.decisionId))
      .where(
        and(
          eq(decisions.action, "PAY"),
          eq(decisionEvents.status, "CONFIRMED"),
          eq(decisions.toWallet, input.wallet.toLowerCase()),
        ),
      );

    if (userPayouts.length > 0) {
      const amounts = userPayouts.map((p) => p.amountMicro).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      paidTotalMicro = amounts.reduce((acc, a) => acc + a, 0n);
      const mid = Math.floor(amounts.length / 2);
      medianRedeemMicro = amounts.length % 2 !== 0 ? amounts[mid] : (amounts[mid - 1] + amounts[mid]) / 2n;
    }

    // Sybil / shared wallet signal: count other distinct userIds using the same wallet
    const sharedUsers = await db
      .select({ count: sql<number>`count(distinct ${redeemRequests.userId})` })
      .from(redeemRequests)
      .where(
        and(
          eq(sql`lower(${redeemRequests.wallet})`, input.wallet.toLowerCase()),
          ne(redeemRequests.userId, input.userId),
        ),
      );

    walletSharedWithOtherUsers = Number(sharedUsers[0]?.count ?? 0);
  } catch (err) {
    console.warn("[snapshot] Could not load user history from DB:", err);
  }

  // Format wallet address safely
  const formattedWallet: Address = isAddress(input.wallet)
    ? getAddress(input.wallet)
    : (input.wallet as Address);

  const snapshot: DecisionSnapshot = {
    asOf,
    network,
    vault,
    liability: {
      pointsOutstanding,
      microUsdcPerPoint,
      liabilityMicro,
      snapshotAgeSec,
    },
    solvency: {
      reserveRatio,
      avgDailyPayout7dMicro,
      runwayDays,
      pendingEscalationsMicro,
    },
    request: {
      redeemId: input.redeemId,
      userId: input.userId,
      wallet: formattedWallet,
      points: input.points,
      amountMicro: input.amountMicro,
      source: input.source,
    },
    user: {
      accountAgeDays,
      redeems24h,
      redeems7d,
      paidTotalMicro,
      medianRedeemMicro,
      pointsEarned7d: input.pointsEarned7d ?? null,
      walletSharedWithOtherUsers,
    },
  };

  if (!overrides) return snapshot;

  return {
    ...snapshot,
    ...overrides,
    vault: { ...snapshot.vault, ...overrides.vault },
    liability: { ...snapshot.liability, ...overrides.liability },
    solvency: { ...snapshot.solvency, ...overrides.solvency },
    request: { ...snapshot.request, ...overrides.request },
    user: { ...snapshot.user, ...overrides.user },
  };
}
