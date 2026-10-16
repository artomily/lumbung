# Tameion form: short answers

**Email:** vararakya@gmail.com
**Project Name:** Lumbung
**Github:** artomily
**Discord:** [TODO]
**Telegram:** [TODO]
**X:** [TODO, optional]
**Team:** 1 (Solo) · Rakyavara Artomily
**Previous Canteen x Arc hackathons:** [TODO: artomily / None]

**Continued project?**
OWatch (watch-to-earn for Indonesian viewers) has been in development since [TODO]. Lumbung is new, built entirely during Tameion: an AI treasury agent that moves OWatch's payouts to USDC on Arc, with on-chain spending limits and human approval for large payouts.

**Problem Statement:**
OWatch's reward points are promises to pay. Payouts are many and tiny, and each one was approved by hand with no live view of solvency. Paying instantly is risky; paying manually doesn't scale.

**Project Description:**
For each redemption, the agent checks live solvency, budgets and user velocity. It then decides PAY, HOLD, ESCALATE or REJECT and explains why. Payments go through a Circle developer-controlled wallet into a policy vault on Arc that enforces caps the agent can't override. Over-cap payments need the owner's on-chain approval, triggered by a Telegram ping. Each decision's reasonHash is stored on-chain for verification.
Tech: Solidity/Foundry, Circle Wallets, USDC on Arc, Next.js, viem, Neon Postgres, Telegram.

**Traction:**
[TODO] real OWatch viewers paid, [TODO] payouts, [TODO] USDC moved on Arc. [TODO] decisions, [TODO]% paid autonomously.

**Source Code:** [TODO: https://github.com/artomily/lumbung]
**Diff:** [TODO: Lumbung is new, so link the repo itself]
**Live:** [TODO: Vercel URL]
**Video:** [TODO: YouTube/Loom link]

**Arc OSS:** Yes
**Why:** Reusable building blocks for safe agent payments on Arc: a policy vault with budgets, caps and approvals; on-chain reasonHash audit trail; exactly-once payout helpers for Circle Wallets; hard rules + LLM decision engine.

**Circle / Arc Feedback:**
Good: USDC as gas, fast finality, gas-sponsored SCA wallets. Improve: [TODO, e.g. entity secret setup docs, more Arc contract-execution examples].

**Quick call:** [TODO: Yes/No]
**General Feedback:** [TODO]
