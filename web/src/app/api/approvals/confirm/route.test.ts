import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { encodeEventTopics, encodeAbiParameters, parseAbiParameters, type Hex, type TransactionReceipt } from "viem";
import { LumbungVaultAbi } from "@/lib/abi/LumbungVault";
import { decisions, decisionEvents } from "@/lib/db/schema";
import { env } from "@/lib/env";

const mockVaultAddress = "0x1111111111111111111111111111111111111111";
const mockAttackerAddress = "0x9999999999999999999999999999999999999999";
const testDecisionId = "a0000000-0000-0000-0000-000000000001";
const testDecisionKey = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hex;
const testTxHash = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

let mockDecisions: Array<typeof decisions.$inferSelect> = [];
let mockDecisionEvents: Array<typeof decisionEvents.$inferSelect> = [];

vi.mock("@/lib/env", () => ({
  env: {
    LUMBUNG_VAULT_ADDRESS: "0x1111111111111111111111111111111111111111",
    NEXT_PUBLIC_ARC_EXPLORER: "https://explorer.testnet.arc.circle.com",
    APP_URL: "http://localhost:3000",
  },
}));

vi.mock("@/lib/db/client", () => {
  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn((table) => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => (table === decisions ? mockDecisions : [])),
            orderBy: vi.fn(() => mockDecisionEvents),
          })),
        })),
      })),
      insert: vi.fn((table) => ({
        values: vi.fn(async (val) => {
          if (table === decisionEvents) {
            const row = { id: BigInt(mockDecisionEvents.length + 1), createdAt: new Date(), ...val };
            mockDecisionEvents.push(row);
            return [row];
          }
          return [val];
        }),
      })),
    },
  };
});

vi.mock("@/lib/arc", () => ({
  arcClient: {
    getTransactionReceipt: vi.fn(),
  },
}));

import { POST } from "./route";
import { arcClient } from "@/lib/arc";

function createApprovalResolvedLog(
  contractAddress: string,
  decisionKey: Hex,
  approved: boolean,
) {
  const topics = encodeEventTopics({
    abi: LumbungVaultAbi,
    eventName: "ApprovalResolved",
    args: { decisionKey },
  });

  const data = encodeAbiParameters(parseAbiParameters("bool approved"), [approved]);

  return {
    address: contractAddress as `0x${string}`,
    topics,
    data,
    blockHash: "0x00" as Hex,
    blockNumber: 1n,
    transactionHash: testTxHash as Hex,
    transactionIndex: 0,
    logIndex: 0,
    removed: false,
  };
}

function createPaidLog(
  contractAddress: string,
  decisionKey: Hex,
  cat: number,
  to: `0x${string}`,
  amount: bigint,
  reasonHash: Hex,
  ownerApproved: boolean,
) {
  const topics = encodeEventTopics({
    abi: LumbungVaultAbi,
    eventName: "Paid",
    args: {
      decisionKey,
      cat,
      to,
    },
  });

  const data = encodeAbiParameters(
    parseAbiParameters("uint256 amount, bytes32 reasonHash, bool ownerApproved"),
    [amount, reasonHash, ownerApproved],
  );

  return {
    address: contractAddress as `0x${string}`,
    topics,
    data,
    blockHash: "0x00" as Hex,
    blockNumber: 1n,
    transactionHash: testTxHash as Hex,
    transactionIndex: 0,
    logIndex: 1,
    removed: false,
  };
}

describe("POST /api/approvals/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (env as { LUMBUNG_VAULT_ADDRESS: string | null }).LUMBUNG_VAULT_ADDRESS = mockVaultAddress;
    mockDecisions = [
      {
        id: testDecisionId,
        decisionKey: testDecisionKey,
        subjectType: "redeem",
        subjectId: "req-1",
        supersedesDecisionId: null,
        category: "REWARD",
        toWallet: "0x2222222222222222222222222222222222222222",
        amountMicro: 5_000_000n,
        action: "ESCALATE",
        reasoning: "Needs owner approval",
        riskScore: 0.8,
        factors: [],
        allowedActions: ["ESCALATE", "HOLD"],
        ruleResults: [],
        snapshot: {},
        recommendationIfEscalated: "Approve if valid",
        holdUntilHint: null,
        llmModel: "test",
        reasonHash: "0x3333333333333333333333333333333333333333333333333333333333333333",
        source: "owatch",
        createdAt: new Date(),
      },
    ];
    mockDecisionEvents = [];
  });

  it("fails closed with 503 NOT_CONFIGURED when LUMBUNG_VAULT_ADDRESS is unset", async () => {
    (env as { LUMBUNG_VAULT_ADDRESS: string | null }).LUMBUNG_VAULT_ADDRESS = null;

    const req = new NextRequest("http://localhost:3000/api/approvals/confirm", {
      method: "POST",
      body: JSON.stringify({ decisionId: testDecisionId, txHash: testTxHash }),
    });

    const res = await POST(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error.code).toBe("NOT_CONFIGURED");
  });

  it("rejects when transaction was not sent to the vault (receipt.to != vault)", async () => {
    vi.mocked(arcClient.getTransactionReceipt).mockResolvedValueOnce({
      status: "success",
      to: mockAttackerAddress,
      logs: [],
    } as unknown as TransactionReceipt);

    const req = new NextRequest("http://localhost:3000/api/approvals/confirm", {
      method: "POST",
      body: JSON.stringify({ decisionId: testDecisionId, txHash: testTxHash }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.message).toContain("Transaction was not sent to the vault");
  });

  it("rejects when ApprovalResolved log is from a different contract address", async () => {
    const fakeLog = createApprovalResolvedLog(mockAttackerAddress, testDecisionKey, true);

    vi.mocked(arcClient.getTransactionReceipt).mockResolvedValueOnce({
      status: "success",
      to: mockVaultAddress,
      logs: [fakeLog],
    } as unknown as TransactionReceipt);

    const req = new NextRequest("http://localhost:3000/api/approvals/confirm", {
      method: "POST",
      body: JSON.stringify({ decisionId: testDecisionId, txHash: testTxHash }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.message).toContain("ApprovalResolved event not found for this decision from vault");
  });

  it("rejects when approved=true but Paid event is missing or from another contract", async () => {
    const validApprovalLog = createApprovalResolvedLog(mockVaultAddress, testDecisionKey, true);
    const attackerPaidLog = createPaidLog(
      mockAttackerAddress,
      testDecisionKey,
      0,
      "0x2222222222222222222222222222222222222222",
      5_000_000n,
      "0x3333333333333333333333333333333333333333333333333333333333333333",
      true,
    );

    vi.mocked(arcClient.getTransactionReceipt).mockResolvedValueOnce({
      status: "success",
      to: mockVaultAddress,
      logs: [validApprovalLog, attackerPaidLog],
    } as unknown as TransactionReceipt);

    const req = new NextRequest("http://localhost:3000/api/approvals/confirm", {
      method: "POST",
      body: JSON.stringify({ decisionId: testDecisionId, txHash: testTxHash }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error.message).toContain("Paid event with ownerApproved=true not found from vault");
  });

  it("confirms approval when both ApprovalResolved and Paid events are from vault", async () => {
    const validApprovalLog = createApprovalResolvedLog(mockVaultAddress, testDecisionKey, true);
    const validPaidLog = createPaidLog(
      mockVaultAddress,
      testDecisionKey,
      0,
      "0x2222222222222222222222222222222222222222",
      5_000_000n,
      "0x3333333333333333333333333333333333333333333333333333333333333333",
      true,
    );

    vi.mocked(arcClient.getTransactionReceipt).mockResolvedValueOnce({
      status: "success",
      to: mockVaultAddress,
      logs: [validApprovalLog, validPaidLog],
    } as unknown as TransactionReceipt);

    const req = new NextRequest("http://localhost:3000/api/approvals/confirm", {
      method: "POST",
      body: JSON.stringify({ decisionId: testDecisionId, txHash: testTxHash }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.status).toBe("OWNER_APPROVED");

    expect(mockDecisionEvents.some((e) => e.status === "OWNER_APPROVED")).toBe(true);
    expect(mockDecisionEvents.some((e) => e.status === "CONFIRMED")).toBe(true);
  });
});
