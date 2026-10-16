import {
  initiateDeveloperControlledWalletsClient,
  type CircleDeveloperControlledWalletsClient,
} from "@circle-fin/developer-controlled-wallets";
import { env } from "@/lib/env";
import type { Category } from "@/agent/types";

let circleClientInstance: CircleDeveloperControlledWalletsClient | null = null;

/**
 * Returns an instance of the Circle Developer-Controlled Wallets SDK client.
 * Throws a descriptive error if CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET is not configured.
 */
export function getCircleClient(): CircleDeveloperControlledWalletsClient {
  if (circleClientInstance) {
    return circleClientInstance;
  }
  if (!env.CIRCLE_API_KEY || !env.CIRCLE_ENTITY_SECRET) {
    throw new Error(
      "Circle client not configured: CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET must be set in environment",
    );
  }
  circleClientInstance = initiateDeveloperControlledWalletsClient({
    apiKey: env.CIRCLE_API_KEY,
    entitySecret: env.CIRCLE_ENTITY_SECRET,
  });
  return circleClientInstance;
}

/**
 * Overrides the Circle client instance for unit testing.
 */
export function setCircleClientForTesting(client: CircleDeveloperControlledWalletsClient | null): void {
  circleClientInstance = client;
}

const CATEGORY_MAP: Record<Category, string> = {
  REWARD: "0",
  CREATOR: "1",
  OPS: "2",
};

export type VaultCallParams = {
  category: Category;
  to: `0x${string}`;
  amountMicro: bigint;
  decisionKey: `0x${string}`;
  reasonHash: `0x${string}`;
};

/**
 * Executes a contract call (pay or requestApproval) on LumbungVault via Circle Developer-Controlled Wallets.
 * Uses idempotencyKey to guarantee exactly-once submission.
 */
export async function executeVaultCall(
  fn: "pay" | "requestApproval",
  params: VaultCallParams,
  idempotencyKey: string,
): Promise<{ circleTxId: string }> {
  if (!env.CIRCLE_AGENT_WALLET_ID) {
    throw new Error("Circle agent wallet ID missing: CIRCLE_AGENT_WALLET_ID must be set in environment");
  }
  if (!env.LUMBUNG_VAULT_ADDRESS) {
    throw new Error("LumbungVault contract address missing: LUMBUNG_VAULT_ADDRESS must be set in environment");
  }

  const categoryIndex = CATEGORY_MAP[params.category];
  if (categoryIndex === undefined) {
    throw new Error(`Unsupported category: ${String(params.category)}`);
  }

  const abiFunctionSignature =
    fn === "pay"
      ? "pay(uint8,address,uint256,bytes32,bytes32)"
      : "requestApproval(uint8,address,uint256,bytes32,bytes32)";

  const abiParameters = [
    categoryIndex,
    params.to,
    params.amountMicro.toString(),
    params.decisionKey,
    params.reasonHash,
  ];

  const client = getCircleClient();

  const response = await client.createContractExecutionTransaction({
    idempotencyKey,
    walletId: env.CIRCLE_AGENT_WALLET_ID,
    contractAddress: env.LUMBUNG_VAULT_ADDRESS,
    abiFunctionSignature,
    abiParameters,
    fee: {
      type: "level",
      config: {
        feeLevel: "MEDIUM",
      },
    },
  });

  const txId = response.data?.id;
  if (!txId) {
    throw new Error("Circle createContractExecutionTransaction did not return a transaction ID");
  }

  return { circleTxId: txId };
}

export type PollTxResult = {
  state: string;
  txHash?: string;
  errorReason?: string;
};

const TERMINAL_STATES = new Set(["COMPLETE", "FAILED", "DENIED", "CANCELLED"]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Polls a Circle transaction until it reaches a terminal state or budgetMs expires.
 * Polling interval is 1.5 seconds per spec.
 */
export async function pollTx(id: string, budgetMs = 25000): Promise<PollTxResult> {
  const client = getCircleClient();
  const startTime = Date.now();
  const pollIntervalMs = 1500;

  let lastResult: PollTxResult = { state: "INITIATED" };

  while (Date.now() - startTime < budgetMs) {
    try {
      const response = await client.getTransaction({ id });
      const tx = response.data?.transaction;

      if (tx) {
        const state = tx.state ?? "UNKNOWN";
        const txHash = tx.txHash;
        const errorReason = tx.errorReason || tx.errorDetails;

        lastResult = {
          state,
          txHash,
          errorReason,
        };

        if (TERMINAL_STATES.has(state)) {
          return lastResult;
        }
      }
    } catch (error) {
      lastResult = {
        state: "ERROR",
        errorReason: error instanceof Error ? error.message : String(error),
      };
      // If error occurs, we still allow polling to retry unless budget is exhausted
    }

    const elapsed = Date.now() - startTime;
    const remaining = budgetMs - elapsed;
    if (remaining <= 0) {
      break;
    }
    await sleep(Math.min(pollIntervalMs, remaining));
  }

  return lastResult;
}
