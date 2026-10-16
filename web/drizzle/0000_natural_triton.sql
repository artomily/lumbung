CREATE TABLE "alerts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"sent_telegram" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" text NOT NULL,
	"creator_name" text NOT NULL,
	"wallet" text NOT NULL,
	"video_url" text NOT NULL,
	"video_id" text NOT NULL,
	"amount_micro" bigint NOT NULL,
	"views_at_check" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "creator_claims_claim_id_unique" UNIQUE("claim_id")
);
--> statement-breakpoint
CREATE TABLE "decision_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"decision_id" uuid NOT NULL,
	"status" text NOT NULL,
	"circle_tx_id" text,
	"tx_hash" text,
	"error" text,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"decision_key" text NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"supersedes_decision_id" uuid,
	"category" text NOT NULL,
	"to_wallet" text NOT NULL,
	"amount_micro" bigint NOT NULL,
	"action" text NOT NULL,
	"reasoning" text NOT NULL,
	"risk_score" real,
	"factors" jsonb NOT NULL,
	"allowed_actions" jsonb NOT NULL,
	"rule_results" jsonb NOT NULL,
	"snapshot" jsonb NOT NULL,
	"recommendation_if_escalated" text,
	"hold_until_hint" text,
	"llm_model" text NOT NULL,
	"reason_hash" text NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "decisions_decision_key_unique" UNIQUE("decision_key")
);
--> statement-breakpoint
CREATE TABLE "owatch_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"points_outstanding" bigint NOT NULL,
	"micro_usdc_per_point" bigint NOT NULL,
	"active_users_7d" integer,
	"as_of" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redeem_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"redeem_id" text NOT NULL,
	"user_id" text NOT NULL,
	"wallet" text NOT NULL,
	"points" bigint NOT NULL,
	"amount_micro" bigint NOT NULL,
	"account_created_at" timestamp with time zone,
	"points_earned_7d" bigint,
	"source" text NOT NULL,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redeem_requests_redeem_id_unique" UNIQUE("redeem_id")
);
--> statement-breakpoint
ALTER TABLE "decision_events" ADD CONSTRAINT "decision_events_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "decision_events_decision_id_idx" ON "decision_events" USING btree ("decision_id");--> statement-breakpoint
CREATE INDEX "redeem_requests_user_id_idx" ON "redeem_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "redeem_requests_wallet_idx" ON "redeem_requests" USING btree ("wallet");