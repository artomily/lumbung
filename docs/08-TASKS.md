# 08: Task graph for the orchestrator

**Deadline:** Oct 17, 11:59 PM ET = **Sun Oct 18, 10:59 WIB**. Submit a first version by **Sat Oct 17 22:00 WIB** (the form accepts resubmissions).

Legend: `owner: agent` = coding agent can do it; `owner: HUMAN` = needs Artomily (accounts, secrets, partner, recording). Priority P0 = must ship, P1 = if time, P2 = README roadmap only.
Workers: mark `[x]` when done and paste proof (tx hash / command output / URL) under the task.

## Critical path
```
H1 ─┬─ B2 ─┐
H2 ─┤      ├─ A3 ─ D4 ─ C2 ─ F1(dev) ─ E1..E3 ─ H6 (real users) ─ G1 ─ H7 video ─ H8 submit
A1 ─ A2 ───┘        ▲
C1 ─ C3 ─ D1 ─ D2 ─ D3
```
Parallel lanes that can start immediately: **A (contracts)**, **C1/C3 (web scaffold + DB)**, **D2 (rules engine, pure)**, **H1–H5 (human setup)**.

---

## Lane H: Human setup (start NOW, Fri)
- [ ] **H1** Circle Developer Console: create account, API key (testnet), generate + register entity secret, store recovery file outside repo. Put `CIRCLE_API_KEY`, `CIRCLE_ENTITY_SECRET` in `web/.env.local`. *owner: HUMAN · P0*
- [ ] **H2** Wallets: choose `OWNER_ADDRESS` (your MetaMask/Rabby), add Arc Testnet (chain 5042002), get test USDC from faucet.circle.com for the owner and a deployer EOA (`DEPLOYER_PRIVATE_KEY`, local only). *HUMAN · P0*
- [ ] **H3** Neon Postgres project → `DATABASE_URL`. Vercel project linked to repo. *HUMAN · P0*
- [ ] **H4** Telegram: create bot via @BotFather → `TELEGRAM_BOT_TOKEN`; message the bot, get your chat id → `TELEGRAM_OWNER_CHAT_ID`. *HUMAN · P0*
- [ ] **H5** OWatch partner: confirm OK to route redemptions through Lumbung; agree testnet vs small real mainnet amounts; share how users enter a wallet address. *HUMAN · P0*
- [ ] **H6** Onboard real OWatch users to redeem (target ≥ 10 users, ≥ 30 payouts by Sat night). Post in OWatch community / WA group. *HUMAN · P0*
- [ ] **H7** Record < 3 min video using `09-DEMO-SCRIPT.md`; upload (YouTube unlisted/Loom). *HUMAN · P0*
- [ ] **H8** Submit form https://forms.gle/BBWrdfuircrKiG2i6 using `10-SUBMISSION.md`. Resubmit after updates. *HUMAN · P0*

## Lane A: Contracts
- [x] **A1** Scaffold `contracts/` with Arc Foundry; add OpenZeppelin; `foundry.toml` with Arc testnet RPC alias. *agent · P0 · deps: none*
  - AC: `arc-forge build` passes.
  - Proof:
    ```
    [⠑] Solc 0.8.24 finished in 609.66ms
    Compiler run successful!
    ```
- [x] **A2** Implement `LumbungVault.sol` + tests per `03-CONTRACT.md` (all 7 test groups). Mock 6-dec ERC-20 in tests. *agent · P0 · deps: A1*
  - AC: `arc-forge test` green; coverage of pay/approve/reject/caps/rollover/pause/zero-address.
  - Proof:
    ```
    Ran 17 tests for test/LumbungVault.t.sol:LumbungVaultTest
    [PASS] test_DepositAndWithdraw() (gas: 109633)
    [PASS] test_Group1_AgentPaysWithinCaps() (gas: 129846)
    [PASS] test_Group2_ReusedDecisionKeyAfterRejectReverts() (gas: 166514)
    [PASS] test_Group2_ReusedDecisionKeyReverts() (gas: 118473)
    [PASS] test_Group3_OverDailyCapReverts() (gas: 450926)
    [PASS] test_Group3_OverPerTxCapReverts() (gas: 31745)
    [PASS] test_Group3_RequestApprovalOverflow() (gas: 19626)
    [PASS] test_Group3_RolloverNextDaySucceeds() (gas: 486214)
    [PASS] test_Group4_NonAgentCannotPayOrRequestApproval() (gas: 37008)
    [PASS] test_Group4_NonOwnerCannotApproveSetBudgetWithdraw() (gas: 136454)
    [PASS] test_Group5_EscalationRequestAndApproveAboveCap() (gas: 249975)
    [PASS] test_Group5_EscalationRequestAndRejectPaysNothing() (gas: 179128)
    [PASS] test_Group5_RemainingTodayOverDailyCap() (gas: 190664)
    [PASS] test_Group6_PauseBlocksPayAndRequestApproval() (gas: 208711)
    [PASS] test_Group7_ZeroAddressReverts() (gas: 258694)
    [PASS] test_SetBudgetAndSetAgent() (gas: 145180)
    [PASS] test_ZeroAmountReverts() (gas: 53798)
    Suite result: ok. 17 passed; 0 failed; 0 skipped; finished in 12.42ms (24.96ms CPU time)
    Coverage: 97.75% lines, 97.94% statements, 90.91% branches, 100% functions
    ```
- [ ] **A3** `script/Deploy.s.sol` + `scripts/deploy.sh` → deploy to Arc testnet with `OWNER_ADDRESS` and `CIRCLE_AGENT_WALLET_ADDRESS`; write `contracts/deployments/arc-testnet.json`; export ABI to `web/src/lib/abi/LumbungVault.ts`. Set `maxFeePerGas ≥ 20 gwei`. *agent (human runs deploy if keys needed) · P0 · deps: A2, B2, H2*
  - AC: vault address on explorer; `owner()` and `agent()` correct.
  - Status: script ready, awaiting human deploy (`contracts/script/Deploy.s.sol` + `contracts/scripts/deploy.sh` with `maxFeePerGas >= 20 gwei` ready; ABI exported to `web/src/lib/abi/LumbungVault.ts`).
- [ ] **A4** Fund vault with test USDC (`scripts/fund-vault.ts` or MetaMask transfer to vault; prefer `deposit()` with `ref="seed"`). *HUMAN/agent · P0 · deps: A3*
  - AC: `balance()` > 0 on explorer.
  - Status: script ready, awaiting human fund (`contracts/scripts/fund-vault.sh` ready).

## Lane B: Circle
- [ ] **B1** `web/src/lib/circle.ts`: client init from env; `executeVaultCall(fn, params, idempotencyKey)`; `pollTx(id, budgetMs)` returning `{state, txHash, errorReason}`. *agent · P0 · deps: C1*
  - AC: unit-level smoke script `scripts/circle-smoke.ts` prints wallet info (no money moved).
  - Status: code complete, awaiting CIRCLE_API_KEY/entity secret (`src/lib/circle.ts` + `scripts/circle-smoke.ts` ready, unit tests green in `src/lib/circle.test.ts`).
- [ ] **B2** `scripts/circle-setup.ts`: create wallet set "Lumbung" + 1 SCA wallet on `ARC-TESTNET`; print `CIRCLE_WALLET_SET_ID`, `CIRCLE_AGENT_WALLET_ID`, `CIRCLE_AGENT_WALLET_ADDRESS`. Agent writes the script; **HUMAN runs it**. *P0 · deps: H1*
  - AC: wallet visible in Circle console; address recorded in `.env.local`.
  - Status: code complete, awaiting CIRCLE_API_KEY/entity secret (`scripts/circle-setup.ts` + `scripts/register-entity-secret.ts` ready).

## Lane C: Web / API
- [x] **C1** Scaffold `web/` (Next.js 15, TS strict, Tailwind, zod, viem, wagmi, drizzle). `src/lib/env.ts`, `src/lib/money.ts` (bigint helpers + format), `src/lib/canonical.ts`, `src/lib/arc.ts` (public client `arcTestnet`, vault reads). *agent · P0 · deps: none*
  - AC: `pnpm dev` runs; `pnpm typecheck` passes; `/api/health` returns vault address from env.
  - Proof: `pnpm typecheck` (tsc --noEmit) and `pnpm lint` pass clean; `pnpm build` generates static pages + dynamic `/api/health`; `curl http://localhost:3001/api/health` returns `{"status":"ok","network":"testnet","vaultAddress":null}`.
- [x] **C2** `POST /api/owatch/redeem` + `GET /api/owatch/redeem/:id` with HMAC (`src/lib/hmac.ts` + tests), idempotency, background decide via `after()`. *agent · P0 · deps: C1, C3, D3*
  - AC: replaying same `redeemId` returns same decision; bad signature 401; test vectors in `hmac.test.ts`.
  - Proof: `src/app/api/owatch/redeem/route.test.ts` (5/5 tests passing: 401 bad sig, 202 new request, 200 replay, 200 concurrent duplicate pg 23505, latest decision desc ordering) + `src/lib/hmac.test.ts` (11/11 tests passing including constant-time and 300s window).
- [ ] **C3** DB schema + migrations per `06-DATA-MODEL.md` incl. `decision_status` view and append-only trigger. *agent · P0 · deps: C1, H3*
  - AC: `pnpm db:migrate` applies cleanly on Neon.
  - Status: migration generated, awaiting DATABASE_URL (`drizzle/0000_natural_triton.sql` tables + `drizzle/0001_decision_status_and_triggers.sql` view & append-only trigger).
- [ ] **C4** `POST /api/owatch/snapshot`. *agent · P0 · deps: C3*
  - Status: code complete, awaiting DATABASE_URL (`src/app/api/owatch/snapshot/route.ts` implemented with zod validation, HMAC verification, inserts to `owatch_snapshots`).
- [ ] **C5** `POST /api/approvals/confirm` (verify receipt + `ApprovalResolved` event). *agent · P0 · deps: C3, A3*
  - Status: code complete, awaiting LUMBUNG_VAULT_ADDRESS / Arc testnet (`src/app/api/approvals/confirm/route.ts` implemented with fail-closed vault address check, receipt.to == vault verification, ApprovalResolved + Paid event checks; `src/app/api/approvals/confirm/route.test.ts` 5/5 tests passing).
- [x] **C6** `GET /api/public/stats` (exclude simulator). *agent · P0 · deps: C3*
  - AC: returns valid public stats JSON conforming to 05-API.md, excludes source=simulator, micro-USDC money strings.
  - Proof: `src/app/api/public/stats/route.test.ts` passed; `curl http://localhost:3100/api/public/stats` returned 200 with `{"network":"arc-testnet","configured":false,"vault":{"address":null,"balanceMicro":"0","remainingToday":{"REWARD":"0","CREATOR":"0","OPS":"0"}},"solvency":{"reserveRatio":0,"runwayDays":null,"liabilityMicro":"0"},"traction":{"businesses":1,"uniqueUsersPaid":0,"payouts":0,"usdcPaidMicro":"0","decisions":{"PAY":0,"HOLD":0,"ESCALATE":0,"REJECT":0},"escalations":{"total":0,"approved":0,"rejected":0,"humanAgreedWithAgent":0},"onTimeRate":0}}` (code complete, live data pending DATABASE_URL).
- [ ] **C7** `POST /api/agent/tick` + `src/agent/tick.ts`. *agent · P1 · deps: D4*
  - Status: code complete, awaiting CRON_SECRET / DATABASE_URL (`src/agent/tick.ts` + `src/app/api/agent/tick/route.ts` implemented with bearer auth, SUBMITTED & SUBMIT_UNKNOWN repoll, solvency alert, and re-decision of HELD items).
- [ ] **C8** `POST /api/creator/claims` + creator rule. *agent · P1 · deps: D4*
  - Status: code complete, awaiting DATABASE_URL (`src/app/api/creator/claims/route.ts` + `src/agent/creator.ts` implemented with zod validation, HMAC verification, CREATOR rule, and decisions log).

## Lane D: Agent
- [ ] **D1** `src/agent/snapshot.ts` (vault reads via viem, latest OWatch snapshot, user history queries). *agent · P0 · deps: C1, C3*
  - Status: code complete, awaiting DATABASE_URL / live vault (`src/agent/snapshot.ts` implemented with arcClient vault reads, latest OWatch snapshot, user history, reserveRatio 999 when liability 0).
- [x] **D2** `src/agent/rules.ts` + `policy.ts` + unit tests covering R1–R12 and the four demo scenarios in `04-AGENT.md`. Pure, no I/O. *agent · P0 · deps: none (use the types from 04)*
  - AC: `pnpm test rules` green.
  - Proof: `pnpm test` (vitest run) passed 43/43 tests (rules.test.ts covering R1-R12 pass/fail and all four demo scenarios 1, 2, 3, 4a, 4b; canonical.test.ts; money.test.ts; health/route.test.ts).
- [x] **D3** `src/agent/llm.ts` + `decide.ts`: prompt, zod schema, 12 s timeout, fallback HOLD, risk downgrade, reasonHash. *agent · P0 · deps: D1, D2*
  - AC: with `LLM_BASE_URL` unset → every decision is `HOLD`/rules-only, never `PAY`; with LLM → valid decisions logged.
  - Proof: `src/agent/decide.test.ts` (7/7 tests passing: proves NEVER PAY when LLM_BASE_URL is unset returning HOLD with rules-only, fallback HOLD on invalid JSON/timeout/out-of-bounds action, risk downgrade to ESCALATE/HOLD, canonical reasonHash & decisionKey).
- [ ] **D4** `src/agent/execute.ts`: PAY / ESCALATE via Circle, HOLD/REJECT locally, decision_events, Telegram (`src/lib/telegram.ts`), optional OWatch callback. *agent · P0 · deps: B1, D3, A3*
  - AC: one real testnet PAY end-to-end with tx hash in the log; one ESCALATE showing `ApprovalRequested` on explorer + Telegram message received.
  - Status: code complete, awaiting CIRCLE_API_KEY/entity secret (`src/agent/execute.ts` + `execute.test.ts` ready, 14/14 unit tests passing with mocked Circle/viem receipt verification, Telegram alert, signed HMAC callback, SUBMIT_UNKNOWN network recovery, and pre-submission error classification).

## Lane E: Dashboard (public, read-only except approvals)
- [x] **E1** Overview `/`: vault balance, 3 budget bars (used today / daily cap, per-tx cap), liability, reserve ratio gauge, runway, last 10 decisions. Network badge "Arc Testnet". *agent · P0 · deps: C6, D1*
  - AC: ReserveGauge, BudgetEnvelopeCard (REWARD/CREATOR/OPS), last 10 decisions table, Arc Testnet badge in Navbar, explorerUrl links, graceful "not configured" ConfigNotice.
  - Proof: `pnpm typecheck` and `pnpm lint` pass; `pnpm build` green; `curl http://localhost:3100/` → 200; code complete, live data pending DATABASE_URL/vault address.
- [x] **E2** `/decisions` feed + `/decisions/[id]`: action badge, reasoning, factors, rule table (pass/fail), snapshot JSON (collapsible), status timeline, explorer link, **"Verify reasonHash"** button (recompute canonical hash, compare with on-chain event). *agent · P0 · deps: D4*
  - AC: decisions feed table with ActionBadge/StatusBadge/CategoryBadge; detail page with VerifyReasonHash client component (client-side keccak256 + on-chain Paid/ApprovalRequested event fetch with strict vault address filter); rule table with PASS/FAIL; collapsible JSON snapshot; status event timeline.
  - Proof: `curl http://localhost:3100/decisions` → 200; `curl http://localhost:3100/decisions/00000000-0000-0000-0000-000000000000` → 404 (expected not-found when DB unconfigured); code complete, live data pending DATABASE_URL.
- [x] **E3** `/approvals`: list `AWAITING_OWNER`; wagmi injected connector; approve/reject → POST confirm. Show agent recommendation. Only enabled when connected address == `owner()`. *agent · P0 · deps: C5*
  - AC: ApprovalsClient.tsx uses wagmi `useWriteContract` + `usePublicClient.waitForTransactionReceipt`; calls `LumbungVault.approve(decisionKey)` or `reject(decisionKey)`; then POSTs `/api/approvals/confirm`; buttons disabled unless `connectedAddress == ownerAddress` and connected chain is Arc Testnet (`chainId === 50`).
  - Proof: `curl http://localhost:3100/approvals` → 200; code complete, live testing pending LUMBUNG_VAULT_ADDRESS + owner wallet.
- [x] **E4** `/metrics`: traction numbers from `/api/public/stats`, payouts-per-day chart. *agent · P1 · deps: C6*
  - AC: 5 traction stat cards; plain SVG PayoutsChart (no new deps, hover tooltips); AI decision breakdown bar chart; human-in-the-loop governance grid; ConfigNotice for missing env.
  - Proof: `curl http://localhost:3100/metrics` → 200; code complete, live data pending DATABASE_URL.

## Lane F: Integration & traction
- [ ] **F1** `scripts/simulate-owatch.ts` (DEV ONLY, `source: "simulator"`): sends signed snapshot + redeems for the 4 demo scenarios. *agent · P0 · deps: C2, C4*
  - AC: all 4 scenarios produce the expected actions on testnet.
  - Status: code complete, awaiting deployed env (`web/scripts/simulate-owatch.ts` implemented with HMAC payload signing, snapshot submission, 4 demo scenarios: normal PAY, 3x velocity HOLD/ESCALATE, over-cap ESCALATE, low-reserve PAY vs HOLD, and polling table; `web/scripts/simulate-owatch.test.ts` 7/7 tests pass; `pnpm simulate` without env exits non-zero with config error).
- [ ] **F2** OWatch patch per `11-OWATCH-INTEGRATION.md` (redeem call + status display + snapshot push + wallet field). *HUMAN or agent with OWatch repo access · P0 · deps: C2, C4, H5*
- [ ] **F3** Deploy `web/` to Vercel with env; set external cron (cron-job.org) to hit `/api/agent/tick` every 15 min (if C7 done). *HUMAN + agent · P0 · deps: C2, E1*

## Lane G: Submission assets
- [x] **G1** Final `README.md`: pitch, live link, architecture image, how it uses Circle/Arc, how to verify a payout (explorer + reasonHash), traction numbers, roadmap (P2), setup instructions. *agent · P0 · deps: most of P0*
  - AC: pitch, architecture diagram, Circle/Arc details, reasonHash verification instructions, traction section with TODO placeholders, P2 roadmap, and ordered human setup checklist (H1, B2, H2, H3, A3, A4, H4, LLM, F3, F1).
  - Proof: `README.md` at repo root created and verified; includes Mermaid architecture, 3-layer exactly-once payout guarantee, verification instructions, traction table, P2 roadmap, and step-by-step human setup checklist with exact script commands.
- [ ] **G2** Screenshots in `docs/img/` for README (dashboard, decision detail, approval, Telegram). *HUMAN/agent · P1*

## P2: roadmap only (do NOT build before deadline unless all P0 done)
USYC sweep of idle reserve (needs Circle allowlisting) · CCTP/Bridge Kit top-up from OWatch's Base funds · per-video escrow milestones (fork `circlefin/arc-escrow`) · ERC-8004 identity registration for the agent · farm/bot detection model · mainnet switch.

---

## Suggested schedule
| When (WIB) | Goal |
|---|---|
| Fri afternoon | H1–H5 started; A1–A2, C1, C3, D2 done |
| Fri night | B2 run, A3 deployed + funded, D1, D3, B1, D4 → **first real testnet PAY** |
| Sat morning | C2, C4, C5, C6, E1–E3, F1 all 4 scenarios pass; F3 deployed |
| Sat afternoon | F2 OWatch live; **H6 real users redeem** |
| Sat evening | G1 README, H7 video, **H8 first submission by 22:00** |
| Sun before 10:59 | Update traction numbers, resubmit |
