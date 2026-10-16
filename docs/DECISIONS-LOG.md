# Decisions log

One line per non-obvious choice made during the build: `YYYY-MM-DD HH:MM · who · decision · why`.

- 2026-10-16 · planning · Envelopes are on-chain budget categories in one vault, not separate wallets · caps must live where the agent can't reach; simpler
- 2026-10-16 · planning · Owner = human browser wallet, not a Circle wallet · otherwise the server holds both keys and "limit the agent can't reach" is false
- 2026-10-16 · planning · USYC deferred to roadmap · requires Circle allowlisting (24–48 h), too slow for the deadline
- 2026-10-16 · planning · Testnet first, mainnet only by explicit human switch · safety + Arc mainnet available later
- 2026-10-16 11:26 · contracts worker · Installed Arc Foundry v0.8.0-2 to ~/.local/bin per docs/07 · native Arc foundry release available on circlefin/arc-foundry
- 2026-10-16 11:42 · web worker · Configured tsBuildInfoFile in tsconfig.json and FlatCompat in eslint.config.mjs for Next.js 15 App Router strict typechecking with BigInt literals
- 2026-10-16 12:35 · circle worker · Use fee level MEDIUM for Circle contract calls on Arc Testnet per docs/07, with 1.5s poll loop up to 25s budget · satisfies Arc's >=20 gwei requirement while keeping API latency bounded
- 2026-10-16 12:48 · dashboard worker · Connect wallet via wagmi connectors array from useConnect() to avoid webpack bundling @wagmi/connectors barrel (broken @x402 peer dep) · keeps bundle clean and typecheck green without extra deps
- 2026-10-16 14:40 · dashboard worker · Enforce vault address log filter in VerifyReasonHash and Arc testnet chain ID (50) check in ApprovalsClient · ensures cryptographic proofs reject third-party logs and approval actions execute strictly on Arc Testnet
- 2026-10-16 14:48 · agent worker · Handle network/5xx submission uncertainty as SUBMIT_UNKNOWN event and retry with same idempotencyKey, fail-closed on approval confirmation with contract address & Paid event check, and catch pg 23505 unique violation on concurrent redeem requests
- 2026-10-16 14:52 · simulator & readme worker · Enforce source: 'simulator' on all test payloads, block execution if ARC_NETWORK=mainnet, and format results in ASCII comparison table · guarantees synthetic test traffic is excluded from public stats and prevents accidental mainnet simulation

