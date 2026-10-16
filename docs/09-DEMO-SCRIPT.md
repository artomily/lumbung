# 09: Demo video script (< 3 minutes)

Judges review asynchronously, so the video must stand alone. Record screen + voice. Keep the live dashboard and Arc explorer open in tabs. Rehearse once with the simulator, then record using **real OWatch redemptions** wherever possible.

| Time | Screen | Voice-over (EN, adapt freely) |
|---|---|---|
| 0:00–0:15 | OWatch app, a viewer earning points | "OWatch pays underpaid Indonesians to watch videos. Every point we hand out is a promise to pay. Lumbung is the AI treasurer that keeps those promises, on Arc." |
| 0:15–0:30 | Lumbung overview: balance, liability, reserve ratio, budget bars | "Lumbung watches the treasury against the liability of all outstanding points. Reserve ratio 1.8, runway 12 days. Budgets per category are enforced by a contract the agent can't override." |
| 0:30–0:55 | Viewer taps Redeem → decision appears → PAID in seconds → explorer tx | "A viewer redeems. The agent reads live state, the hard rules allow PAY, the agent explains why, and the Circle agent wallet pays through the vault. Under a second on Arc, about one cent." |
| 0:55–1:20 | Decision detail: rules table, reasoning, Verify reasonHash ✓ | "Every decision is logged with its inputs and reasoning, and its hash is written on-chain with the payment. Anyone can verify the reasoning wasn't edited afterwards." |
| 1:20–1:45 | Same user redeems repeatedly → HOLD/ESCALATE with velocity reasoning | "When something looks off, like three redeems in an hour, the agent doesn't blindly pay or reject. It holds or escalates, and says why." |
| 1:45–2:15 | Over-cap redeem → Telegram ping → owner approves on-chain in /app/approvals → paid | "Above the cap, the agent can only request approval on-chain. I get a Telegram ping, approve from my own wallet, and the vault pays. The human only sees what needs a human." |
| 2:15–2:35 | Low reserve: small redeem paid, larger held with top-up hint; Telegram low-reserve alert | "If the barn runs low, the agent adapts: small payouts continue, larger ones wait, and it tells me how much to top up." |
| 2:35–2:55 | /app/metrics: real users paid, USDC moved, decisions vs escalations, agreement rate | "Since launch during Tameion: X real viewers paid, Y USDC moved, Z decisions, and I agreed with the agent's recommendation N% of the time." |
| 2:55–3:00 | Logo + "Lumbung: the village barn, run by an agent" | — |

Checklist before recording: vault funded, Telegram bot working, owner wallet on Arc Testnet, at least 1 escalation pending, metrics excluding simulator traffic.
