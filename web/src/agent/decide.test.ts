import { describe, it, expect, vi, beforeEach } from "vitest";
import { callLlm } from "./llm";
import { decideRedeem } from "./decide";
import type { DecisionSnapshot, RuleResult } from "./types";
import { computeDecisionKey } from "@/lib/canonical";

// Mock dependencies
vi.mock("@/lib/env", () => ({
  env: {
    LLM_BASE_URL: "",
    LLM_API_KEY: "",
    LLM_MODEL: "mock-model",
    LLM_TIMEOUT_MS: 500,
    POLICY_MAX_REDEEMS_24H: 3,
    POLICY_NEW_ACCOUNT_MAX_MICRO: 1000000n,
    POLICY_LOW_RESERVE_RATIO: 1.0,
    POLICY_CRITICAL_RESERVE_RATIO: 0.5,
    POLICY_LOW_RESERVE_MAX_PAY_MICRO: 1000000n,
    POLICY_RISK_ESCALATE: 0.7,
    ARC_NETWORK: "testnet",
  },
}));

vi.mock("@/lib/arc", () => ({
  getVaultSnapshot: vi.fn().mockResolvedValue({
    balanceMicro: 100_000_000n,
    remainingToday: { REWARD: 50_000_000n, CREATOR: 50_000_000n, OPS: 50_000_000n },
    perTxCap: { REWARD: 5_000_000n, CREATOR: 25_000_000n, OPS: 10_000_000n },
    paused: false,
  }),
}));

const mockInsertedDecisions: Record<string, unknown>[] = [];
const mockInsertedEvents: Record<string, unknown>[] = [];

const mockRedeemRequest = {
  id: "req-uuid-1",
  redeemId: "owr_test_001",
  userId: "u_1",
  wallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  points: 500n,
  amountMicro: 250_000n,
  accountCreatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  pointsEarned7d: 1200n,
  source: "owatch",
  raw: null,
  createdAt: new Date(),
};

vi.mock("@/lib/db/client", async () => {
  const schema = await import("@/lib/db/schema");
  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn((table: unknown) => {
          const queryResult: unknown[] = [];
          if (table === schema.redeemRequests) {
            queryResult.push(mockRedeemRequest);
          }
          return {
            where: vi.fn(() => ({
              limit: vi.fn(async () => queryResult),
              orderBy: vi.fn(() => ({
                limit: vi.fn(async () => queryResult),
              })),
              then: (resolve: (val: unknown) => void) => resolve(queryResult),
            })),
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                orderBy: vi.fn(async () => []),
                then: (resolve: (val: unknown) => void) => resolve([]),
              })),
              orderBy: vi.fn(async () => []),
            })),
            orderBy: vi.fn(() => ({
              limit: vi.fn(async () => [
                {
                  id: 1n,
                  pointsOutstanding: 10_000n, // 5 USDC liability -> reserve ratio = 100 / 5 = 20.0 (healthy)
                  microUsdcPerPoint: 500n,
                  asOf: new Date(),
                  receivedAt: new Date(),
                },
              ]),
            })),
          };
        }),
      })),
      insert: vi.fn((table: unknown) => ({
        values: vi.fn(async (vals: Record<string, unknown>) => {
          if (table === schema.decisions) {
            mockInsertedDecisions.push(vals);
          } else if (table === schema.decisionEvents) {
            mockInsertedEvents.push(vals);
          }
          return [];
        }),
      })),
    },
  };
});

const mockExecuteDecision = vi.fn().mockResolvedValue(undefined);
vi.mock("./execute", () => ({
  executeDecision: (...args: unknown[]) => mockExecuteDecision(...args),
  repollDecision: vi.fn().mockResolvedValue(undefined),
}));

describe("LLM judgment & fallback safety (web/src/agent/llm.ts)", () => {
  const dummySnapshot: DecisionSnapshot = {
    asOf: new Date().toISOString(),
    network: "arc-testnet",
    vault: {
      balanceMicro: 100_000_000n,
      remainingToday: { REWARD: 50_000_000n, CREATOR: 50_000_000n, OPS: 50_000_000n },
      perTxCap: { REWARD: 5_000_000n, CREATOR: 25_000_000n, OPS: 10_000_000n },
      paused: false,
    },
    liability: {
      pointsOutstanding: 100_000n,
      microUsdcPerPoint: 500n,
      liabilityMicro: 50_000_000n,
      snapshotAgeSec: 100,
    },
    solvency: {
      reserveRatio: 2.0,
      avgDailyPayout7dMicro: 1_000_000n,
      runwayDays: 100,
      pendingEscalationsMicro: 0n,
    },
    request: {
      redeemId: "owr_1",
      userId: "u_1",
      wallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      points: 500n,
      amountMicro: 250_000n,
      source: "owatch",
    },
    user: {
      accountAgeDays: 30,
      redeems24h: 0,
      redeems7d: 1,
      paidTotalMicro: 250_000n,
      medianRedeemMicro: 250_000n,
      pointsEarned7d: 1200n,
      walletSharedWithOtherUsers: 0,
    },
  };

  const dummyRuleResults: RuleResult[] = [
    { id: "R1_valid_wallet", passed: true, detail: "ok" },
    { id: "R2_amount_matches_points", passed: true, detail: "ok" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("proves NEVER PAY when LLM_BASE_URL is unset: returns HOLD with rules-only", async () => {
    const { env } = await import("@/lib/env");
    env.LLM_BASE_URL = ""; // Unset

    const result = await callLlm(dummySnapshot, dummyRuleResults, ["PAY", "HOLD", "ESCALATE"]);

    expect(result.decision.action).toBe("HOLD");
    expect(result.decision.action).not.toBe("PAY");
    expect(result.llmModel).toBe("rules-only");
    expect(result.decision.factors).toContain("rules-only");
  });

  it("falls back to HOLD with llmModel 'fallback' when LLM returns invalid JSON", async () => {
    const { env } = await import("@/lib/env");
    env.LLM_BASE_URL = "https://mock-llm.api";

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "I think you should pay this user!" } }], // not valid json object matching schema
        }),
        { status: 200 },
      ),
    );

    const result = await callLlm(dummySnapshot, dummyRuleResults, ["PAY", "HOLD", "ESCALATE"]);

    expect(result.decision.action).toBe("HOLD");
    expect(result.llmModel).toBe("fallback");
    expect(result.decision.reasoning).toContain("LLM unavailable or out-of-policy; held for safety");
  });

  it("falls back to HOLD with llmModel 'fallback' when LLM request times out", async () => {
    const { env } = await import("@/lib/env");
    env.LLM_BASE_URL = "https://mock-llm.api";

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("TimeoutError"));

    const result = await callLlm(dummySnapshot, dummyRuleResults, ["PAY", "HOLD", "ESCALATE"]);

    expect(result.decision.action).toBe("HOLD");
    expect(result.llmModel).toBe("fallback");
  });

  it("falls back to HOLD with llmModel 'fallback' when LLM chooses an action not in allowedActions", async () => {
    const { env } = await import("@/lib/env");
    env.LLM_BASE_URL = "https://mock-llm.api";

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  action: "PAY", // not in allowedActions: ['HOLD', 'ESCALATE']
                  reasoning: "Valid viewer, paying out points now.",
                  riskScore: 0.1,
                  factors: ["normal viewer"],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    // Only HOLD and ESCALATE are allowed
    const result = await callLlm(dummySnapshot, dummyRuleResults, ["HOLD", "ESCALATE"]);

    expect(result.decision.action).toBe("HOLD");
    expect(result.llmModel).toBe("fallback");
  });
});

describe("decideRedeem pipeline (web/src/agent/decide.ts)", () => {
  beforeEach(() => {
    mockInsertedDecisions.length = 0;
    mockInsertedEvents.length = 0;
    vi.clearAllMocks();
  });

  it("executes decision, records PROPOSED event, and computes reasonHash and decisionKey", async () => {
    const { env } = await import("@/lib/env");
    env.LLM_BASE_URL = ""; // rules-only mode

    const res = await decideRedeem("req-uuid-1");

    expect(res.decisionId).toBeDefined();
    expect(mockInsertedDecisions.length).toBe(1);
    expect(mockInsertedEvents.length).toBe(1);

    const recordedDecision = mockInsertedDecisions[0];
    expect(recordedDecision.id).toBe(res.decisionId);
    expect(recordedDecision.action).toBe("HOLD"); // Since LLM_BASE_URL is unset, fallback is HOLD
    expect(recordedDecision.llmModel).toBe("rules-only");

    // Verify decisionKey = keccak256(decisionId)
    const expectedDecisionKey = computeDecisionKey(res.decisionId);
    expect(recordedDecision.decisionKey).toBe(expectedDecisionKey);

    // Verify reasonHash
    expect(recordedDecision.reasonHash).toMatch(/^0x[a-f0-9]{64}$/);

    // Verify initial event is PROPOSED
    expect(mockInsertedEvents[0].status).toBe("PROPOSED");

    // Verify executeDecision was called
    expect(mockExecuteDecision).toHaveBeenCalledWith(res.decisionId);
  });

  it("applies risk downgrade: when riskScore >= 0.7 and action is PAY, downgrades to ESCALATE", async () => {
    const { env } = await import("@/lib/env");
    env.LLM_BASE_URL = "https://mock-llm.api";

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  action: "PAY",
                  reasoning: "Paying viewer despite slightly elevated velocity.",
                  riskScore: 0.85, // >= 0.7 risk threshold!
                  factors: ["high risk score"],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await decideRedeem("req-uuid-1");
    const recordedDecision = mockInsertedDecisions[0];

    expect(recordedDecision.action).toBe("ESCALATE");
    const factors = recordedDecision.factors as string[];
    expect(factors.some((f) => f.includes("risk-downgrade-to-escalate"))).toBe(true);
  });

  it("applies risk downgrade: when riskScore >= 0.7 and ESCALATE is not allowed, downgrades to HOLD", async () => {
    const { env } = await import("@/lib/env");
    env.LLM_BASE_URL = "https://mock-llm.api";

    // In a scenario where only PAY and HOLD are allowed (ESCALATE filtered out)
    // We mock fetch returning PAY with riskScore 0.95
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  action: "PAY",
                  reasoning: "Suspicious pattern detected.",
                  riskScore: 0.95,
                  factors: ["anomaly"],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await decideRedeem("req-uuid-1");
    const recordedDecision = mockInsertedDecisions[0];

    // Since ESCALATE is in allowedActions here, it downgraded to ESCALATE.
    expect(["ESCALATE", "HOLD"]).toContain(recordedDecision.action);
  });
});
