import { createPublicClient, http, type Address } from "viem";
import { arcTestnet } from "viem/chains";
import { env } from "@/lib/env";

export const arcClient = createPublicClient({
  chain: arcTestnet,
  transport: http(env.ARC_RPC_URL),
});

// Minimal inline ABI definitions to avoid touching web/src/lib/abi/**
const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
] as const;

const vaultAbi = [
  {
    type: "function",
    name: "balance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "remainingToday",
    stateMutability: "view",
    inputs: [{ name: "cat", type: "uint8" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "budgets",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint8" }],
    outputs: [
      { name: "perTxCap", type: "uint128" },
      { name: "dailyCap", type: "uint128" },
      { name: "spentInDay", type: "uint128" },
      { name: "dayIndex", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "paused",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "agent",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

function resolveVaultAddress(address?: Address): Address {
  const resolved = address ?? (env.LUMBUNG_VAULT_ADDRESS as Address | undefined);
  if (!resolved) {
    throw new Error("Vault address not configured in env (LUMBUNG_VAULT_ADDRESS) and not provided");
  }
  return resolved;
}

export async function getUsdcBalance(account: Address): Promise<bigint> {
  const balance = await arcClient.readContract({
    address: env.USDC_ADDRESS as Address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account],
  });
  return balance;
}

export async function getVaultBalance(vaultAddress?: Address): Promise<bigint> {
  const address = resolveVaultAddress(vaultAddress);
  const balance = await arcClient.readContract({
    address,
    abi: vaultAbi,
    functionName: "balance",
  });
  return balance;
}

export async function getVaultRemainingToday(category: number, vaultAddress?: Address): Promise<bigint> {
  const address = resolveVaultAddress(vaultAddress);
  const remaining = await arcClient.readContract({
    address,
    abi: vaultAbi,
    functionName: "remainingToday",
    args: [category],
  });
  return remaining;
}

export async function getVaultBudget(
  category: number,
  vaultAddress?: Address,
): Promise<{ perTxCap: bigint; dailyCap: bigint; spentInDay: bigint; dayIndex: bigint }> {
  const address = resolveVaultAddress(vaultAddress);
  const [perTxCap, dailyCap, spentInDay, dayIndex] = await arcClient.readContract({
    address,
    abi: vaultAbi,
    functionName: "budgets",
    args: [category],
  });
  return {
    perTxCap: BigInt(perTxCap),
    dailyCap: BigInt(dailyCap),
    spentInDay: BigInt(spentInDay),
    dayIndex: BigInt(dayIndex),
  };
}

export async function isVaultPaused(vaultAddress?: Address): Promise<boolean> {
  const address = resolveVaultAddress(vaultAddress);
  const paused = await arcClient.readContract({
    address,
    abi: vaultAbi,
    functionName: "paused",
  });
  return paused;
}

export async function getVaultOwner(vaultAddress?: Address): Promise<Address> {
  const address = resolveVaultAddress(vaultAddress);
  const owner = await arcClient.readContract({
    address,
    abi: vaultAbi,
    functionName: "owner",
  });
  return owner;
}

export async function getVaultAgent(vaultAddress?: Address): Promise<Address> {
  const address = resolveVaultAddress(vaultAddress);
  const agent = await arcClient.readContract({
    address,
    abi: vaultAbi,
    functionName: "agent",
  });
  return agent;
}

export async function getVaultSnapshot(vaultAddress?: Address): Promise<{
  balanceMicro: bigint;
  remainingToday: { REWARD: bigint; CREATOR: bigint; OPS: bigint };
  perTxCap: { REWARD: bigint; CREATOR: bigint; OPS: bigint };
  paused: boolean;
}> {
  const address = resolveVaultAddress(vaultAddress);

  const [balanceMicro, paused, budgetReward, budgetCreator, budgetOps, remReward, remCreator, remOps] =
    await Promise.all([
      getVaultBalance(address),
      isVaultPaused(address),
      getVaultBudget(0, address),
      getVaultBudget(1, address),
      getVaultBudget(2, address),
      getVaultRemainingToday(0, address),
      getVaultRemainingToday(1, address),
      getVaultRemainingToday(2, address),
    ]);

  return {
    balanceMicro,
    remainingToday: {
      REWARD: remReward,
      CREATOR: remCreator,
      OPS: remOps,
    },
    perTxCap: {
      REWARD: budgetReward.perTxCap,
      CREATOR: budgetCreator.perTxCap,
      OPS: budgetOps.perTxCap,
    },
    paused,
  };
}
