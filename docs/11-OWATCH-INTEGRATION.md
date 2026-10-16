# 11: OWatch integration (minimal patch)

Goal: OWatch keeps everything (UI, video, points, login). Only **two touch points** change, plus a wallet field.

## 0. Prerequisites (share with OWatch partner)
- `LUMBUNG_URL` (Vercel URL) and `OWATCH_WEBHOOK_SECRET` (same value on both sides, never in client code).
- Users need an EVM wallet address. If OWatch already stores a Base address, **the same address works on Arc** (EVM). Add an "Arc network" helper link in the redeem screen so users can view the payout (Arc Testnet: chain 5042002, RPC https://rpc.testnet.arc.io).
- Decide with partner: points → USDC rate (`microUsdcPerPoint`), and testnet vs small real mainnet amounts.

## 1. Redeem button → Lumbung (server side)
When the user confirms a redeem, OWatch backend (never the browser) does:
```ts
import crypto from "node:crypto";

async function lumbungRedeem(r: { id: string; userId: string; wallet: string; points: bigint; accountCreatedAt?: Date; pointsEarned7d?: bigint }) {
  const body = JSON.stringify({
    redeemId: r.id,                 // OWatch's unique redeem id (create it BEFORE calling, store it)
    userId: r.userId,
    wallet: r.wallet,
    points: r.points.toString(),
    amountMicro: (r.points * MICRO_USDC_PER_POINT).toString(),
    user: {
      accountCreatedAt: r.accountCreatedAt?.toISOString(),
      pointsEarned7d: r.pointsEarned7d?.toString(),
    },
    source: "owatch",
  });
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = crypto.createHmac("sha256", process.env.OWATCH_WEBHOOK_SECRET!).update(`${ts}.${body}`).digest("hex");
  const res = await fetch(`${process.env.LUMBUNG_URL}/api/owatch/redeem`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-lumbung-timestamp": ts, "x-lumbung-signature": sig },
    body,
  });
  return res.json(); // { decisionId, status }
}
```
Points handling: deduct (or lock) the points **when the redeem is created**; if Lumbung later returns `REJECTED`, refund the points. `HELD` / `AWAITING_OWNER` keep them locked.

Retries are safe: same `redeemId` → same decision.

## 2. Redeem status → show to user
Either poll `GET /api/owatch/redeem/:redeemId` (signed: HMAC of `${ts}.${redeemId}`) every few seconds on the redeem screen, or set `OWATCH_CALLBACK_URL` and receive pushes.
Suggested UI copy:
| status | Bahasa Indonesia | English |
|---|---|---|
| PENDING | Sedang diproses… | Processing… |
| PAID | Terkirim! Lihat transaksi ↗ | Sent! View transaction ↗ |
| HELD | Ditahan sementara, akan diproses otomatis | On hold, will be processed automatically |
| AWAITING_OWNER | Menunggu persetujuan admin | Waiting for admin approval |
| REJECTED | Ditolak, poin dikembalikan | Rejected, points refunded |
| FAILED | Gagal, coba lagi nanti | Failed, try again later |

## 3. Liability snapshot (cron)
Every 10 minutes (and after big point grants):
```ts
const body = JSON.stringify({
  pointsOutstanding: totalUnredeemedPoints.toString(),   // sum of all users' spendable points + locked points
  microUsdcPerPoint: MICRO_USDC_PER_POINT.toString(),
  activeUsers7d,
  asOf: new Date().toISOString(),
});
// sign exactly like step 1, POST to /api/owatch/snapshot
```

## 4. (P1) Video views for creator payouts
Expose `GET /api/lumbung/video/:videoId` on OWatch (same HMAC scheme) returning `{ videoId, views, publishedAt }`. Lumbung uses it to decide creator payouts.

## Test plan with partner
1. Point OWatch staging at Lumbung, redeem with a team wallet → `PAID` within ~10 s, tx visible on explorer.
2. Redeem 3× quickly → `HELD`/`AWAITING_OWNER`.
3. Turn on for real users; announce in the OWatch community.
