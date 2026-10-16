import { describe, it, expect, vi, beforeEach } from "vitest";
import { encodeEventTopics, encodeAbiParameters, parseAbiParameters, type Hex } from "viem";
import { LumbungVaultAbi } from "@/lib/abi/LumbungVault";
import { decisions, decisionEvents, redeemRequests, alerts } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { computeHmac } from "@/lib/hmac";

import type { DecisionSnapshot } from "./types";
import type { TransactionReceipt } from "viem";

// In-memory mock DB state
let mockDecisions: Array<typeof decisions.$inferSelect> = [];
let mockDecisionEvents: Array<typeof decisionEvents.$inferSelect> = [];
let mockRedeemRequests: Array<typeof redeemRequests.$inferSelect> = [];
let mockAlerts: Array<typeof alerts.$inferSelect> = [];

function makeMockSnapshot(): DecisionSnapshot {
  return {
    asOf: "2026-10-16T10:00:00.000Z",
    network: "arc-testnet",
    vault: {
      balanceMicro: 100_000_000n,
      remainingToday: { REWARD: 50_000_000n, CREATOR: 100_000_000n, OPS: 20_000_000n },
      perTxCap: { REWARD: 5_000_000n, CREATOR: 25_000_000n, OPS: 10_000_000n },
      paused: false,
    },
    liability: {
      pointsOutstanding: 10_000n,
      microUsdcPerPoint: 500n,
      liabilityMicro: 5_000_000n,
      snapshotAgeSec: 120,
    },
    solvency: {
      reserveRatio: 20.0,
      avgDailyPayout7dMicro: 10_000_000n,
      runwayDays: 10,
      pendingEscalationsMicro: 0n,
    },
    request: {
      redeemId: "owr_test_001",
      userId: "u_1",
      wallet: "0x2222222222222222222222222222222222222222",
      points: 500n,
      amountMicro: 250_000n,
      source: "owatch",
    },
    user: {
      accountAgeDays: 10,
      redeems24h: 0,
      redeems7d: 1,
      paidTotalMicro: 250_000n,
      medianRedeemMicro: 250_000n,
      pointsEarned7d: 500n,
      walletSharedWithOtherUsers: 0,
    },
  };
}

vi.mock("@/lib/db/client", () => {
  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn((table) => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => {
              if (table === decisions) return mockDecisions;
              if (table === redeemRequests) return mockRedeemRequests;
              return [];
            }),
            orderBy: vi.fn(() => mockDecisionEvents),
          })),
        })),
      })),
      insert: vi.fn((table) => ({
        values: vi.fn(async (val) => {
          if (table === decisionEvents) {
            const row = { id: BigInt(mockDecisionEvents.length + 1), createdAt: new Date(), ...val };
            mockDecisionEvents.unshift(row);
            return [row];
          }
          if (table === alerts) {
            const row = { id: BigInt(mockAlerts.length + 1), createdAt: new Date(), ...val };
            mockAlerts.push(row);
            return [row];
          }
          return [val];
        }),
      })),
    },
  };
});

vi.mock("@/lib/circle", () => ({
  executeVaultCall: vi.fn(),
  pollTx: vi.fn(),
}));

vi.mock("@/lib/telegram", () => ({
  sendOwnerMessage: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/arc", () => ({
  arcClient: {
    getTransactionReceipt: vi.fn(),
  },
}));

// Import after mocks
import { executeDecision, repollDecision } from "./execute";
import { executeVaultCall, pollTx } from "@/lib/circle";
import { sendOwnerMessage } from "@/lib/telegram";
import { arcClient } from "@/lib/arc";

function createPaidReceipt(decisionKey: Hex, to: Hex, amountMicro: bigint, reasonHash: Hex) {
  const topics = encodeEventTopics({
    abi: LumbungVaultAbi,
    eventName: "Paid",
    args: { decisionKey, cat: 0, to },
  });
  const data = encodeAbiParameters(
    parseAbiParameters("uint256 amount, bytes32 reasonHash, bool ownerApproved"),
    [amountMicro, reasonHash, false],
  );

  return {
    status: "success",
    logs: [
      {
        address: "0x1111111111111111111111111111111111111111" as Hex,
        topics,
        data,
      },
    ],
  };
}

function createApprovalRequestedReceipt(decisionKey: Hex, to: Hex, amountMicro: bigint, reasonHash: Hex) {
  const topics = encodeEventTopics({
    abi: LumbungVaultAbi,
    eventName: "ApprovalRequested",
    args: { decisionKey, cat: 0, to },
  });
  const data = encodeAbiParameters(
    parseAbiParameters("uint256 amount, bytes32 reasonHash"),
    [amountMicro, reasonHash],
  );

  return {
    status: "success",
    logs: [
      {
        address: "0x1111111111111111111111111111111111111111" as Hex,
        topics,
        data,
      },
    ],
  };
}

describe("executeDecision", () => {
  const testDecisionId = "d0000000-0000-0000-0000-000000000001";
  const testDecisionKey = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hex;
  const testReasonHash = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as Hex;
  const testToWallet = "0x2222222222222222222222222222222222222222" as Hex;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDecisions = [];
    mockDecisionEvents = [];
    mockRedeemRequests = [];
    mockAlerts = [];
  });

  it("throws error when decision does not exist", async () => {
    await expect(executeDecision("non-existent-id")).rejects.toThrow("Decision not found");
  });

  it("does nothing when decision is already in a terminal state", async () => {
    mockDecisions = [
      {
        id: testDecisionId,
        decisionKey: testDecisionKey,
        subjectType: "redeem",
        subjectId: "req-1",
        supersedesDecisionId: null,
        category: "REWARD",
        toWallet: testToWallet,
        amountMicro: 500_000n,
        action: "PAY",
        reasoning: "Normal payout",
        riskScore: 0.1,
        factors: [],
        allowedActions: ["PAY"],
        ruleResults: [],
        snapshot: makeMockSnapshot(),
        recommendationIfEscalated: null,
        holdUntilHint: null,
        llmModel: "test",
        reasonHash: testReasonHash,
        source: "owatch",
        createdAt: new Date(),
      },
    ];

    mockDecisionEvents = [
      {
        id: 1n,
        decisionId: testDecisionId,
        status: "CONFIRMED",
        circleTxId: "ctx-1",
        txHash: "0xhash",
        error: null,
        data: null,
        createdAt: new Date(),
      },
    ];

    await executeDecision(testDecisionId);

    expect(executeVaultCall).not.toHaveBeenCalled();
    expect(mockDecisionEvents.length).toBe(1);
  });

  it("handles HOLD action with amount < 1 USDC (no telegram)", async () => {
    mockDecisions = [
      {
        id: testDecisionId,
        decisionKey: testDecisionKey,
        subjectType: "redeem",
        subjectId: "req-1",
        supersedesDecisionId: null,
        category: "REWARD",
        toWallet: testToWallet,
        amountMicro: 500_000n,
        action: "HOLD",
        reasoning: "Velocity limit reached",
        riskScore: 0.5,
        factors: [],
        allowedActions: ["HOLD"],
        ruleResults: [],
        snapshot: makeMockSnapshot(),
        recommendationIfEscalated: null,
        holdUntilHint: "daily_reset",
        llmModel: "test",
        reasonHash: testReasonHash,
        source: "owatch",
        createdAt: new Date(),
      },
    ];

    await executeDecision(testDecisionId);

    expect(mockDecisionEvents[0]?.status).toBe("HELD");
    expect(sendOwnerMessage).not.toHaveBeenCalled();
    expect(executeVaultCall).not.toHaveBeenCalled();
  });

  it("handles HOLD action with amount >= 1 USDC (sends telegram)", async () => {
    mockDecisions = [
      {
        id: testDecisionId,
        decisionKey: testDecisionKey,
        subjectType: "redeem",
        subjectId: "req-1",
        supersedesDecisionId: null,
        category: "REWARD",
        toWallet: testToWallet,
        amountMicro: 2_500_000n,
        action: "HOLD",
        reasoning: "Solvency low",
        riskScore: 0.6,
        factors: [],
        allowedActions: ["HOLD"],
        ruleResults: [],
        snapshot: makeMockSnapshot(),
        recommendationIfEscalated: null,
        holdUntilHint: "top_up",
        llmModel: "test",
        reasonHash: testReasonHash,
        source: "owatch",
        createdAt: new Date(),
      },
    ];

    await executeDecision(testDecisionId);

    expect(mockDecisionEvents[0]?.status).toBe("HELD");
    expect(sendOwnerMessage).toHaveBeenCalledWith(
      expect.stringContaining("⚠️ [Lumbung] Payout HELD: 2.5 USDC"),
    );
  });

  it("handles REJECT action locally", async () => {
    mockDecisions = [
      {
        id: testDecisionId,
        decisionKey: testDecisionKey,
        subjectType: "redeem",
        subjectId: "req-1",
        supersedesDecisionId: null,
        category: "REWARD",
        toWallet: testToWallet,
        amountMicro: 100_000n,
        action: "REJECT",
        reasoning: "Invalid wallet address",
        riskScore: 1.0,
        factors: [],
        allowedActions: ["REJECT"],
        ruleResults: [],
        snapshot: makeMockSnapshot(),
        recommendationIfEscalated: null,
        holdUntilHint: null,
        llmModel: "test",
        reasonHash: testReasonHash,
        source: "owatch",
        createdAt: new Date(),
      },
    ];

    await executeDecision(testDecisionId);

    expect(mockDecisionEvents[0]?.status).toBe("REJECTED");
    expect(executeVaultCall).not.toHaveBeenCalled();
  });

  it("executes PAY flow end-to-end with on-chain Paid event verification", async () => {
    mockDecisions = [
      {
        id: testDecisionId,
        decisionKey: testDecisionKey,
        subjectType: "redeem",
        subjectId: "req-1",
        supersedesDecisionId: null,
        category: "REWARD",
        toWallet: testToWallet,
        amountMicro: 250_000n,
        action: "PAY",
        reasoning: "Solvency healthy",
        riskScore: 0.05,
        factors: [],
        allowedActions: ["PAY"],
        ruleResults: [],
        snapshot: makeMockSnapshot(),
        recommendationIfEscalated: null,
        holdUntilHint: null,
        llmModel: "test",
        reasonHash: testReasonHash,
        source: "owatch",
        createdAt: new Date(),
      },
    ];

    const mockCircleTxId = "ctx-pay-123";
    const mockTxHash = "0x9999999999999999999999999999999999999999999999999999999999999999" as Hex;

    vi.mocked(executeVaultCall).mockResolvedValueOnce({ circleTxId: mockCircleTxId });
    vi.mocked(pollTx).mockResolvedValueOnce({
      state: "COMPLETE",
      txHash: mockTxHash,
    });

    const receipt = createPaidReceipt(testDecisionKey, testToWallet, 250_000n, testReasonHash);
    vi.mocked(arcClient.getTransactionReceipt).mockResolvedValueOnce(
      receipt as unknown as TransactionReceipt,
    );

    await executeDecision(testDecisionId);

    expect(executeVaultCall).toHaveBeenCalledWith(
      "pay",
      {
        category: "REWARD",
        to: testToWallet,
        amountMicro: 250_000n,
        decisionKey: testDecisionKey,
        reasonHash: testReasonHash,
      },
      testDecisionId,
    );

    // Latest event should be CONFIRMED
    expect(mockDecisionEvents[0]?.status).toBe("CONFIRMED");
    expect(mockDecisionEvents[0]?.txHash).toBe(mockTxHash);
    expect(mockDecisionEvents[0]?.circleTxId).toBe(mockCircleTxId);
  });

  it("marks FAILED when on-chain transaction reverts", async () => {
    mockDecisions = [
      {
        id: testDecisionId,
        decisionKey: testDecisionKey,
        subjectType: "redeem",
        subjectId: "req-1",
        supersedesDecisionId: null,
        category: "REWARD",
        toWallet: testToWallet,
        amountMicro: 250_000n,
        action: "PAY",
        reasoning: "Normal payout",
        riskScore: 0.1,
        factors: [],
        allowedActions: ["PAY"],
        ruleResults: [],
        snapshot: makeMockSnapshot(),
        recommendationIfEscalated: null,
        holdUntilHint: null,
        llmModel: "test",
        reasonHash: testReasonHash,
        source: "owatch",
        createdAt: new Date(),
      },
    ];

    const mockCircleTxId = "ctx-revert-123";
    const mockTxHash = "0x8888888888888888888888888888888888888888888888888888888888888888" as Hex;

    vi.mocked(executeVaultCall).mockResolvedValueOnce({ circleTxId: mockCircleTxId });
    vi.mocked(pollTx).mockResolvedValueOnce({
      state: "COMPLETE",
      txHash: mockTxHash,
      errorReason: "execution reverted: 0xc4891db5", // OverDailyCap selector
    });

    vi.mocked(arcClient.getTransactionReceipt).mockResolvedValueOnce({
      status: "reverted",
      logs: [],
    } as unknown as TransactionReceipt);

    await executeDecision(testDecisionId);

    expect(mockDecisionEvents[0]?.status).toBe("FAILED");
    expect(mockDecisionEvents[0]?.error).toContain("OverDailyCap");
    expect(mockAlerts.some((a) => a.kind === "TX_FAILED")).toBe(true);
  });

  it("executes ESCALATE flow and notifies owner via Telegram upon on-chain confirmation", async () => {
    mockDecisions = [
      {
        id: testDecisionId,
        decisionKey: testDecisionKey,
        subjectType: "redeem",
        subjectId: "req-1",
        supersedesDecisionId: null,
        category: "REWARD",
        toWallet: testToWallet,
        amountMicro: 6_000_000n, // over 5 USDC per-tx cap
        action: "ESCALATE",
        reasoning: "Over per-tx cap of 5 USDC",
        riskScore: 0.3,
        factors: ["amount exceeds per-tx cap"],
        allowedActions: ["ESCALATE", "HOLD"],
        ruleResults: [],
        snapshot: makeMockSnapshot(),
        recommendationIfEscalated: "APPROVE",
        holdUntilHint: null,
        llmModel: "test",
        reasonHash: testReasonHash,
        source: "owatch",
        createdAt: new Date(),
      },
    ];

    const mockCircleTxId = "ctx-escalate-123";
    const mockTxHash = "0x7777777777777777777777777777777777777777777777777777777777777777" as Hex;

    vi.mocked(executeVaultCall).mockResolvedValueOnce({ circleTxId: mockCircleTxId });
    vi.mocked(pollTx).mockResolvedValueOnce({
      state: "COMPLETE",
      txHash: mockTxHash,
    });

    const receipt = createApprovalRequestedReceipt(testDecisionKey, testToWallet, 6_000_000n, testReasonHash);
    vi.mocked(arcClient.getTransactionReceipt).mockResolvedValueOnce(
      receipt as unknown as TransactionReceipt,
    );

    await executeDecision(testDecisionId);

    expect(executeVaultCall).toHaveBeenCalledWith(
      "requestApproval",
      {
        category: "REWARD",
        to: testToWallet,
        amountMicro: 6_000_000n,
        decisionKey: testDecisionKey,
        reasonHash: testReasonHash,
      },
      testDecisionId,
    );

    expect(mockDecisionEvents[0]?.status).toBe("AWAITING_OWNER");
    expect(sendOwnerMessage).toHaveBeenCalledWith(
      expect.stringContaining("🔔 [Lumbung] Escalation requested for payout of 6 USDC"),
    );
    expect(mockAlerts.some((a) => a.kind === "ESCALATION")).toBe(true);
  });

  it("sends HMAC-signed callback to OWATCH_CALLBACK_URL when configured", async () => {
    const envRecord = env as unknown as Record<string, unknown>;
    const origUrl = env.OWATCH_CALLBACK_URL;
    const origSecret = env.OWATCH_WEBHOOK_SECRET;

    envRecord.OWATCH_CALLBACK_URL = "https://partner.owatch.id/webhook";
    envRecord.OWATCH_WEBHOOK_SECRET = "test-secret-123";

    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    globalThis.fetch = fetchMock;

    try {
      mockDecisions = [
        {
          id: testDecisionId,
          decisionKey: testDecisionKey,
          subjectType: "redeem",
          subjectId: "req-1",
          supersedesDecisionId: null,
          category: "REWARD",
          toWallet: testToWallet,
          amountMicro: 250_000n,
          action: "REJECT",
          reasoning: "Invalid wallet",
          riskScore: 1.0,
          factors: [],
          allowedActions: ["REJECT"],
          ruleResults: [],
          snapshot: makeMockSnapshot(),
          recommendationIfEscalated: null,
          holdUntilHint: null,
          llmModel: "test",
          reasonHash: testReasonHash,
          source: "owatch",
          createdAt: new Date(),
        },
      ];

      mockRedeemRequests = [
        {
          id: "req-1",
          redeemId: "owr_redeem_abc",
          userId: "u_1",
          wallet: testToWallet,
          points: 500n,
          amountMicro: 250_000n,
          accountCreatedAt: null,
          pointsEarned7d: null,
          source: "owatch",
          raw: null,
          createdAt: new Date(),
        },
      ];

      await executeDecision(testDecisionId);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://partner.owatch.id/webhook",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-Lumbung-Timestamp": expect.any(String),
            "X-Lumbung-Signature": expect.any(String),
          }),
        }),
      );

      const [, callInit] = fetchMock.mock.calls[0];
      const headers = callInit?.headers as Record<string, string>;
      const timestamp = headers["X-Lumbung-Timestamp"];
      const signature = headers["X-Lumbung-Signature"];
      const rawBody = callInit?.body as string;

      const expectedSig = computeHmac("test-secret-123", `${timestamp}.${rawBody}`);
      expect(signature).toBe(expectedSig);

      const parsed = JSON.parse(rawBody);
      expect(parsed.redeemId).toBe("owr_redeem_abc");
      expect(parsed.status).toBe("REJECTED");
    } finally {
      envRecord.OWATCH_CALLBACK_URL = origUrl;
      envRecord.OWATCH_WEBHOOK_SECRET = origSecret;
      globalThis.fetch = originalFetch;
    }
  });

  it("skips OWatch callback with a warning when OWATCH_WEBHOOK_SECRET is unset", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    const envRecord = env as unknown as Record<string, unknown>;
    const origUrl = envRecord.OWATCH_CALLBACK_URL;
    const origSecret = envRecord.OWATCH_WEBHOOK_SECRET;

    envRecord.OWATCH_CALLBACK_URL = "https://partner.owatch.id/webhook";
    delete envRecord.OWATCH_WEBHOOK_SECRET;

    try {
      mockDecisions = [
        {
          id: testDecisionId,
          decisionKey: testDecisionKey,
          subjectType: "redeem",
          subjectId: "req-1",
          supersedesDecisionId: null,
          category: "REWARD",
          toWallet: testToWallet,
          amountMicro: 250_000n,
          action: "REJECT",
          reasoning: "Rejected due to rule violation",
          riskScore: 0.9,
          factors: ["R12"],
          allowedActions: ["REJECT"],
          ruleResults: [],
          snapshot: makeMockSnapshot(),
          recommendationIfEscalated: null,
          holdUntilHint: null,
          llmModel: "test",
          reasonHash: testReasonHash,
          source: "owatch",
          createdAt: new Date(),
        },
      ];

      await executeDecision(testDecisionId);

      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      envRecord.OWATCH_CALLBACK_URL = origUrl;
      envRecord.OWATCH_WEBHOOK_SECRET = origSecret;
      globalThis.fetch = originalFetch;
    }
  });

  it("inserts SUBMIT_UNKNOWN event when executeVaultCall throws a network error", async () => {
    mockDecisions = [
      {
        id: testDecisionId,
        decisionKey: testDecisionKey,
        subjectType: "redeem",
        subjectId: "req-1",
        supersedesDecisionId: null,
        category: "REWARD",
        toWallet: testToWallet,
        amountMicro: 500_000n,
        action: "PAY",
        reasoning: "Valid payment",
        riskScore: 0.1,
        factors: [],
        allowedActions: ["PAY"],
        ruleResults: [],
        snapshot: makeMockSnapshot(),
        recommendationIfEscalated: null,
        holdUntilHint: null,
        llmModel: "test",
        reasonHash: testReasonHash,
        source: "owatch",
        createdAt: new Date(),
      },
    ];

    vi.mocked(executeVaultCall).mockRejectedValueOnce(new Error("Network timeout: fetch failed"));

    await executeDecision(testDecisionId);

    expect(mockDecisionEvents[0]?.status).toBe("SUBMIT_UNKNOWN");
    expect(mockAlerts).toHaveLength(0); // Alert not inserted for SUBMIT_UNKNOWN
  });

  it("inserts FAILED event when executeVaultCall throws a pre-submission error", async () => {
    mockDecisions = [
      {
        id: testDecisionId,
        decisionKey: testDecisionKey,
        subjectType: "redeem",
        subjectId: "req-1",
        supersedesDecisionId: null,
        category: "REWARD",
        toWallet: testToWallet,
        amountMicro: 500_000n,
        action: "PAY",
        reasoning: "Valid payment",
        riskScore: 0.1,
        factors: [],
        allowedActions: ["PAY"],
        ruleResults: [],
        snapshot: makeMockSnapshot(),
        recommendationIfEscalated: null,
        holdUntilHint: null,
        llmModel: "test",
        reasonHash: testReasonHash,
        source: "owatch",
        createdAt: new Date(),
      },
    ];

    const validationErr = Object.assign(new Error("Invalid parameters: walletId invalid"), { status: 400 });
    vi.mocked(executeVaultCall).mockRejectedValueOnce(validationErr);

    await executeDecision(testDecisionId);

    expect(mockDecisionEvents[0]?.status).toBe("FAILED");
    expect(mockAlerts.some((a) => a.kind === "TX_FAILED")).toBe(true);
  });
});

describe("repollDecision", () => {
  const testDecisionId = "d0000000-0000-0000-0000-000000000002";
  const testDecisionKey = "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" as Hex;
  const testReasonHash = "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd" as Hex;
  const testToWallet = "0x3333333333333333333333333333333333333333" as Hex;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDecisions = [];
    mockDecisionEvents = [];
    mockAlerts = [];
  });

  it("repolls an ongoing SUBMITTED transaction and marks CONFIRMED", async () => {
    mockDecisions = [
      {
        id: testDecisionId,
        decisionKey: testDecisionKey,
        subjectType: "redeem",
        subjectId: "req-2",
        supersedesDecisionId: null,
        category: "REWARD",
        toWallet: testToWallet,
        amountMicro: 1_000_000n,
        action: "PAY",
        reasoning: "Test repoll",
        riskScore: 0.1,
        factors: [],
        allowedActions: ["PAY"],
        ruleResults: [],
        snapshot: makeMockSnapshot(),
        recommendationIfEscalated: null,
        holdUntilHint: null,
        llmModel: "test",
        reasonHash: testReasonHash,
        source: "owatch",
        createdAt: new Date(),
      },
    ];

    mockDecisionEvents = [
      {
        id: 1n,
        decisionId: testDecisionId,
        status: "SUBMITTED",
        circleTxId: "ctx-repoll-456",
        txHash: null,
        error: null,
        data: null,
        createdAt: new Date(),
      },
    ];

    const mockTxHash = "0x6666666666666666666666666666666666666666666666666666666666666666" as Hex;

    vi.mocked(pollTx).mockResolvedValueOnce({
      state: "COMPLETE",
      txHash: mockTxHash,
    });

    const receipt = createPaidReceipt(testDecisionKey, testToWallet, 1_000_000n, testReasonHash);
    vi.mocked(arcClient.getTransactionReceipt).mockResolvedValueOnce(
      receipt as unknown as TransactionReceipt,
    );

    await repollDecision(testDecisionId);

    expect(pollTx).toHaveBeenCalledWith("ctx-repoll-456", 15000);
    expect(mockDecisionEvents[0]?.status).toBe("CONFIRMED");
    expect(mockDecisionEvents[0]?.txHash).toBe(mockTxHash);
  });

  it("retries executeVaultCall with the same idempotencyKey when latest status is SUBMIT_UNKNOWN", async () => {
    mockDecisions = [
      {
        id: testDecisionId,
        decisionKey: testDecisionKey,
        subjectType: "redeem",
        subjectId: "req-2",
        supersedesDecisionId: null,
        category: "REWARD",
        toWallet: testToWallet,
        amountMicro: 1_000_000n,
        action: "PAY",
        reasoning: "Test retry unknown",
        riskScore: 0.1,
        factors: [],
        allowedActions: ["PAY"],
        ruleResults: [],
        snapshot: makeMockSnapshot(),
        recommendationIfEscalated: null,
        holdUntilHint: null,
        llmModel: "test",
        reasonHash: testReasonHash,
        source: "owatch",
        createdAt: new Date(),
      },
    ];

    mockDecisionEvents = [
      {
        id: 1n,
        decisionId: testDecisionId,
        status: "SUBMIT_UNKNOWN",
        circleTxId: null,
        txHash: null,
        error: "Network timeout",
        data: null,
        createdAt: new Date(),
      },
    ];

    vi.mocked(executeVaultCall).mockResolvedValueOnce({
      circleTxId: "ctx-recovered-789",
    });

    const mockTxHash = "0x7777777777777777777777777777777777777777777777777777777777777777" as Hex;
    vi.mocked(pollTx).mockResolvedValueOnce({
      state: "COMPLETE",
      txHash: mockTxHash,
    });

    const receipt = createPaidReceipt(testDecisionKey, testToWallet, 1_000_000n, testReasonHash);
    vi.mocked(arcClient.getTransactionReceipt).mockResolvedValueOnce(
      receipt as unknown as TransactionReceipt,
    );

    await repollDecision(testDecisionId);

    // Verified executeVaultCall was called with SAME idempotencyKey (decision.id)
    expect(executeVaultCall).toHaveBeenCalledWith(
      "pay",
      expect.objectContaining({
        category: "REWARD",
        to: testToWallet,
        amountMicro: 1_000_000n,
        decisionKey: testDecisionKey,
        reasonHash: testReasonHash,
      }),
      testDecisionId,
    );

    expect(pollTx).toHaveBeenCalledWith("ctx-recovered-789", 15000);
    expect(mockDecisionEvents[0]?.status).toBe("CONFIRMED");
    expect(mockDecisionEvents[0]?.txHash).toBe(mockTxHash);
  });
});
