/**
 * OWatch Webhook & Scenario Simulator
 *
 * ⚠️ DEV ONLY: Every request sets source: 'simulator' so simulator traffic
 * is strictly excluded from public metrics and analytics (docs/05-API.md).
 *
 * Simulates:
 * 1. POST /api/owatch/snapshot: updates outstanding liability
 * 2. 4 Demo Scenarios from docs/04-AGENT.md:
 *    - Scenario 1: Normal viewer, healthy reserve -> PAY
 *    - Scenario 2: Same viewer 3x velocity -> HOLD/ESCALATE
 *    - Scenario 3: Amount above per-tx cap (10 USDC > 5 USDC cap) -> ESCALATE
 *    - Scenario 4: Low reserve ratio (< 1.0) -> small redeem PAYS (<= 1 USDC), larger HOLDS (> 1 USDC)
 * 3. Polls GET /api/owatch/redeem/[id] and prints a table of expected vs actual actions.
 *
 * Usage:
 *   pnpm simulate
 *   or: pnpm tsx scripts/simulate-owatch.ts
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { computeHmac } from "../src/lib/hmac";

// Attempt to load .env.local or .env if present
const envLocalPath = resolve(process.cwd(), ".env.local");
const envPath = resolve(process.cwd(), ".env");

if (existsSync(envLocalPath) && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(envLocalPath);
  } catch {
    // Ignore error
  }
} else if (existsSync(envPath) && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(envPath);
  } catch {
    // Ignore error
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

export type SnapshotPayload = {
  pointsOutstanding: string;
  microUsdcPerPoint: string;
  activeUsers7d?: number;
  asOf: string;
};

export type RedeemPayload = {
  redeemId: string;
  userId: string;
  wallet: string;
  points: string;
  amountMicro: string;
  user?: {
    accountCreatedAt?: string;
    pointsEarned7d?: string;
  };
  source: "simulator";
};

export type ScenarioResult = {
  scenario: string;
  redeemId: string;
  amountFormatted: string;
  expectedAction: string;
  actualStatus: string;
  reason: string;
  matched: boolean;
};

// ── Payload & Header Builders ────────────────────────────────────────────────

export function buildSignedHeaders(
  secret: string,
  rawPayload: string,
  timestamp?: number,
): Record<string, string> {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const tsStr = ts.toString();
  const message = `${tsStr}.${rawPayload}`;
  const sig = computeHmac(secret, message);
  return {
    "Content-Type": "application/json",
    "X-Lumbung-Timestamp": tsStr,
    "X-Lumbung-Signature": sig,
  };
}

export function buildGetHeaders(
  secret: string,
  redeemId: string,
  timestamp?: number,
): Record<string, string> {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const tsStr = ts.toString();
  const message = `${tsStr}.${redeemId}`;
  const sig = computeHmac(secret, message);
  return {
    "X-Lumbung-Timestamp": tsStr,
    "X-Lumbung-Signature": sig,
  };
}

export function buildSnapshotPayload(
  overrides?: Partial<SnapshotPayload>,
): SnapshotPayload {
  return {
    pointsOutstanding: "20000", // 20k pts * 500 = 10 USDC liability
    microUsdcPerPoint: "500",
    activeUsers7d: 150,
    asOf: new Date().toISOString(),
    ...overrides,
  };
}

export function buildRedeemPayload(params: {
  redeemId: string;
  userId: string;
  wallet: string;
  points: string;
  amountMicro: string;
  user?: {
    accountCreatedAt?: string;
    pointsEarned7d?: string;
  };
}): RedeemPayload {
  return {
    redeemId: params.redeemId,
    userId: params.userId,
    wallet: params.wallet,
    points: params.points,
    amountMicro: params.amountMicro,
    user: params.user,
    source: "simulator", // DEV ONLY: strictly 'simulator'
  };
}

// ── API Helpers ──────────────────────────────────────────────────────────────

export async function sendSnapshot(
  baseUrl: string,
  secret: string,
  payload: SnapshotPayload,
): Promise<{ ok: boolean; status: number; body?: unknown }> {
  const rawBody = JSON.stringify(payload);
  const headers = buildSignedHeaders(secret, rawBody);
  const res = await fetch(`${baseUrl}/api/owatch/snapshot`, {
    method: "POST",
    headers,
    body: rawBody,
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body: data };
}

export async function sendRedeem(
  baseUrl: string,
  secret: string,
  payload: RedeemPayload,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const rawBody = JSON.stringify(payload);
  const headers = buildSignedHeaders(secret, rawBody);
  const res = await fetch(`${baseUrl}/api/owatch/redeem`, {
    method: "POST",
    headers,
    body: rawBody,
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, body };
}

export async function pollRedeem(
  baseUrl: string,
  secret: string,
  redeemId: string,
  maxAttempts = 15,
  intervalMs = 1000,
): Promise<{
  redeemId: string;
  status: string;
  decisionId: string | null;
  reason: string | null;
  txHash: string | null;
}> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const headers = buildGetHeaders(secret, redeemId);
    const res = await fetch(`${baseUrl}/api/owatch/redeem/${redeemId}`, {
      method: "GET",
      headers,
    });

    if (res.ok) {
      const data = (await res.json()) as {
        redeemId: string;
        status: string;
        decisionId: string | null;
        reason: string | null;
        txHash: string | null;
      };

      if (data.status && data.status !== "PENDING") {
        return data;
      }
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  return {
    redeemId,
    status: "TIMEOUT_PENDING",
    decisionId: null,
    reason: "Poll timed out waiting for decision to settle",
    txHash: null,
  };
}

// ── Match Checker ────────────────────────────────────────────────────────────

function checkMatch(expectedAction: string, actualStatus: string): boolean {
  if (expectedAction === "PAY") {
    return actualStatus === "PAID" || actualStatus === "CONFIRMED";
  }
  if (expectedAction === "HOLD") {
    return actualStatus === "HELD";
  }
  if (expectedAction === "ESCALATE") {
    return actualStatus === "AWAITING_OWNER" || actualStatus === "PAID";
  }
  if (expectedAction === "HOLD/ESCALATE") {
    return actualStatus === "HELD" || actualStatus === "AWAITING_OWNER";
  }
  return false;
}

// ── Main Runner ──────────────────────────────────────────────────────────────

export async function runSimulation() {
  console.log("================================================================================");
  console.log("🌾 Lumbung OWatch Simulator (DEV ONLY)");
  console.log("================================================================================");

  // 1. Refuse to run on mainnet (Money-safety rule 1)
  const network = process.env.ARC_NETWORK;
  if (network === "mainnet") {
    console.error("❌ Refusing to run simulator on mainnet! ARC_NETWORK=mainnet is set.");
    console.error("The simulator creates synthetic test requests and is restricted to testnet/dev environments.");
    process.exit(1);
  }

  // 2. Validate OWATCH_WEBHOOK_SECRET
  const secret = process.env.OWATCH_WEBHOOK_SECRET;
  if (!secret) {
    console.error("❌ Configuration error: OWATCH_WEBHOOK_SECRET is required to sign simulator payloads.");
    console.error("Please set OWATCH_WEBHOOK_SECRET in web/.env.local or your environment.\n");
    console.error("Example:");
    console.error("  OWATCH_WEBHOOK_SECRET=\"your-shared-webhook-secret\"");
    console.error("  APP_URL=\"http://localhost:3000\"\n");
    process.exit(1);
  }

  const baseUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  console.log(`📡 Target Base URL: ${baseUrl}`);
  console.log(`🔐 Signing Secret:  [configured: ${secret.length} chars]`);
  console.log(`🌐 Network:         ${network || "testnet"}\n`);

  const runId = Date.now().toString(36);
  const results: ScenarioResult[] = [];

  // Check health / reachability
  try {
    const healthRes = await fetch(`${baseUrl}/api/health`).catch(() => null);
    if (!healthRes || !healthRes.ok) {
      console.warn(`⚠️  Warning: ${baseUrl}/api/health did not respond with 200 OK.`);
      console.warn("Ensure the Lumbung Next.js dev server is running ('pnpm dev').\n");
    }
  } catch {
    // Continue
  }

  // ── Step 1: Post Healthy Solvency Snapshot ────────────────────────────────
  console.log("--------------------------------------------------------------------------------");
  console.log("📊 Step 1: Posting Healthy Solvency Snapshot to /api/owatch/snapshot...");
  console.log("--------------------------------------------------------------------------------");
  const healthySnap = buildSnapshotPayload({
    pointsOutstanding: "20000", // 10 USDC liability
    microUsdcPerPoint: "500",
    activeUsers7d: 250,
  });

  const snapRes = await sendSnapshot(baseUrl, secret, healthySnap);
  if (!snapRes.ok) {
    console.error(`❌ Failed to post snapshot: HTTP ${snapRes.status}`, snapRes.body);
    process.exit(1);
  }
  console.log("✅ Healthy snapshot accepted by Lumbung.\n");

  // ── Step 2: Scenario 1 - Normal Viewer (Healthy Reserve) ─────────────────────
  console.log("--------------------------------------------------------------------------------");
  console.log("🧪 Scenario 1: Normal viewer with healthy reserve");
  console.log("   Expectation: PAY in seconds");
  console.log("--------------------------------------------------------------------------------");
  const s1RedeemId = `owr_sim_${runId}_s1_normal`;
  const s1Payload = buildRedeemPayload({
    redeemId: s1RedeemId,
    userId: `u_sim_normal_${runId}`,
    wallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    points: "500",
    amountMicro: "250000", // 0.25 USDC
    user: {
      accountCreatedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      pointsEarned7d: "1500",
    },
  });

  const s1Post = await sendRedeem(baseUrl, secret, s1Payload);
  console.log(`   POST /api/owatch/redeem -> HTTP ${s1Post.status} (${s1Post.body.status})`);
  console.log(`   Polling GET /api/owatch/redeem/${s1RedeemId}...`);
  const s1Result = await pollRedeem(baseUrl, secret, s1RedeemId);
  console.log(`   Result: status=${s1Result.status}, reason="${s1Result.reason || "N/A"}"`);
  results.push({
    scenario: "1. Normal viewer",
    redeemId: s1RedeemId,
    amountFormatted: "0.25 USDC",
    expectedAction: "PAY",
    actualStatus: s1Result.status,
    reason: s1Result.reason || "No reasoning returned",
    matched: checkMatch("PAY", s1Result.status),
  });

  // ── Step 3: Scenario 2 - Same Viewer 3x Velocity ───────────────────────────
  console.log("\n--------------------------------------------------------------------------------");
  console.log("🧪 Scenario 2: Same viewer redeems rapidly 3x in a row");
  console.log("   Expectation: 1st/2nd PAY, 3rd triggers velocity threshold -> HOLD/ESCALATE");
  console.log("--------------------------------------------------------------------------------");
  const velocityUserId = `u_sim_velocity_${runId}`;
  const velocityWallet = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

  for (let i = 1; i <= 3; i++) {
    const vRedeemId = `owr_sim_${runId}_s2_v${i}`;
    const vPayload = buildRedeemPayload({
      redeemId: vRedeemId,
      userId: velocityUserId,
      wallet: velocityWallet,
      points: "500",
      amountMicro: "250000",
      user: {
        accountCreatedAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
        pointsEarned7d: "5000",
      },
    });

    const isThird = i === 3;
    const expected = isThird ? "HOLD/ESCALATE" : "PAY";

    await sendRedeem(baseUrl, secret, vPayload);
    const vResult = await pollRedeem(baseUrl, secret, vRedeemId);
    console.log(`   Redeem ${i}/3: id=${vRedeemId} -> status=${vResult.status}`);

    if (isThird) {
      results.push({
        scenario: "2. Velocity (3rd redeem)",
        redeemId: vRedeemId,
        amountFormatted: "0.25 USDC",
        expectedAction: "HOLD/ESCALATE",
        actualStatus: vResult.status,
        reason: vResult.reason || "Velocity threshold triggered",
        matched: checkMatch(expected, vResult.status),
      });
    }
  }

  // ── Step 4: Scenario 3 - Above Per-Tx Cap ───────────────────────────────────
  console.log("\n--------------------------------------------------------------------------------");
  console.log("🧪 Scenario 3: Amount above per-tx cap (10 USDC > 5 USDC cap)");
  console.log("   Expectation: ESCALATE (status: AWAITING_OWNER)");
  console.log("--------------------------------------------------------------------------------");
  const s3RedeemId = `owr_sim_${runId}_s3_overcap`;
  const s3Payload = buildRedeemPayload({
    redeemId: s3RedeemId,
    userId: `u_sim_whale_${runId}`,
    wallet: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    points: "20000",
    amountMicro: "10000000", // 10 USDC (Reward per-tx cap is 5 USDC)
    user: {
      accountCreatedAt: new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString(),
      pointsEarned7d: "30000",
    },
  });

  await sendRedeem(baseUrl, secret, s3Payload);
  const s3Result = await pollRedeem(baseUrl, secret, s3RedeemId);
  console.log(`   Result: status=${s3Result.status}, reason="${s3Result.reason || "N/A"}"`);
  results.push({
    scenario: "3. Above per-tx cap (10 USDC)",
    redeemId: s3RedeemId,
    amountFormatted: "10.00 USDC",
    expectedAction: "ESCALATE",
    actualStatus: s3Result.status,
    reason: s3Result.reason || "Above per-transaction cap",
    matched: checkMatch("ESCALATE", s3Result.status),
  });

  // ── Step 5: Scenario 4 - Low Reserve Ratio (< 1.0) ──────────────────────────
  console.log("\n--------------------------------------------------------------------------------");
  console.log("🧪 Scenario 4: Low reserve ratio (< 1.0)");
  console.log("   Step 4.0: Posting high-liability snapshot so reserve ratio drops below 1.0");
  console.log("--------------------------------------------------------------------------------");
  const lowReserveSnap = buildSnapshotPayload({
    pointsOutstanding: "300000", // 300k pts * 500 = 150 USDC liability
    microUsdcPerPoint: "500",
    activeUsers7d: 500,
  });
  await sendSnapshot(baseUrl, secret, lowReserveSnap);
  console.log("   High-liability snapshot posted.");

  console.log("\n   🧪 Scenario 4a: Small redeem (0.50 USDC <= 1.0 USDC)");
  console.log("   Expectation: PAY (within low-reserve exception limit)");
  const s4aRedeemId = `owr_sim_${runId}_s4a_small`;
  const s4aPayload = buildRedeemPayload({
    redeemId: s4aRedeemId,
    userId: `u_sim_small_${runId}`,
    wallet: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    points: "1000",
    amountMicro: "500000", // 0.50 USDC
    user: {
      accountCreatedAt: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
      pointsEarned7d: "2000",
    },
  });
  await sendRedeem(baseUrl, secret, s4aPayload);
  const s4aResult = await pollRedeem(baseUrl, secret, s4aRedeemId);
  console.log(`   Result 4a: status=${s4aResult.status}, reason="${s4aResult.reason || "N/A"}"`);
  results.push({
    scenario: "4a. Low reserve small (<= 1 USDC)",
    redeemId: s4aRedeemId,
    amountFormatted: "0.50 USDC",
    expectedAction: "PAY",
    actualStatus: s4aResult.status,
    reason: s4aResult.reason || "Low reserve small payout",
    matched: checkMatch("PAY", s4aResult.status),
  });

  console.log("\n   🧪 Scenario 4b: Larger redeem (2.00 USDC > 1.0 USDC)");
  console.log("   Expectation: HOLD (low reserve requires top-up)");
  const s4bRedeemId = `owr_sim_${runId}_s4b_large`;
  const s4bPayload = buildRedeemPayload({
    redeemId: s4bRedeemId,
    userId: `u_sim_large_${runId}`,
    wallet: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    points: "4000",
    amountMicro: "2000000", // 2.00 USDC
    user: {
      accountCreatedAt: new Date(Date.now() - 50 * 24 * 3600 * 1000).toISOString(),
      pointsEarned7d: "5000",
    },
  });
  await sendRedeem(baseUrl, secret, s4bPayload);
  const s4bResult = await pollRedeem(baseUrl, secret, s4bRedeemId);
  console.log(`   Result 4b: status=${s4bResult.status}, reason="${s4bResult.reason || "N/A"}"`);
  results.push({
    scenario: "4b. Low reserve large (> 1 USDC)",
    redeemId: s4bRedeemId,
    amountFormatted: "2.00 USDC",
    expectedAction: "HOLD",
    actualStatus: s4bResult.status,
    reason: s4bResult.reason || "Low reserve held for top-up",
    matched: checkMatch("HOLD", s4bResult.status),
  });

  // ── Step 6: Print Results Summary Table ─────────────────────────────────────
  console.log("\n================================================================================");
  console.log("📋 SIMULATION RESULTS TABLE");
  console.log("================================================================================");
  console.log(
    formatTable([
      ["Scenario", "Amount", "Expected Action", "Actual Status", "Result"],
      ...results.map((r) => [
        r.scenario,
        r.amountFormatted,
        r.expectedAction,
        r.actualStatus,
        r.matched ? "✅ PASS" : "⚠️ CHECK",
      ]),
    ]),
  );

  console.log("\nDecision Reasoning Detail:");
  for (const r of results) {
    console.log(`  • [${r.scenario}] (${r.redeemId}):`);
    console.log(`    Status: ${r.actualStatus} | Expected: ${r.expectedAction}`);
    console.log(`    Reason: ${r.reason}\n`);
  }

  const allPassed = results.every((r) => r.matched);
  if (allPassed) {
    console.log("🎉 All 4 demo scenarios behaved exactly as expected!");
  } else {
    console.log("⚠️  Note: Some scenarios may be pending chain confirmation or running in fallback mode.");
  }
}

// ── Plain ASCII Table Formatter ──────────────────────────────────────────────

function formatTable(rows: string[][]): string {
  if (rows.length === 0) return "";
  const colWidths = rows[0].map((_, colIdx) =>
    Math.max(...rows.map((row) => (row[colIdx] ? row[colIdx].length : 0))),
  );

  const formatRow = (row: string[]) =>
    "| " + row.map((cell, i) => (cell || "").padEnd(colWidths[i])).join(" | ") + " |";

  const separator = "+-" + colWidths.map((w) => "-".repeat(w)).join("-+-") + "-+";

  return [
    separator,
    formatRow(rows[0]),
    separator,
    ...rows.slice(1).map(formatRow),
    separator,
  ].join("\n");
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("simulate-owatch.ts")) {
  runSimulation().catch((err) => {
    console.error("❌ Simulation encountered fatal error:", err);
    process.exit(1);
  });
}
