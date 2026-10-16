# 01: Product requirements

## Users
| Who | Need |
|---|---|
| **OWatch viewer** | Redeem points and receive USDC fast, see the status and the explorer link. |
| **OWatch owner** (Artomily + partner) | Never promise more than the treasury holds; stop micromanaging payouts; approve only what matters; see why every dollar moved. |
| **Content creator / editor** (P1) | Get paid soon after their video goes live, not at month end. |
| **Judge** | Click around a live dashboard and verify every payout on the Arc explorer. |

## Functional requirements

### P0
- **FR1 Vault.** A `LumbungVault` contract holds USDC on Arc, with budget categories `REWARD`, `CREATOR`, `OPS`, each with `perTxCap` and `dailyCap`, set by the owner. Agent can pay within caps; over-cap needs owner approval on-chain. Owner can pause.
- **FR2 Agent wallet.** A Circle developer-controlled wallet on `ARC-TESTNET` is the vault's `agent`. All agent transactions go through the Circle SDK with idempotency keys.
- **FR3 Redeem intake.** `POST /api/owatch/redeem` accepts HMAC-signed requests from OWatch, idempotent on `redeemId`.
- **FR4 Liability snapshot.** OWatch pushes `pointsOutstanding` + `microUsdcPerPoint` (`POST /api/owatch/snapshot`), or Lumbung pulls it.
- **FR5 Decision engine.** For each redeem: build snapshot → run hard rules → LLM picks from allowed actions with reasoning + risk score → execute. LLM failure ⇒ `HOLD`.
- **FR6 Escalation.** `ESCALATE` creates an on-chain approval request and pings the owner on Telegram with a dashboard link. The owner approves/rejects on-chain with a browser wallet.
- **FR7 Decision log.** Append-only record per decision: snapshot, rule results, allowed actions, chosen action, reasoning, risk score, `reasonHash`, Circle tx id, tx hash, final status, human verdict.
- **FR8 Status for OWatch.** `GET /api/owatch/redeem/:redeemId` returns status + tx hash + explorer URL. Optional callback to OWatch.
- **FR9 Dashboard (public, read-only):** vault balance, category budgets used today, liability and reserve ratio, decision feed with reasoning and explorer links, traction metrics. **Approvals page** requires the owner's wallet.

### P1
- **FR10 Tick.** `POST /api/agent/tick` (cron-secret protected): recompute reserve ratio and runway, re-evaluate `HELD` items, alert on low reserve, daily Telegram summary.
- **FR11 Creator payouts.** Owner submits a creator claim (video URL, creator wallet, amount); agent checks the video's view count from OWatch against a threshold; pays from `CREATOR` or holds.

## Non-functional
- Payout latency target: redeem → `CONFIRMED` in < 30 s on the happy path.
- Exactly-once payouts (see AGENTS.md rule 4).
- Everything reproducible from the repo + `.env.example`.

## Success metrics (these become the submission's traction answers)
| Metric | Source |
|---|---|
| Businesses operated | 1 (OWatch) + any other onboarded |
| Real users paid | distinct wallet addresses with `CONFIRMED` payouts from real OWatch redemptions |
| USDC moved | sum of confirmed payouts (+ creator payouts) |
| Decisions made vs escalated | `decisions` grouped by action |
| Human agreement rate | escalations where `human_verdict` matches the agent's recommendation |
| On-time payouts | % of PAY decisions confirmed < 60 s after request |
| Runway | reward-available / average daily payout (7d) |

**Simulated traffic (scripts/simulate-owatch.ts) is for development only and must be excluded from traction metrics** (flag `source = 'simulator'`).
