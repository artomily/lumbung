# 07: Arc & Circle reference (verified Oct 16, 2026)

Sources: docs.arc.io (connect-to-arc, contract-addresses, evm-differences), developers.circle.com, github.com/circlefin/skills. Re-check addresses at https://docs.arc.io/arc/references/contract-addresses.md before mainnet.

## Networks
| | Arc Testnet | Arc Mainnet |
|---|---|---|
| Chain ID | `5042002` | `5042` |
| RPC | `https://rpc.testnet.arc.io` (WS `wss://rpc.testnet.arc.io`) | `https://rpc.mainnet.arc.io` |
| Explorer | `https://explorer.testnet.arc.io` | `https://explorer.arc.io` |
| viem chain | `arcTestnet` from `viem/chains` | `arc` from `viem/chains` |
| Circle Wallets blockchain id | `ARC-TESTNET` | check Circle docs before use |
| Faucet | https://faucet.circle.com (USDC, EURC; ~once per hour) | — |

## Token addresses
| Token | Testnet | Mainnet | Decimals |
|---|---|---|---|
| USDC (ERC-20 interface to native balance) | `0x3600000000000000000000000000000000000000` | same | **6** (native = 18) |
| EURC | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` | `0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1` | 6 |
| USYC | `0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C` | `0x8a5D989Bbb96929F689B0200f435f53dA42bF490` | 6 |
| USYC Teller | `0x9fdF14c5B14173D74C08Af27AebFf39240dC105A` | `0x51A8CE47dC08ba5CD19c7aa84EA6fD6664f60f9b` | — |

USYC needs **allowlisting via Circle Support (24–48 h)**, so it is roadmap (P2), not MVP.

## Other useful contracts (testnet)
- CCTP TokenMessengerV2 `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA`, MessageTransmitterV2 `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275` (domain 26)
- Gateway: GatewayWallet `0x0077777d7EBA4688BDeF3E311b846F25870A19B9`, GatewayMinter `0x0022222ABE238Cc2C7Bb1f21003F0a260052475B`
- ERC-8004 (agent identity): IdentityRegistry `0x8004A818BFB912233c491871b3d84c89A494BD9e`, ReputationRegistry `0x8004B663056A597Dffe9eCcC1965A193B7388713`, ValidationRegistry `0x8004Cb1BF31DAf7788923b405b754f57acEB4272` (stretch: register Lumbung's agent identity)
- Memo `0x5294E9927c3306DcBaDb03fe70b92e01cCede505` (attach memo metadata to calls)
- Multicall3 `0xcA11bde05977b3631167028862bE2a173976CA11`, Permit2 `0x000000000022D473030F116dDEE9F6B43aC78BA3`
- Blocklisted test address (for revert tests): `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`

## Arc runtime differences that bite
1. **USDC is the gas token.** Native balance 18 decimals; ERC-20 view 6 decimals; same underlying balance. Use the ERC-20 interface for all app logic. Never add native + ERC-20 balances. Divide native by 1e12 to display.
2. **`maxFeePerGas` < 20 gwei is silently dropped** (no error, never mined). Set ≥ 20 gwei explicitly in scripts.
3. **Value transfer to `address(0)` reverts.** Blocklisted sender/recipient reverts at runtime and still costs gas.
4. **Instant finality**: 1 confirmation is final.
5. **`block.timestamp` non-decreasing** (blocks can share a timestamp). Order by block number.
6. `PREVRANDAO` = 0: no on-chain randomness.
7. Use **Arc Foundry** (`arc-forge`, `arc-cast`, `arc-anvil --network arc`) since plain anvil doesn't emulate Arc. Install: https://docs.arc.io/arc/tutorials/install-arc-foundry.md

## Circle developer-controlled wallets
```bash
pnpm add @circle-fin/developer-controlled-wallets
```
```ts
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
const circle = initiateDeveloperControlledWalletsClient({
  apiKey: env.CIRCLE_API_KEY,
  entitySecret: env.CIRCLE_ENTITY_SECRET,
});

// one-time (scripts/circle-setup.ts, run by the HUMAN)
const ws = await circle.createWalletSet({ name: "Lumbung" });
const w = await circle.createWallets({
  walletSetId: ws.data!.walletSet!.id,
  blockchains: ["ARC-TESTNET"],
  accountType: "SCA",          // SCA on Arc Testnet: Circle Gas Station sponsors gas. Fallback: "EOA" funded with test USDC.
  count: 1,
});

// contract call (agent)
const tx = await circle.createContractExecutionTransaction({
  idempotencyKey: decisionId,  // uuid v4
  walletId: env.CIRCLE_AGENT_WALLET_ID,
  contractAddress: env.LUMBUNG_VAULT_ADDRESS,
  abiFunctionSignature: "pay(uint8,address,uint256,bytes32,bytes32)",
  abiParameters: ["0", to, amountMicro.toString(), decisionKey, reasonHash],
  fee: { type: "level", config: { feeLevel: "MEDIUM" } },
});
const id = tx.data?.id;

// poll
const t = await circle.getTransaction({ id });
// t.data.transaction.state: INITIATED → CLEARED → QUEUED → SENT → CONFIRMED → COMPLETE
// terminal: COMPLETE | FAILED | DENIED | CANCELLED ; STUCK = fee too low (cancel/accelerate)
// t.data.transaction.txHash when available
```
Notes:
- Entity secret: the **human** generates and registers it (https://developers.circle.com/wallets/dev-controlled/register-entity-secret). Recovery file stored outside the repo.
- `getWallet(s)` does **not** return balances. Read balances with viem (`usdc.balanceOf`) or the Circle token-balance endpoint.
- Webhooks (`X-Circle-Signature`) are better than polling, but polling is fine for MVP.
- Estimate fees with `estimateContractExecutionFee` if a tx is `STUCK`.

## Canteen tooling (optional)
- ARC CLI (Canteen-hosted testnet RPC + docs as agent context): `uv tool install git+https://github.com/the-canteen-dev/ARC-cli`
- Circle CLI: `npm install -g @circle-fin/cli` (agent wallets, x402, crosschain USDC)
- Circle skills for coding agents: `/plugin marketplace add circlefin/skills` then `/plugin install circle-skills@circle` (Claude Code). Recommended for the orchestrator's workers.

## Reference sample repos (fork/borrow freely)
- `circlefin/arc-fintech`: multichain treasury, rebalancing
- `circlefin/arc-escrow`: escrow with AI-validated deliverables (P2 creator milestones)
- `circlefin/arc-multichain-wallet`: unified balance + crosschain transfers (P2 top-up from Base)
- `circlefin/arc-nanopayments`: sub-cent gasless payments
