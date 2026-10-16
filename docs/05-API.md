# 05: API spec

Base: `APP_URL` (Vercel). All bodies JSON. All money fields are **strings of integer micro-USDC** (e.g. `"250000"` = 0.25 USDC). Validate everything with `zod`.

## Auth
### OWatch → Lumbung (server-to-server)
Headers:
- `X-Lumbung-Timestamp`: unix seconds
- `X-Lumbung-Signature`: `hex(HMAC_SHA256(OWATCH_WEBHOOK_SECRET, timestamp + "." + rawBody))`

Reject if signature mismatch (constant-time compare) or `|now - timestamp| > 300`. Read the **raw** body before JSON parsing.

### Cron → Lumbung
`Authorization: Bearer ${CRON_SECRET}`.

### Owner actions
On-chain via the owner's wallet; the server only verifies receipts. No passwords.

---

## POST `/api/owatch/redeem`
OWatch calls this when a viewer taps "Redeem".
```json
{
  "redeemId": "owr_01HZX...",          // OWatch's unique id; idempotency key
  "userId": "u_123",
  "wallet": "0xAbC...",                 // viewer's EVM address (same address works on Base and Arc)
  "points": "500",
  "amountMicro": "250000",              // must equal points * microUsdcPerPoint
  "user": {                             // optional but improves decisions
    "accountCreatedAt": "2026-09-30T10:00:00Z",
    "pointsEarned7d": "1200"
  },
  "source": "owatch"                    // "simulator" only from scripts/simulate-owatch.ts
}
```
Responses:
- `202 {"decisionId": "...", "status": "PENDING"}` new request accepted; decision runs in background (`after()`).
- `200 {...current status}` same `redeemId` already exists (idempotent replay).
- `401` bad signature; `422` validation error.

## GET `/api/owatch/redeem/:redeemId`
HMAC-signed GET (sign `timestamp + "." + redeemId`). Returns:
```json
{
  "redeemId": "owr_01HZX...",
  "status": "PENDING | PAID | HELD | AWAITING_OWNER | REJECTED | FAILED",
  "decisionId": "uuid",
  "reason": "one-line reasoning for display",
  "txHash": "0x...",                    // when PAID
  "explorerUrl": "https://explorer.testnet.arc.io/tx/0x...",
  "updatedAt": "..."
}
```
Also re-polls Circle if the latest decision is still `SUBMITTED`.

Optional push: if `OWATCH_CALLBACK_URL` is set, POST the same body there (HMAC-signed the same way) on every terminal status.

## POST `/api/owatch/snapshot`
OWatch pushes liability (on a cron, e.g. every 10 min, and after big point changes).
```json
{ "pointsOutstanding": "1840000", "microUsdcPerPoint": "500", "activeUsers7d": 312, "asOf": "2026-10-16T09:00:00Z" }
```
`200 {"ok": true}`. Stored append-only in `owatch_snapshots`; the latest row is used.

## POST `/api/approvals/confirm`
Called by the approvals page after the owner's tx is mined.
```json
{ "decisionId": "uuid", "txHash": "0x..." }
```
Server verifies via viem: tx success, `to == vault`, event `ApprovalResolved(decisionKey, approved)` present. Appends `OWNER_APPROVED`+`CONFIRMED` or `OWNER_REJECTED`. Idempotent.

## POST `/api/agent/tick` (P1)
Bearer `CRON_SECRET`. Body `{}`. Returns summary `{repolled, reDecided, alerts}`.

## POST `/api/creator/claims` (P1)
Owner-only (sign-in-with-wallet message signed by `OWNER_ADDRESS`, verify with viem `verifyMessage`).
```json
{ "claimId": "c_1", "creatorName": "Editor Budi", "wallet": "0x...", "videoUrl": "https://owatch.../v/abc", "videoId": "abc", "amountMicro": "15000000" }
```
Agent fetches views for `videoId` from OWatch (see `11-OWATCH-INTEGRATION.md`, optional endpoint); rule: `views ≥ CREATOR_MIN_VIEWS` (default 100) → PAY from `CREATOR` (within caps) else HOLD.

## GET `/api/public/stats`
Public, cached 30 s. Excludes `source='simulator'`.
```json
{
  "network": "arc-testnet",
  "vault": { "address": "0x...", "balanceMicro": "...", "remainingToday": {...} },
  "solvency": { "reserveRatio": 1.84, "runwayDays": 12.5, "liabilityMicro": "..." },
  "traction": {
    "businesses": 1,
    "uniqueUsersPaid": 0, "payouts": 0, "usdcPaidMicro": "0",
    "decisions": { "PAY": 0, "HOLD": 0, "ESCALATE": 0, "REJECT": 0 },
    "escalations": { "total": 0, "approved": 0, "rejected": 0, "humanAgreedWithAgent": 0 },
    "onTimeRate": 0.0
  }
}
```

## Error format
`{ "error": { "code": "VALIDATION_ERROR | UNAUTHORIZED | NOT_FOUND | INTERNAL", "message": "..." } }`
