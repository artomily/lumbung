import { sql } from "drizzle-orm";
import { type Address } from "viem";
import { env } from "@/lib/env";
import { db } from "@/lib/db/client";
import {
  getVaultSnapshot,
  getVaultOwner,
  getVaultAgent,
} from "@/lib/arc";

export type PublicStats = {
  network: string;
  configured: boolean;
  vault: {
    address: string | null;
    balanceMicro: string;
    remainingToday: {
      REWARD: string;
      CREATOR: string;
      OPS: string;
    };
  };
  solvency: {
    reserveRatio: number;
    runwayDays: number | null;
    liabilityMicro: string;
  };
  traction: {
    businesses: number;
    uniqueUsersPaid: number;
    payouts: number;
    usdcPaidMicro: string;
    decisions: {
      PAY: number;
      HOLD: number;
      ESCALATE: number;
      REJECT: number;
    };
    escalations: {
      total: number;
      approved: number;
      rejected: number;
      humanAgreedWithAgent: number;
    };
    onTimeRate: number;
  };
};

export type VaultInfo = {
  address: string | null;
  owner: string | null;
  agent: string | null;
  balanceMicro: bigint;
  remainingToday: {
    REWARD: bigint;
    CREATOR: bigint;
    OPS: bigint;
  };
  perTxCap: {
    REWARD: bigint;
    CREATOR: bigint;
    OPS: bigint;
  };
  paused: boolean;
  configured: boolean;
};

export type DecisionListItem = {
  id: string;
  decisionKey: string;
  subjectType: string;
  category: string;
  toWallet: string;
  amountMicro: string;
  action: "PAY" | "HOLD" | "ESCALATE" | "REJECT";
  status: string;
  reasoning: string;
  riskScore: number | null;
  txHash: string | null;
  source: string;
  createdAt: string;
};

export type DecisionDetail = {
  id: string;
  decisionKey: string;
  subjectType: string;
  subjectId: string;
  supersedesDecisionId: string | null;
  category: string;
  toWallet: string;
  amountMicro: string;
  action: "PAY" | "HOLD" | "ESCALATE" | "REJECT";
  reasoning: string;
  riskScore: number | null;
  factors: string[];
  allowedActions: string[];
  ruleResults: { id: string; passed: boolean; detail: string }[];
  snapshot: Record<string, unknown>;
  recommendationIfEscalated: string | null;
  holdUntilHint: string | null;
  llmModel: string;
  reasonHash: string;
  source: string;
  createdAt: string;
  currentStatus: string;
  txHash: string | null;
  events: {
    id: string;
    status: string;
    circleTxId: string | null;
    txHash: string | null;
    error: string | null;
    data: unknown;
    createdAt: string;
  }[];
};

export type PendingApprovalItem = {
  id: string;
  decisionKey: string;
  subjectType: string;
  category: string;
  toWallet: string;
  amountMicro: string;
  action: string;
  status: string;
  reasoning: string;
  riskScore: number | null;
  factors: string[];
  recommendationIfEscalated: "APPROVE" | "REJECT" | null;
  reasonHash: string;
  createdAt: string;
};

export type DailyPayoutStat = {
  day: string;
  count: number;
  totalMicro: string;
};

/**
 * Safely fetches on-chain vault information with fallback.
 */
export async function getVaultInfo(): Promise<VaultInfo> {
  const vaultAddress = (env.LUMBUNG_VAULT_ADDRESS || env.NEXT_PUBLIC_LUMBUNG_VAULT_ADDRESS) as Address | undefined;
  if (!vaultAddress) {
    return {
      address: null,
      owner: null,
      agent: null,
      balanceMicro: 0n,
      remainingToday: { REWARD: 0n, CREATOR: 0n, OPS: 0n },
      perTxCap: { REWARD: 5_000_000n, CREATOR: 25_000_000n, OPS: 10_000_000n },
      paused: false,
      configured: false,
    };
  }

  try {
    const [snapshot, owner, agent] = await Promise.all([
      getVaultSnapshot(vaultAddress),
      getVaultOwner(vaultAddress).catch(() => null),
      getVaultAgent(vaultAddress).catch(() => null),
    ]);

    return {
      address: vaultAddress,
      owner,
      agent,
      balanceMicro: snapshot.balanceMicro,
      remainingToday: snapshot.remainingToday,
      perTxCap: snapshot.perTxCap,
      paused: snapshot.paused,
      configured: true,
    };
  } catch (err) {
    console.warn("Failed to read vault on-chain:", err);
    return {
      address: vaultAddress,
      owner: null,
      agent: null,
      balanceMicro: 0n,
      remainingToday: { REWARD: 0n, CREATOR: 0n, OPS: 0n },
      perTxCap: { REWARD: 5_000_000n, CREATOR: 25_000_000n, OPS: 10_000_000n },
      paused: false,
      configured: false,
    };
  }
}

/**
 * Fetches public statistics for GET /api/public/stats and dashboard.
 * Excludes source='simulator'.
 */
export async function getPublicStats(): Promise<PublicStats> {
  const vaultInfo = await getVaultInfo();
  const network = env.ARC_NETWORK === "mainnet" ? "arc-mainnet" : "arc-testnet";

  const defaultStats: PublicStats = {
    network,
    configured: Boolean(env.DATABASE_URL),
    vault: {
      address: vaultInfo.address,
      balanceMicro: vaultInfo.balanceMicro.toString(),
      remainingToday: {
        REWARD: vaultInfo.remainingToday.REWARD.toString(),
        CREATOR: vaultInfo.remainingToday.CREATOR.toString(),
        OPS: vaultInfo.remainingToday.OPS.toString(),
      },
    },
    solvency: {
      reserveRatio: 0,
      runwayDays: null,
      liabilityMicro: "0",
    },
    traction: {
      businesses: 1,
      uniqueUsersPaid: 0,
      payouts: 0,
      usdcPaidMicro: "0",
      decisions: {
        PAY: 0,
        HOLD: 0,
        ESCALATE: 0,
        REJECT: 0,
      },
      escalations: {
        total: 0,
        approved: 0,
        rejected: 0,
        humanAgreedWithAgent: 0,
      },
      onTimeRate: 0.0,
    },
  };

  if (!env.DATABASE_URL) {
    return defaultStats;
  }

  try {
    // 1. Solvency: Latest OWatch snapshot for liability
    let liabilityMicro = 0n;
    const latestSnapshotRes = await db.execute(sql`
      SELECT points_outstanding, micro_usdc_per_point
      FROM owatch_snapshots
      ORDER BY received_at DESC
      LIMIT 1
    `);

    if (latestSnapshotRes && latestSnapshotRes.length > 0) {
      const row = latestSnapshotRes[0] as {
        points_outstanding: string | number | bigint;
        micro_usdc_per_point: string | number | bigint;
      };
      const pts = BigInt(row.points_outstanding || 0);
      const rate = BigInt(row.micro_usdc_per_point || 0);
      liabilityMicro = pts * rate;
    }

    let reserveRatio = 0;
    if (liabilityMicro > 0n) {
      reserveRatio = Number((Number(vaultInfo.balanceMicro) / Number(liabilityMicro)).toFixed(2));
    } else if (vaultInfo.balanceMicro > 0n) {
      reserveRatio = 999.0;
    }

    // 2. Traction queries excluding simulator
    const decisionsQuery = await db.execute(sql`
      WITH latest_events AS (
        SELECT DISTINCT ON (decision_id)
          decision_id, status, created_at, tx_hash
        FROM decision_events
        ORDER BY decision_id, created_at DESC
      )
      SELECT
        d.id,
        d.action,
        d.category,
        d.to_wallet,
        d.amount_micro::text AS amount_micro,
        d.recommendation_if_escalated,
        d.created_at AS decision_created_at,
        le.status,
        le.created_at AS confirmed_created_at,
        rr.created_at AS redeem_created_at
      FROM decisions d
      LEFT JOIN latest_events le ON le.decision_id = d.id
      LEFT JOIN redeem_requests rr ON rr.id = d.subject_id
      WHERE d.source != 'simulator'
    `);

    const uniqueUsersSet = new Set<string>();
    let payoutsCount = 0;
    let usdcPaidMicroSum = 0n;
    const decisionCounts = { PAY: 0, HOLD: 0, ESCALATE: 0, REJECT: 0 };
    const escalationCounts = {
      total: 0,
      approved: 0,
      rejected: 0,
      humanAgreedWithAgent: 0,
    };
    let onTimePayCount = 0;
    let totalPayConfirmedCount = 0;

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let payouts7dSum = 0n;

    for (const r of decisionsQuery as unknown as {
      id: string;
      action: "PAY" | "HOLD" | "ESCALATE" | "REJECT";
      category: string;
      to_wallet: string;
      amount_micro: string;
      recommendation_if_escalated: string | null;
      decision_created_at: string | Date;
      status: string | null;
      confirmed_created_at: string | Date | null;
      redeem_created_at: string | Date | null;
    }[]) {
      const action = r.action;
      if (action in decisionCounts) {
        decisionCounts[action]++;
      }

      const isConfirmed = r.status === "CONFIRMED";
      const isApproved = r.status === "OWNER_APPROVED" || isConfirmed;
      const isRejected = r.status === "OWNER_REJECTED";

      if (isConfirmed) {
        payoutsCount++;
        const amt = BigInt(r.amount_micro || "0");
        usdcPaidMicroSum += amt;

        if (r.category === "REWARD" && r.to_wallet) {
          uniqueUsersSet.add(r.to_wallet.toLowerCase());
        }

        const confTime = new Date(r.confirmed_created_at || r.decision_created_at).getTime();
        if (confTime >= sevenDaysAgo) {
          payouts7dSum += amt;
        }

        if (action === "PAY") {
          totalPayConfirmedCount++;
          const startTime = r.redeem_created_at
            ? new Date(r.redeem_created_at).getTime()
            : new Date(r.decision_created_at).getTime();
          if (confTime - startTime <= 60_000) {
            onTimePayCount++;
          }
        }
      }

      if (action === "ESCALATE") {
        escalationCounts.total++;
        if (isApproved) {
          escalationCounts.approved++;
          if (r.recommendation_if_escalated === "APPROVE") {
            escalationCounts.humanAgreedWithAgent++;
          }
        } else if (isRejected) {
          escalationCounts.rejected++;
          if (r.recommendation_if_escalated === "REJECT") {
            escalationCounts.humanAgreedWithAgent++;
          }
        }
      }
    }

    const avgDailyPayout7dMicro = payouts7dSum / 7n;
    let runwayDays: number | null = null;
    if (avgDailyPayout7dMicro > 0n) {
      runwayDays = Number((Number(vaultInfo.balanceMicro) / Number(avgDailyPayout7dMicro)).toFixed(1));
    }

    const onTimeRate =
      totalPayConfirmedCount > 0
        ? Number((onTimePayCount / totalPayConfirmedCount).toFixed(3))
        : 0.0;

    return {
      network,
      configured: true,
      vault: {
        address: vaultInfo.address,
        balanceMicro: vaultInfo.balanceMicro.toString(),
        remainingToday: {
          REWARD: vaultInfo.remainingToday.REWARD.toString(),
          CREATOR: vaultInfo.remainingToday.CREATOR.toString(),
          OPS: vaultInfo.remainingToday.OPS.toString(),
        },
      },
      solvency: {
        reserveRatio,
        runwayDays,
        liabilityMicro: liabilityMicro.toString(),
      },
      traction: {
        businesses: 1,
        uniqueUsersPaid: uniqueUsersSet.size,
        payouts: payoutsCount,
        usdcPaidMicro: usdcPaidMicroSum.toString(),
        decisions: decisionCounts,
        escalations: escalationCounts,
        onTimeRate,
      },
    };
  } catch (err) {
    console.warn("Failed to query public stats from database:", err);
    return defaultStats;
  }
}

/**
 * Fetches recent decisions for the feed.
 */
export async function getLatestDecisions(limit = 10): Promise<DecisionListItem[]> {
  if (!env.DATABASE_URL) {
    return [];
  }

  try {
    const rows = await db.execute(sql`
      WITH latest_events AS (
        SELECT DISTINCT ON (decision_id)
          decision_id, status, tx_hash, created_at
        FROM decision_events
        ORDER BY decision_id, created_at DESC
      )
      SELECT
        d.id,
        d.decision_key,
        d.subject_type,
        d.category,
        d.to_wallet,
        d.amount_micro::text AS amount_micro,
        d.action,
        COALESCE(le.status, 'PROPOSED') AS status,
        d.reasoning,
        d.risk_score,
        le.tx_hash,
        d.source,
        d.created_at::text AS created_at
      FROM decisions d
      LEFT JOIN latest_events le ON le.decision_id = d.id
      ORDER BY d.created_at DESC
      LIMIT ${limit}
    `);

    return (rows as unknown as DecisionListItem[]).map((r) => ({
      ...r,
      riskScore: r.riskScore != null ? Number(r.riskScore) : null,
    }));
  } catch (err) {
    console.warn("Failed to get latest decisions:", err);
    return [];
  }
}

/**
 * Fetches full details of a single decision by id or decisionKey.
 */
export async function getDecisionById(idOrKey: string): Promise<DecisionDetail | null> {
  if (!env.DATABASE_URL) {
    return null;
  }

  try {
    const isKey = idOrKey.startsWith("0x");
    const decisionRows = await db.execute(
      isKey
        ? sql`SELECT * FROM decisions WHERE decision_key = ${idOrKey} LIMIT 1`
        : sql`SELECT * FROM decisions WHERE id = ${idOrKey}::uuid LIMIT 1`
    );

    if (!decisionRows || decisionRows.length === 0) {
      return null;
    }

    const d = decisionRows[0] as unknown as {
      id: string;
      decision_key: string;
      subject_type: string;
      subject_id: string;
      supersedes_decision_id: string | null;
      category: string;
      to_wallet: string;
      amount_micro: string | bigint;
      action: "PAY" | "HOLD" | "ESCALATE" | "REJECT";
      reasoning: string;
      risk_score: number | null;
      factors: string[] | string;
      allowed_actions: string[] | string;
      rule_results: { id: string; passed: boolean; detail: string }[] | string;
      snapshot: Record<string, unknown> | string;
      recommendation_if_escalated: string | null;
      hold_until_hint: string | null;
      llm_model: string;
      reason_hash: string;
      source: string;
      created_at: string | Date;
    };

    const eventRows = await db.execute(sql`
      SELECT id::text, status, circle_tx_id, tx_hash, error, data, created_at::text
      FROM decision_events
      WHERE decision_id = ${d.id}::uuid
      ORDER BY created_at ASC
    `);

    const events = (eventRows as unknown as {
      id: string;
      status: string;
      circle_tx_id: string | null;
      tx_hash: string | null;
      error: string | null;
      data: unknown;
      created_at: string;
    }[]).map((e) => ({
      id: e.id,
      status: e.status,
      circleTxId: e.circle_tx_id,
      txHash: e.tx_hash,
      error: e.error,
      data: e.data,
      createdAt: e.created_at,
    }));

    const latestEvent = events.length > 0 ? events[events.length - 1] : null;

    const parseJsonField = <T>(val: unknown, fallback: T): T => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val) as T;
        } catch {
          return fallback;
        }
      }
      return (val as T) ?? fallback;
    };

    return {
      id: d.id,
      decisionKey: d.decision_key,
      subjectType: d.subject_type,
      subjectId: d.subject_id,
      supersedesDecisionId: d.supersedes_decision_id,
      category: d.category,
      toWallet: d.to_wallet,
      amountMicro: d.amount_micro.toString(),
      action: d.action,
      reasoning: d.reasoning,
      riskScore: d.risk_score != null ? Number(d.risk_score) : null,
      factors: parseJsonField<string[]>(d.factors, []),
      allowedActions: parseJsonField<string[]>(d.allowed_actions, []),
      ruleResults: parseJsonField<{ id: string; passed: boolean; detail: string }[]>(
        d.rule_results,
        []
      ),
      snapshot: parseJsonField<Record<string, unknown>>(d.snapshot, {}),
      recommendationIfEscalated: d.recommendation_if_escalated,
      holdUntilHint: d.hold_until_hint,
      llmModel: d.llm_model,
      reasonHash: d.reason_hash,
      source: d.source,
      createdAt: new Date(d.created_at).toISOString(),
      currentStatus: latestEvent?.status || "PROPOSED",
      txHash: latestEvent?.txHash || null,
      events,
    };
  } catch (err) {
    console.warn("Failed to get decision by id:", err);
    return null;
  }
}

/**
 * Fetches decisions that currently await owner approval (status = 'AWAITING_OWNER').
 */
export async function getPendingApprovals(): Promise<PendingApprovalItem[]> {
  if (!env.DATABASE_URL) {
    return [];
  }

  try {
    const rows = await db.execute(sql`
      WITH latest_events AS (
        SELECT DISTINCT ON (decision_id)
          decision_id, status, tx_hash, created_at
        FROM decision_events
        ORDER BY decision_id, created_at DESC
      )
      SELECT
        d.id,
        d.decision_key,
        d.subject_type,
        d.category,
        d.to_wallet,
        d.amount_micro::text AS amount_micro,
        d.action,
        le.status,
        d.reasoning,
        d.risk_score,
        d.factors,
        d.recommendation_if_escalated,
        d.reason_hash,
        d.created_at::text AS created_at
      FROM decisions d
      JOIN latest_events le ON le.decision_id = d.id
      WHERE le.status = 'AWAITING_OWNER'
      ORDER BY d.created_at DESC
    `);

    const parseJsonField = <T>(val: unknown, fallback: T): T => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val) as T;
        } catch {
          return fallback;
        }
      }
      return (val as T) ?? fallback;
    };

    return (rows as unknown as {
      id: string;
      decision_key: string;
      subject_type: string;
      category: string;
      to_wallet: string;
      amount_micro: string;
      action: string;
      status: string;
      reasoning: string;
      risk_score: number | null;
      factors: unknown;
      recommendation_if_escalated: "APPROVE" | "REJECT" | null;
      reason_hash: string;
      created_at: string;
    }[]).map((r) => ({
      id: r.id,
      decisionKey: r.decision_key,
      subjectType: r.subject_type,
      category: r.category,
      toWallet: r.to_wallet,
      amountMicro: r.amount_micro,
      action: r.action,
      status: r.status,
      reasoning: r.reasoning,
      riskScore: r.risk_score != null ? Number(r.risk_score) : null,
      factors: parseJsonField<string[]>(r.factors, []),
      recommendationIfEscalated: r.recommendation_if_escalated,
      reasonHash: r.reason_hash,
      createdAt: r.created_at,
    }));
  } catch (err) {
    console.warn("Failed to get pending approvals:", err);
    return [];
  }
}

/**
 * Fetches daily aggregated payouts for charts (excludes simulator).
 */
export async function getDailyPayoutStats(days = 14): Promise<DailyPayoutStat[]> {
  if (!env.DATABASE_URL) {
    return [];
  }

  try {
    const rows = await db.execute(sql`
      WITH latest_events AS (
        SELECT DISTINCT ON (decision_id)
          decision_id, status, created_at
        FROM decision_events
        ORDER BY decision_id, created_at DESC
      )
      SELECT
        TO_CHAR(d.created_at, 'YYYY-MM-DD') AS day,
        COUNT(*)::int AS count,
        SUM(d.amount_micro)::text AS total_micro
      FROM decisions d
      JOIN latest_events le ON le.decision_id = d.id
      WHERE le.status = 'CONFIRMED'
        AND d.source != 'simulator'
        AND d.created_at >= NOW() - (${days} || ' days')::interval
      GROUP BY TO_CHAR(d.created_at, 'YYYY-MM-DD')
      ORDER BY day ASC
    `);

    return (rows as unknown as { day: string; count: number; total_micro: string }[]).map(
      (r) => ({
        day: r.day,
        count: Number(r.count),
        totalMicro: r.total_micro || "0",
      })
    );
  } catch (err) {
    console.warn("Failed to get daily payout stats:", err);
    return [];
  }
}
