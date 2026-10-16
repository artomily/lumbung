# 06: Data model (Postgres + Drizzle)

Amounts: `bigint` columns (`mode: "bigint"` in Drizzle) holding micro-USDC. Timestamps `timestamptz` default `now()`.

## Tables

### `redeem_requests`
| col | type | notes |
|---|---|---|
| id | uuid pk | |
| redeem_id | text **unique** | OWatch id (idempotency layer 1) |
| user_id | text | index |
| wallet | text | lowercase hex; index |
| points | bigint | |
| amount_micro | bigint | |
| account_created_at | timestamptz null | |
| points_earned_7d | bigint null | |
| source | text | `owatch` \| `simulator` |
| raw | jsonb | original body |
| created_at | timestamptz | |

### `creator_claims` (P1)
id uuid pk, claim_id text unique, creator_name, wallet, video_url, video_id, amount_micro bigint, views_at_check int null, created_at.

### `decisions` (append-only, never UPDATE)
| col | type |
|---|---|
| id | uuid pk (= Circle idempotencyKey) |
| decision_key | text unique (0x…32 bytes) |
| subject_type | text (`redeem` \| `creator_claim`) |
| subject_id | uuid (fk to the request row) |
| supersedes_decision_id | uuid null (re-decide after HOLD) |
| category | text (`REWARD` \| `CREATOR` \| `OPS`) |
| to_wallet | text |
| amount_micro | bigint |
| action | text (`PAY` \| `HOLD` \| `ESCALATE` \| `REJECT`) |
| reasoning | text |
| risk_score | real null |
| factors | jsonb |
| allowed_actions | jsonb |
| rule_results | jsonb |
| snapshot | jsonb (bigints as strings) |
| recommendation_if_escalated | text null |
| hold_until_hint | text null |
| llm_model | text |
| reason_hash | text |
| source | text (copied from subject, for metric filtering) |
| created_at | timestamptz |

Enforce append-only: no update/delete in code; optionally a Postgres trigger that raises on UPDATE/DELETE of `decisions`.

### `decision_events` (append-only status history)
| col | type |
|---|---|
| id | bigserial pk |
| decision_id | uuid fk, index |
| status | text: `PROPOSED, SUBMITTED, CONFIRMED, FAILED, HELD, REJECTED, AWAITING_OWNER, OWNER_APPROVED, OWNER_REJECTED` |
| circle_tx_id | text null |
| tx_hash | text null |
| error | text null (decoded revert / Circle error) |
| data | jsonb null |
| created_at | timestamptz |

Current status of a decision = latest event. Create a SQL view `decision_status` (`DISTINCT ON (decision_id) ... ORDER BY created_at DESC`).

### `owatch_snapshots` (append-only)
id bigserial, points_outstanding bigint, micro_usdc_per_point bigint, active_users_7d int null, as_of timestamptz, received_at timestamptz.

### `alerts`
id bigserial, kind text (`LOW_RESERVE`, `LOW_RUNWAY`, `TX_FAILED`, `ESCALATION`), message text, data jsonb, sent_telegram bool, created_at.

## Redeem status mapping (for OWatch)
Latest decision for the redeem + its latest event:
| decision.action | latest event | OWatch status |
|---|---|---|
| any | none / PROPOSED / SUBMITTED (PAY) | `PENDING` |
| PAY | CONFIRMED | `PAID` |
| PAY | FAILED | `FAILED` |
| ESCALATE | AWAITING_OWNER | `AWAITING_OWNER` |
| ESCALATE | OWNER_APPROVED / CONFIRMED | `PAID` |
| ESCALATE | OWNER_REJECTED | `REJECTED` |
| HOLD | HELD | `HELD` |
| REJECT | REJECTED | `REJECTED` |

## Metric queries (exclude `source='simulator'`)
- uniqueUsersPaid: `count(distinct to_wallet)` where status `CONFIRMED` and category `REWARD`.
- usdcPaidMicro: sum `amount_micro` where `CONFIRMED`.
- onTimeRate: share of `PAY` decisions where `CONFIRMED.created_at - redeem.created_at < 60s`.
- humanAgreedWithAgent: escalations where (`OWNER_APPROVED` and recommendation `APPROVE`) or (`OWNER_REJECTED` and recommendation `REJECT`).
