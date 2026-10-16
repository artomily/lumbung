import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { computeHmac } from "@/lib/hmac";
import { redeemRequests, decisions } from "@/lib/db/schema";

const mockSecret = "test-webhook-secret";

vi.mock("@/lib/env", () => ({
  env: {
    OWATCH_WEBHOOK_SECRET: "test-webhook-secret",
    NEXT_PUBLIC_ARC_EXPLORER: "https://explorer.testnet.arc.circle.com",
  },
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: vi.fn(() => {
      // In tests, don't execute or let background run
    }),
  };
});

let mockRedeemRequests: Array<typeof redeemRequests.$inferSelect> = [];
let mockDecisions: Array<typeof decisions.$inferSelect> = [];
let insertShouldThrowUnique = false;

vi.mock("@/lib/db/client", () => {
  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn((table) => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => {
              if (table === redeemRequests) return mockRedeemRequests;
              if (table === decisions) return mockDecisions;
              return [];
            }),
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => {
                if (table === decisions) {
                  // return decisions sorted by createdAt desc
                  const sorted = [...mockDecisions].sort(
                    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
                  );
                  return sorted.slice(0, 1);
                }
                return [];
              }),
            })),
          })),
        })),
      })),
      insert: vi.fn((table) => ({
        values: vi.fn((val) => {
          if (insertShouldThrowUnique) {
            const err = new Error("duplicate key value violates unique constraint");
            (err as unknown as { code: string }).code = "23505";
            throw err;
          }
          if (table === redeemRequests) {
            const row = {
              id: "req-1",
              createdAt: new Date(),
              ...val,
            };
            mockRedeemRequests.push(row);
            return {
              returning: vi.fn(() => [row]),
            };
          }
          return {
            returning: vi.fn(() => [val]),
          };
        }),
      })),
    },
  };
});

vi.mock("@/agent/decide", () => ({
  decideRedeem: vi.fn().mockResolvedValue({ decisionId: "dec-1" }),
}));

import { POST } from "./route";

function makeSignedRequest(body: unknown, secret = mockSecret, offsetTimestamp = 0) {
  const rawBody = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000) + offsetTimestamp;
  const signature = computeHmac(secret, `${timestamp}.${rawBody}`);

  return new NextRequest("http://localhost:3000/api/owatch/redeem", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-lumbung-timestamp": timestamp.toString(),
      "x-lumbung-signature": signature,
    },
    body: rawBody,
  });
}

describe("POST /api/owatch/redeem", () => {
  const sampleBody = {
    redeemId: "owr_001",
    userId: "user_123",
    wallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    points: "1000",
    amountMicro: "500000",
    source: "owatch",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedeemRequests = [];
    mockDecisions = [];
    insertShouldThrowUnique = false;
  });

  it("rejects request with 401 when signature is invalid", async () => {
    const rawBody = JSON.stringify(sampleBody);
    const timestamp = Math.floor(Date.now() / 1000);
    const req = new NextRequest("http://localhost:3000/api/owatch/redeem", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-lumbung-timestamp": timestamp.toString(),
        "x-lumbung-signature": "invalid_signature",
      },
      body: rawBody,
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("accepts valid new redeem request with 202 PENDING", async () => {
    const req = makeSignedRequest(sampleBody);
    const res = await POST(req);
    expect(res.status).toBe(202);
    const data = await res.json();
    expect(data.status).toBe("PENDING");
    expect(data.redeemId).toBe("owr_001");
  });

  it("returns 200 replay with existing decision for duplicate redeemId", async () => {
    mockRedeemRequests = [
      {
        id: "req-1",
        redeemId: "owr_001",
        userId: "user_123",
        wallet: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
        points: 1000n,
        amountMicro: 500000n,
        accountCreatedAt: null,
        pointsEarned7d: null,
        source: "owatch",
        raw: null,
        createdAt: new Date(),
      },
    ];

    mockDecisions = [
      {
        id: "d0000000-0000-0000-0000-000000000001",
        decisionKey: "0x1111",
        subjectType: "redeem",
        subjectId: "req-1",
        supersedesDecisionId: null,
        category: "REWARD",
        toWallet: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
        amountMicro: 500000n,
        action: "PAY",
        reasoning: "Approved payout",
        riskScore: 0.1,
        factors: [],
        allowedActions: ["PAY"],
        ruleResults: [],
        snapshot: {},
        recommendationIfEscalated: null,
        holdUntilHint: null,
        llmModel: "test",
        reasonHash: "0x2222",
        source: "owatch",
        createdAt: new Date(),
      },
    ];

    const req = makeSignedRequest(sampleBody);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.redeemId).toBe("owr_001");
    expect(data.decisionId).toBe("d0000000-0000-0000-0000-000000000001");
    expect(data.reason).toBe("Approved payout");
  });

  it("handles concurrent duplicate insert (pg code 23505) and returns 200 replay", async () => {
    // When insert throws unique constraint violation, it falls back to buildDecisionResponse
    insertShouldThrowUnique = true;
    mockRedeemRequests = [
      {
        id: "req-1",
        redeemId: "owr_001",
        userId: "user_123",
        wallet: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
        points: 1000n,
        amountMicro: 500000n,
        accountCreatedAt: null,
        pointsEarned7d: null,
        source: "owatch",
        raw: null,
        createdAt: new Date(),
      },
    ];

    const req = makeSignedRequest(sampleBody);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.redeemId).toBe("owr_001");
  });

  it("picks the latest decision (order by createdAt desc) when multiple decisions exist for the same subject", async () => {
    mockRedeemRequests = [
      {
        id: "req-1",
        redeemId: "owr_001",
        userId: "user_123",
        wallet: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
        points: 1000n,
        amountMicro: 500000n,
        accountCreatedAt: null,
        pointsEarned7d: null,
        source: "owatch",
        raw: null,
        createdAt: new Date(),
      },
    ];

    const olderDecision = {
      id: "d0000000-0000-0000-0000-000000000001",
      decisionKey: "0x1111",
      subjectType: "redeem",
      subjectId: "req-1",
      supersedesDecisionId: null,
      category: "REWARD",
      toWallet: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      amountMicro: 500000n,
      action: "HOLD",
      reasoning: "Initial hold",
      riskScore: 0.2,
      factors: [],
      allowedActions: ["HOLD"],
      ruleResults: [],
      snapshot: {},
      recommendationIfEscalated: null,
      holdUntilHint: "next_tick",
      llmModel: "test",
      reasonHash: "0x2222",
      source: "owatch",
      createdAt: new Date(Date.now() - 60000),
    };

    const newerDecision = {
      id: "d0000000-0000-0000-0000-000000000002",
      decisionKey: "0x3333",
      subjectType: "redeem",
      subjectId: "req-1",
      supersedesDecisionId: "d0000000-0000-0000-0000-000000000001",
      category: "REWARD",
      toWallet: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
      amountMicro: 500000n,
      action: "PAY",
      reasoning: "Re-decided and approved on tick",
      riskScore: 0.1,
      factors: [],
      allowedActions: ["PAY"],
      ruleResults: [],
      snapshot: {},
      recommendationIfEscalated: null,
      holdUntilHint: null,
      llmModel: "test",
      reasonHash: "0x4444",
      source: "owatch",
      createdAt: new Date(),
    };

    mockDecisions = [olderDecision, newerDecision];

    const req = makeSignedRequest(sampleBody);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.decisionId).toBe("d0000000-0000-0000-0000-000000000002");
    expect(data.reason).toBe("Re-decided and approved on tick");
  });
});
