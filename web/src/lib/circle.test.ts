import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { CircleDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import {
  executeVaultCall,
  pollTx,
  setCircleClientForTesting,
  getCircleClient,
} from "./circle";
import { env } from "@/lib/env";

describe("circle client and vault calls", () => {
  const envRecord = env as unknown as Record<string, unknown>;
  const originalApiKey = env.CIRCLE_API_KEY;
  const originalEntitySecret = env.CIRCLE_ENTITY_SECRET;
  const originalWalletId = env.CIRCLE_AGENT_WALLET_ID;
  const originalVault = env.LUMBUNG_VAULT_ADDRESS;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    setCircleClientForTesting(null);
    envRecord.CIRCLE_API_KEY = originalApiKey;
    envRecord.CIRCLE_ENTITY_SECRET = originalEntitySecret;
    envRecord.CIRCLE_AGENT_WALLET_ID = originalWalletId;
    envRecord.LUMBUNG_VAULT_ADDRESS = originalVault;
  });

  it("getCircleClient throws descriptive error when credentials are not configured", () => {
    envRecord.CIRCLE_API_KEY = undefined;
    envRecord.CIRCLE_ENTITY_SECRET = undefined;

    expect(() => getCircleClient()).toThrow(/Circle client not configured/);
  });

  it("executeVaultCall throws when wallet ID or vault address are missing", async () => {
    const mockClient = {
      createContractExecutionTransaction: vi.fn(),
    };
    setCircleClientForTesting(mockClient as unknown as CircleDeveloperControlledWalletsClient);

    envRecord.CIRCLE_AGENT_WALLET_ID = undefined;
    await expect(
      executeVaultCall(
        "pay",
        {
          category: "REWARD",
          to: "0x1234567890123456789012345678901234567890",
          amountMicro: 100_000n,
          decisionKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
          reasonHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
        },
        "idemp-1",
      ),
    ).rejects.toThrow(/CIRCLE_AGENT_WALLET_ID must be set/);
  });

  it("executeVaultCall creates contract execution transaction with correct params and fee", async () => {
    const mockClient = {
      createContractExecutionTransaction: vi.fn().mockResolvedValue({
        data: { id: "circle-tx-abc" },
      }),
    };
    setCircleClientForTesting(mockClient as unknown as CircleDeveloperControlledWalletsClient);

    envRecord.CIRCLE_AGENT_WALLET_ID = "wallet-123";
    envRecord.LUMBUNG_VAULT_ADDRESS = "0xVaultAddress123";

    const result = await executeVaultCall(
      "pay",
      {
        category: "REWARD",
        to: "0x1234567890123456789012345678901234567890",
        amountMicro: 500_000n,
        decisionKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
        reasonHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
      },
      "idemp-pay-1",
    );

    expect(result).toEqual({ circleTxId: "circle-tx-abc" });
    expect(mockClient.createContractExecutionTransaction).toHaveBeenCalledWith({
      idempotencyKey: "idemp-pay-1",
      walletId: "wallet-123",
      contractAddress: "0xVaultAddress123",
      abiFunctionSignature: "pay(uint8,address,uint256,bytes32,bytes32)",
      abiParameters: [
        "0",
        "0x1234567890123456789012345678901234567890",
        "500000",
        "0x1111111111111111111111111111111111111111111111111111111111111111",
        "0x2222222222222222222222222222222222222222222222222222222222222222",
      ],
      fee: {
        type: "level",
        config: { feeLevel: "MEDIUM" },
      },
    });
  });

  it("executeVaultCall uses requestApproval signature for ESCALATE calls", async () => {
    const mockClient = {
      createContractExecutionTransaction: vi.fn().mockResolvedValue({
        data: { id: "circle-tx-esc" },
      }),
    };
    setCircleClientForTesting(mockClient as unknown as CircleDeveloperControlledWalletsClient);

    envRecord.CIRCLE_AGENT_WALLET_ID = "wallet-123";
    envRecord.LUMBUNG_VAULT_ADDRESS = "0xVaultAddress123";

    const result = await executeVaultCall(
      "requestApproval",
      {
        category: "CREATOR",
        to: "0x1234567890123456789012345678901234567890",
        amountMicro: 10_000_000n,
        decisionKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
        reasonHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
      },
      "idemp-esc-1",
    );

    expect(result).toEqual({ circleTxId: "circle-tx-esc" });
    expect(mockClient.createContractExecutionTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        abiFunctionSignature: "requestApproval(uint8,address,uint256,bytes32,bytes32)",
        abiParameters: expect.arrayContaining(["1"]), // category CREATOR is "1"
      }),
    );
  });

  it("pollTx polls and returns when terminal state is reached", async () => {
    const mockClient = {
      getTransaction: vi.fn().mockResolvedValue({
        data: {
          transaction: {
            state: "COMPLETE",
            txHash: "0xtxhash123",
          },
        },
      }),
    };
    setCircleClientForTesting(mockClient as unknown as CircleDeveloperControlledWalletsClient);

    const result = await pollTx("tx-id-1", 5000);
    expect(result).toEqual({
      state: "COMPLETE",
      txHash: "0xtxhash123",
      errorReason: undefined,
    });
  });
});
