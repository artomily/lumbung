import {
  pgTable,
  uuid,
  text,
  bigint,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  bigserial,
  index,
} from "drizzle-orm/pg-core";

export const redeemRequests = pgTable(
  "redeem_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    redeemId: text("redeem_id").unique().notNull(),
    userId: text("user_id").notNull(),
    wallet: text("wallet").notNull(),
    points: bigint("points", { mode: "bigint" }).notNull(),
    amountMicro: bigint("amount_micro", { mode: "bigint" }).notNull(),
    accountCreatedAt: timestamp("account_created_at", { withTimezone: true }),
    pointsEarned7d: bigint("points_earned_7d", { mode: "bigint" }),
    source: text("source").notNull(), // 'owatch' | 'simulator'
    raw: jsonb("raw"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("redeem_requests_user_id_idx").on(table.userId),
    index("redeem_requests_wallet_idx").on(table.wallet),
  ],
);

export const creatorClaims = pgTable("creator_claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  claimId: text("claim_id").unique().notNull(),
  creatorName: text("creator_name").notNull(),
  wallet: text("wallet").notNull(),
  videoUrl: text("video_url").notNull(),
  videoId: text("video_id").notNull(),
  amountMicro: bigint("amount_micro", { mode: "bigint" }).notNull(),
  viewsAtCheck: integer("views_at_check"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const decisions = pgTable("decisions", {
  id: uuid("id").primaryKey(), // Circle idempotencyKey
  decisionKey: text("decision_key").unique().notNull(),
  subjectType: text("subject_type").notNull(), // 'redeem' | 'creator_claim'
  subjectId: uuid("subject_id").notNull(),
  supersedesDecisionId: uuid("supersedes_decision_id"),
  category: text("category").notNull(), // 'REWARD' | 'CREATOR' | 'OPS'
  toWallet: text("to_wallet").notNull(),
  amountMicro: bigint("amount_micro", { mode: "bigint" }).notNull(),
  action: text("action").notNull(), // 'PAY' | 'HOLD' | 'ESCALATE' | 'REJECT'
  reasoning: text("reasoning").notNull(),
  riskScore: real("risk_score"),
  factors: jsonb("factors").notNull(),
  allowedActions: jsonb("allowed_actions").notNull(),
  ruleResults: jsonb("rule_results").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  recommendationIfEscalated: text("recommendation_if_escalated"),
  holdUntilHint: text("hold_until_hint"),
  llmModel: text("llm_model").notNull(),
  reasonHash: text("reason_hash").notNull(),
  source: text("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const decisionEvents = pgTable(
  "decision_events",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => decisions.id),
    status: text("status").notNull(), // PROPOSED, SUBMITTED, CONFIRMED, FAILED, HELD, REJECTED, AWAITING_OWNER, OWNER_APPROVED, OWNER_REJECTED
    circleTxId: text("circle_tx_id"),
    txHash: text("tx_hash"),
    error: text("error"),
    data: jsonb("data"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("decision_events_decision_id_idx").on(table.decisionId)],
);

export const owatchSnapshots = pgTable("owatch_snapshots", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  pointsOutstanding: bigint("points_outstanding", { mode: "bigint" }).notNull(),
  microUsdcPerPoint: bigint("micro_usdc_per_point", { mode: "bigint" }).notNull(),
  activeUsers7d: integer("active_users_7d"),
  asOf: timestamp("as_of", { withTimezone: true }).notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
});

export const alerts = pgTable("alerts", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  kind: text("kind").notNull(), // 'LOW_RESERVE' | 'LOW_RUNWAY' | 'TX_FAILED' | 'ESCALATION'
  message: text("message").notNull(),
  data: jsonb("data"),
  sentTelegram: boolean("sent_telegram").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
