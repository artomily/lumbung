# Lumbung: one-page brief

## One line
**Lumbung is an AI treasurer that runs OWatch's money on Arc**: it makes sure there is always enough USDC to honor viewers' reward points, pays them instantly when they redeem, pays content creators, and asks a human only when a payment crosses a limit the agent cannot override, because the limit lives in a smart contract.

## The name
A *lumbung* is the Javanese/Indonesian village rice barn: the community reserve that is filled at harvest and opened carefully in lean season. *Tameion* is Greek for the treasury room. Same job, 2,000 km and 2,000 years apart; now run by an agent.

## The business (real, not synthetic)
**OWatch** is a live watch-to-earn platform for underpaid Indonesians: users watch videos, earn points, and redeem points for crypto rewards. Its money problems:
1. **Points are a liability.** Every point issued is a promise to pay. If outstanding points exceed what the treasury holds, the platform can't honor redemptions.
2. **Payouts are many and small.** Hundreds of sub-dollar payouts are exactly what Arc (≈$0.01 fees, sub-second finality) is built for.
3. **Content is the biggest cost.** Creators/editors must be paid, and spend should follow what actually earns attention.

## What Lumbung does (MVP loop, the RFB 04 workflow)
```
OWatch user taps "Redeem"
  → Lumbung receives the request (signed webhook)
  → reads live state: vault balance, per-category budgets (on-chain), outstanding points liability (OWatch)
  → hard rules decide which actions are allowed
  → LLM agent chooses PAY / HOLD / ESCALATE / REJECT and writes its reasoning
  → executor calls the LumbungVault contract via a Circle agent wallet
  → contract enforces per-tx and daily caps per category ("envelopes"); over-cap → on-chain approval request
  → human approves on-chain from the dashboard (Telegram ping)
  → every decision is logged with its inputs, reasoning, reasonHash, and tx hash
```

## Analogy cheat-sheet (for pitch & video)
| Village | OWatch / Lumbung |
|---|---|
| Rice coupons | Reward points |
| The barn | `LumbungVault` contract holding USDC |
| Rice sacks per purpose | Budget categories (REWARD / CREATOR / OPS) with on-chain caps |
| Barn keeper | AI agent (Circle developer-controlled wallet) |
| Village rules carved at the door | Caps in the contract: the keeper cannot talk past them |
| Village head's signature | Owner approval on-chain above the cap |
| The barn ledger | Append-only decision log, each entry hashed and referenced on-chain |

## Why this can win (judging: 30% agentic, 30% traction, 20% Circle tools, 20% innovation)
- **Agentic:** the agent decides pay vs hold vs escalate from live solvency (reserve ratio) and user behavior, explains why, and adapts when the barn runs low. It is not a cron job.
- **Traction:** real OWatch users redeeming → real payout count and USDC volume during the event.
- **Circle tools (load-bearing):** Circle Wallets (agent wallet, gas-sponsored SCA), USDC on Arc, smart contract for policy. Stretch: CCTP/Bridge Kit to move OWatch's existing Base funds to Arc; ERC-8004 agent identity.
- **Innovation:** treating loyalty points as a treasury liability with live solvency-aware payout policy; three-layer exactly-once payouts; reasoning hash committed on-chain per payment.

## Scope for the deadline
- **P0 (must ship):** vault contract + agent wallet + redeem flow end-to-end + rules/LLM decision + escalation + decision log + dashboard + real OWatch redemptions + video.
- **P1 (if time):** creator payouts, periodic tick with runway forecast and Telegram daily summary, metrics page polish.
- **P2 (roadmap in README only):** USYC yield on idle reserve (needs Circle allowlisting, 24–48h), CCTP top-up from Base, escrow per video milestone, bot/farm detection model, ERC-8004 registration.

## Non-goals
Rewriting OWatch. Lumbung is a separate service; OWatch changes are limited to two touch points (see `11-OWATCH-INTEGRATION.md`).
