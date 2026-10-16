# 10: Submission checklist & answer drafts

Form: https://forms.gle/BBWrdfuircrKiG2i6 · Deadline Oct 17, 11:59 PM ET (Sun Oct 18, 10:59 WIB) · resubmission allowed: submit early.
Registration reminder: the Luma registration must have the correct GitHub and Discord handles (that's how submissions are collated).

## Required
- [ ] Public GitHub repo URL (README polished, no secrets: run `git log -p | grep -iE "secret|private_key|entity"` before making public)
- [ ] Video < 3 min (YouTube unlisted / Loom / Vimeo)
- [ ] Live product link (strongly encouraged): Vercel URL of the dashboard
- [ ] Traction answers (below), with numbers from `/api/public/stats` (simulator excluded)

## Judging map (what to point judges to)
| Criterion | Weight | Evidence |
|---|---|---|
| Agentic sophistication | 30% | Decision feed with PAY/HOLD/ESCALATE/REJECT + reasoning; solvency-aware behavior; escalation with agent recommendation vs human verdict |
| Traction | 30% | Real OWatch viewers paid, USDC moved, payouts/day chart, explorer links |
| Circle tools | 20% | Circle developer-controlled wallet (SCA, gas sponsored) as agent signer; USDC on Arc; policy contract on Arc (+ any stretch: CCTP, ERC-8004) |
| Innovation | 20% | Points-as-liability treasury; on-chain caps the agent can't talk past; reasonHash committed per payment; three-layer exactly-once payouts |

## Answer drafts (fill in the numbers)
**Project name:** Lumbung

**One-liner:** An AI treasurer that runs OWatch's money on Arc: it keeps reward points solvent, pays viewers in USDC within seconds, and escalates to a human only when an on-chain limit says so.

**What problem are you solving, and for whom?**
OWatch is a watch-to-earn platform for underpaid Indonesians. Every point it issues is a liability; payouts are many and tiny; and until now a person decided every payout by hand. Lumbung makes those decisions continuously against live solvency, enforces budgets in a contract, and leaves an auditable reason for every dollar.

**How many businesses have you onboarded?** `1 (OWatch, live)` + any others.

**How much value did the agent move?** `$__ USDC across __ payouts to __ unique viewers (Arc testnet|mainnet)` + creator payouts if any.

**What does the agent decide (vs automate)?** Whether to pay, hold, escalate or reject each redemption based on reserve ratio vs outstanding points liability, per-category budgets, user velocity and account signals; how to respond when reserves run low (throttle, request top-up); and what to recommend when it escalates. `__ decisions, __% paid autonomously, __ escalated, human agreed __%.`

**Circle tools used:** Circle Wallets (developer-controlled SCA agent wallet on ARC-TESTNET, contract execution with idempotency keys), USDC on Arc, smart contract policy vault. (Add CCTP / ERC-8004 if built.)

**What's next (are you continuing after the event?):** Yes. OWatch's whole payout flow moves to Arc mainnet; idle reserve into USYC; creator payments released per verified video milestone; OWatch's existing funds on other chains bridged via CCTP. Open to Canteen/Circle follow-on support.

**Was this started before Tameion?** OWatch existed before Tameion (on another chain — fill in). Lumbung was built entirely during Tameion; delta = the whole treasury agent + OWatch's move of payouts to Arc.
