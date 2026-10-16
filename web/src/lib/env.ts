import { z } from "zod";

const envSchema = z.object({
  // Arc Chain
  ARC_NETWORK: z.enum(["testnet", "mainnet"]).default("testnet"),
  ARC_RPC_URL: z.string().default("https://rpc.testnet.arc.io"),
  ARC_CHAIN_ID: z.coerce.number().default(5042002),
  USDC_ADDRESS: z.string().default("0x3600000000000000000000000000000000000000"),
  LUMBUNG_VAULT_ADDRESS: z.string().optional(),
  OWNER_ADDRESS: z.string().optional(),
  DEPLOYER_PRIVATE_KEY: z.string().optional(),

  // Public Arc Chain
  NEXT_PUBLIC_ARC_EXPLORER: z.string().default("https://explorer.testnet.arc.io"),
  NEXT_PUBLIC_ARC_CHAIN_ID: z.coerce.number().default(5042002),
  NEXT_PUBLIC_LUMBUNG_VAULT_ADDRESS: z.string().optional(),

  // Circle Wallets
  CIRCLE_API_KEY: z.string().optional(),
  CIRCLE_ENTITY_SECRET: z.string().optional(),
  CIRCLE_BLOCKCHAIN: z.string().default("ARC-TESTNET"),
  CIRCLE_WALLET_SET_ID: z.string().optional(),
  CIRCLE_AGENT_WALLET_ID: z.string().optional(),
  CIRCLE_AGENT_WALLET_ADDRESS: z.string().optional(),

  // Database
  DATABASE_URL: z.string().optional(),

  // LLM
  LLM_BASE_URL: z.string().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  LLM_TIMEOUT_MS: z.coerce.number().default(12000),

  // OWatch
  OWATCH_WEBHOOK_SECRET: z.string().optional(),
  OWATCH_CALLBACK_URL: z.string().optional(),
  OWATCH_API_URL: z.string().optional(),
  NEXT_PUBLIC_OWATCH_URL: z.string().optional(),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_OWNER_CHAT_ID: z.string().optional(),

  // App
  APP_URL: z.string().default("http://localhost:3000"),
  CRON_SECRET: z.string().optional(),

  // Policy thresholds
  POLICY_MAX_REDEEMS_24H: z.coerce.number().default(3),
  POLICY_NEW_ACCOUNT_MAX_MICRO: z.coerce.bigint().default(1_000_000n),
  POLICY_LOW_RESERVE_RATIO: z.coerce.number().default(1.0),
  POLICY_CRITICAL_RESERVE_RATIO: z.coerce.number().default(0.5),
  POLICY_LOW_RESERVE_MAX_PAY_MICRO: z.coerce.bigint().default(1_000_000n),
  POLICY_RISK_ESCALATE: z.coerce.number().default(0.7),
  CREATOR_MIN_VIEWS: z.coerce.number().default(100),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.format());
    throw new Error("Invalid environment configuration");
  }
  return result.data;
}

export const env = parseEnv();
