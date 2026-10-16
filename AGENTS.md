# AGENTS.md: rules for coding agents working on Lumbung

You are building **Lumbung**, an AI treasury agent that runs OWatch's money on Arc (Circle's stablecoin L1), for the Tameion Agents Hackathon (Canteen x Circle).

**Hard deadline: Oct 17, 2026, 11:59 PM ET (= Sunday Oct 18, 10:59 WIB).** Scope discipline beats polish. Ship P0 end-to-end before touching P1/P2.

## Read in this order before writing code
1. `docs/00-BRIEF.md`: what we are building and why (1 page)
2. `docs/08-TASKS.md`: the task graph. Pick tasks from here, respect `depends_on`, update status.
3. The spec for your lane:
   - Contracts → `docs/03-CONTRACT.md`
   - Agent / decision engine → `docs/04-AGENT.md`
   - API / OWatch integration → `docs/05-API.md`, `docs/11-OWATCH-INTEGRATION.md`
   - Database → `docs/06-DATA-MODEL.md`
   - Anything touching chain / Circle → `docs/07-ARC-CIRCLE-REFERENCE.md` (mandatory)
4. `docs/02-ARCHITECTURE.md` for how the pieces fit.

If a spec is ambiguous, choose the simplest option that keeps money safe, write the choice in `docs/DECISIONS-LOG.md` (create if missing, one line per decision), and continue. Do not block.

## Stack (do not change without a logged reason)
- `contracts/`: Solidity ^0.8.24, **Arc Foundry** (`arc-forge`, `arc-cast`, `arc-anvil`). Standard `anvil` does not reproduce Arc behavior.
- `web/`: Next.js 15 (App Router) + TypeScript (strict), API routes = backend. Tailwind for UI.
- Chain client: `viem` (`import { arcTestnet } from "viem/chains"`), `wagmi` for the owner-approval page.
- Circle: `@circle-fin/developer-controlled-wallets` (agent wallet + contract execution).
- DB: Postgres (Neon) + Drizzle ORM + drizzle-kit migrations.
- LLM: any OpenAI-compatible chat completions endpoint (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`). Use JSON output, validate with `zod`.
- Notifications: Telegram Bot API (plain `fetch`, no SDK needed).
- Package manager: `pnpm`. Deploy target: Vercel.

## Money-safety rules (non-negotiable)
1. **Testnet by default.** Never point anything at Arc mainnet unless `ARC_NETWORK=mainnet` is set explicitly by the human.
2. **Never commit secrets.** `.env*`, private keys, Circle entity secret, and Circle recovery files stay out of git. Never log them.
3. **Never register the Circle entity secret on the human's behalf.** Write the script; the human runs it.
4. **Exactly-once payouts, three layers:** OWatch `redeemId` is unique in DB → Circle `idempotencyKey` = decision UUID → contract rejects a reused `decisionKey`. Never "retry a payment" by creating a new decision for the same redeem. Retry = re-poll the same Circle transaction.
5. **The LLM never moves money directly.** Flow is always: hard rules → LLM chooses from `allowedActions` → executor → contract enforces caps. If the LLM fails, times out, or returns invalid JSON, the action is `HOLD`, never `PAY`.
6. **Amounts are integers in micro-USDC (6 decimals)** everywhere in DB, API, and contract calls (`1 USDC = 1_000_000`). Never use floats for money. Use the ERC-20 USDC interface only (never `msg.value` / native 18-decimal balances). See `docs/07`.
7. **Decision records are append-only.** Never UPDATE a decision's snapshot, reasoning, or action. Status changes go to `decision_events`.

## Arc gotchas (read `docs/07` for detail)
- USDC is the gas token. ERC-20 USDC at `0x3600000000000000000000000000000000000000` uses **6 decimals**; native balance uses 18. Do not mix.
- `maxFeePerGas` below 20 gwei is **silently dropped** by the mempool.
- Value transfer to `address(0)` reverts; blocklisted addresses revert at runtime (still consumes gas).
- Finality is instant (1 confirmation). `block.timestamp` is non-decreasing, not strictly increasing.

## Conventions
- TypeScript strict, no `any` in money paths. `bigint` for amounts in TS.
- Every API route validates input with `zod`.
- Env access only through `web/src/lib/env.ts` (zod-validated).
- Small commits: `feat(agent): ...`, `fix(contract): ...`, `docs: ...`.
- Tests: contract tests are required (P0). Web: test the rules engine and the HMAC verifier; skip UI tests.

## Definition of done (per task)
- Acceptance criteria in `docs/08-TASKS.md` are met and demonstrated (command output, tx hash, or screenshot path).
- No secrets in the diff. `pnpm lint && pnpm typecheck` pass for `web/`; `arc-forge test` passes for `contracts/`.
- Task status updated in `docs/08-TASKS.md` (`[ ]` → `[x]`), plus any new env var added to `.env.example`.

## Language
Code, comments, docs, and UI copy in **English** (judges read the repo). The OWatch-facing user status strings may have Indonesian variants.
