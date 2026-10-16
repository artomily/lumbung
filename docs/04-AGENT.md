# 04: Decision engine (the "barn keeper")

This is where the 30% "agentic sophistication" score is earned. The agent must **decide and explain**, not just forward requests. Three layers, in order:

```
snapshot → hard rules (pure TS) → LLM judgment (bounded) → executor → contract caps
```
Each layer can only narrow what the next one may do.

## 1. DecisionSnapshot (`src/agent/snapshot.ts`)
Built fresh for every decision. Stored verbatim in `decisions.snapshot`.
```ts
type DecisionSnapshot = {
  asOf: string;                       // ISO time
  network: "arc-testnet" | "arc-mainnet";
  vault: {
    balanceMicro: bigint;             // usdc.balanceOf(vault)
    remainingToday: { REWARD: bigint; CREATOR: bigint; OPS: bigint };
    perTxCap:       { REWARD: bigint; CREATOR: bigint; OPS: bigint };
    paused: boolean;
  };
  liability: {
    pointsOutstanding: bigint;        // latest OWatch snapshot
    microUsdcPerPoint: bigint;
    liabilityMicro: bigint;           // points * rate
    snapshotAgeSec: number;
  };
  solvency: {
    reserveRatio: number;             // balanceMicro / liabilityMicro (∞ → 999 if liability 0)
    avgDailyPayout7dMicro: bigint;    // from decisions (CONFIRMED PAY, last 7d)
    runwayDays: number | null;        // balance / avgDaily
    pendingEscalationsMicro: bigint;  // open approval requests
  };
  request: {                          // for redeem decisions
    redeemId: string; userId: string; wallet: `0x${string}`;
    points: bigint; amountMicro: bigint; source: "owatch" | "simulator";
  };
  user: {
    accountAgeDays: number | null;
    redeems24h: number; redeems7d: number;
    paidTotalMicro: bigint;
    medianRedeemMicro: bigint | null;
    pointsEarned7d: bigint | null;    // from OWatch if provided
    walletSharedWithOtherUsers: number; // count of other userIds that redeemed to same wallet
  };
};
```

## 2. Hard rules (`src/agent/rules.ts`, pure function, unit-tested)
Input: snapshot. Output: `{ allowedActions: Action[], ruleResults: RuleResult[], forced?: Action }`.
`Action = "PAY" | "HOLD" | "ESCALATE" | "REJECT"`.

Evaluate all rules, record each result (`id`, `passed`, `detail`) so the log shows *why*.

| id | Condition | Effect |
|---|---|---|
| R1_valid_wallet | wallet is a checksummed non-zero address | fail → forced `REJECT` |
| R2_amount_matches_points | `amountMicro == points * microUsdcPerPoint` (±0) | fail → forced `REJECT` |
| R3_vault_paused | vault paused | → forced `HOLD` |
| R4_liability_fresh | `snapshotAgeSec ≤ 3600` | fail → remove `PAY` (stale view of liability) |
| R5_within_per_tx | `amountMicro ≤ perTxCap.REWARD` | fail → remove `PAY`, keep `ESCALATE` |
| R6_within_daily | `amountMicro ≤ remainingToday.REWARD` | fail → remove `PAY`, keep `ESCALATE`/`HOLD` |
| R7_balance | `amountMicro ≤ balanceMicro - pendingEscalationsMicro` | fail → remove `PAY`/`ESCALATE`, forced `HOLD` + low-funds alert |
| R8_solvency_critical | `reserveRatio < 0.5` | remove `PAY` |
| R9_solvency_low | `0.5 ≤ reserveRatio < 1.0` | `PAY` allowed only if `amountMicro ≤ 1 USDC`, else remove `PAY` |
| R10_velocity | `redeems24h ≥ 3` | remove `PAY` (keep `HOLD`, `ESCALATE`) |
| R11_new_account_big | `accountAgeDays < 1 && amountMicro > 1 USDC` | remove `PAY` |
| R12_shared_wallet | `walletSharedWithOtherUsers ≥ 2` | remove `PAY` |

Base set before removals: `{PAY, HOLD, ESCALATE, REJECT}`. `REJECT` is only kept when R1 or R2 failed (the agent must not reject legitimate users on a hunch; it holds or escalates instead). If nothing remains, `HOLD`.

Thresholds live in `src/agent/policy.ts` as constants (and are shown on the dashboard).

## 3. LLM judgment (`src/agent/llm.ts`)
Only called if `allowedActions.length > 1` and no `forced` action. Timeout 12 s. Temperature 0.

**System prompt (keep in code as a constant):**
```
You are Lumbung, the treasurer agent for OWatch, a watch-to-earn platform in Indonesia.
Your duties, in order: (1) never let the treasury become unable to honor viewers' points,
(2) pay legitimate viewers quickly, (3) protect the treasury from farming and abuse,
(4) escalate to the human owner only when it truly needs a human.
You will receive a JSON snapshot of the treasury, the liability from outstanding points,
the user's history, the hard-rule results, and the list of allowed actions.
Choose exactly ONE action from allowedActions. Prefer PAY for normal users when solvency is healthy.
Prefer HOLD when the issue may resolve on its own (e.g., top-up expected, daily cap resets).
Prefer ESCALATE when a human judgment is needed (unusual but plausibly legitimate).
Reply with JSON only, matching the schema. reasoning: max 3 sentences, plain English, cite the numbers you used.
recommendationIfEscalated: what you would do if you had the authority.
```
**User message:** `JSON.stringify({ snapshot, ruleResults, allowedActions }, bigintToString)`.

**Output schema (zod):**
```ts
const LlmDecision = z.object({
  action: z.enum(["PAY", "HOLD", "ESCALATE", "REJECT"]),
  reasoning: z.string().min(10).max(600),
  riskScore: z.number().min(0).max(1),
  factors: z.array(z.string()).max(6),          // e.g. ["reserveRatio=1.8 healthy", "first redeem"]
  recommendationIfEscalated: z.enum(["APPROVE", "REJECT"]).optional(),
  holdUntilHint: z.enum(["next_tick", "daily_reset", "top_up", "owner"]).optional(),
});
```
**Validation:** if parse fails, the call times out, or `action ∉ allowedActions` → final action `HOLD` with reasoning `"LLM unavailable or out-of-policy; held for safety"` and `llmModel = "fallback"`.

**Post-rule:** if `riskScore ≥ 0.7` and action is `PAY` → downgrade to `ESCALATE` (if allowed) else `HOLD`. Record the downgrade in `factors`.

## 4. Decision record
```ts
type Decision = {
  id: string;                 // uuid v4 (also Circle idempotencyKey)
  decisionKey: `0x${string}`; // keccak256(toBytes(id))
  subjectType: "redeem" | "creator_claim";
  subjectId: string;
  category: "REWARD" | "CREATOR" | "OPS";
  amountMicro: bigint;
  to: `0x${string}`;
  action: Action;
  reasoning: string;
  riskScore: number | null;
  factors: string[];
  allowedActions: Action[];
  ruleResults: RuleResult[];
  snapshot: DecisionSnapshot;
  recommendationIfEscalated?: "APPROVE" | "REJECT";
  llmModel: string;           // or "fallback" / "rules-only"
  reasonHash: `0x${string}`;  // keccak256(canonicalJson({snapshot, ruleResults, action, reasoning}))
};
```
Canonical JSON: sorted keys, bigint as decimal strings, no whitespace. Put the implementation in `src/lib/canonical.ts` and expose a "verify" button on the decision page that recomputes the hash client-side and compares with the on-chain `reasonHash` from the `Paid`/`ApprovalRequested` event.

## 5. Executor (`src/agent/execute.ts`)
| Action | On-chain | DB events | Notify |
|---|---|---|---|
| PAY | `pay(...)` via Circle | `SUBMITTED` → `CONFIRMED` / `FAILED` | callback OWatch |
| ESCALATE | `requestApproval(...)` via Circle | `SUBMITTED` → `AWAITING_OWNER` | Telegram to owner |
| HOLD | none | `HELD` (with `holdUntilHint`) | Telegram only if amount ≥ 1 USDC |
| REJECT | none | `REJECTED` | callback OWatch |

Polling: `getTransaction({ id })` every 1.5 s until `COMPLETE | FAILED | DENIED | CANCELLED` (max ~25 s in-request; the rest via tick/status GET). On `COMPLETE` store `txHash`, then verify the `Paid` event via viem before marking `CONFIRMED`.
If the contract reverts (e.g., `OverDailyCap` because two decisions raced), mark `FAILED` with the decoded error and re-decide **as a new decision only for HOLD/ESCALATE**, never re-PAY automatically in the same request.

## 6. Tick (P1, `src/agent/tick.ts`)
Every 15 min (external cron hitting `/api/agent/tick` with `CRON_SECRET`, or a "Run tick" button for the demo):
1. Re-poll unfinished Circle txs.
2. Recompute solvency; if `reserveRatio < 1` or `runwayDays < 3` → Telegram alert with suggested top-up = `liabilityMicro - balanceMicro` (+ 20% buffer).
3. Re-decide `HELD` items whose `holdUntilHint` is now satisfied (new decision, same subject; the old one stays in the log).
4. Once per day (first tick after 08:00 WIB): Telegram summary (paid count, USDC moved, escalations, agreement rate, runway).

## Demo scenarios to make sure the agent visibly *decides* (seed these in the video)
1. Normal viewer, healthy reserve → **PAY** in seconds.
2. Same viewer redeems 3× in an hour → **HOLD/ESCALATE** with velocity reasoning.
3. Amount above per-tx cap → **ESCALATE** → owner approves on-chain → paid.
4. Owner lowers vault balance (withdraw) so reserveRatio < 1 → small redeem PAYS, larger one HOLDS with "top_up" hint; Telegram low-reserve alert. After top-up, tick pays the held one.
