/**
 * Circle setup script.
 * Creates a wallet set 'Lumbung' and 1 SCA wallet on ARC-TESTNET.
 * Prints the three environment variable values to put into web/.env.local.
 *
 * NOTE: The HUMAN must run web/scripts/register-entity-secret.ts first
 * and provide CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Attempt to load .env.local if present
const envLocalPath = resolve(process.cwd(), ".env.local");
if (existsSync(envLocalPath) && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(envLocalPath);
  } catch {
    // Ignore error
  }
}

async function main() {
  console.log("=== Lumbung Circle Setup ===");

  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey || !entitySecret) {
    console.error("❌ CIRCLE_API_KEY and/or CIRCLE_ENTITY_SECRET are missing.");
    console.error("Before running setup, the human must register the entity secret:");
    console.error("  1. Run: pnpm tsx scripts/register-entity-secret.ts");
    console.error("  2. Put CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET in web/.env.local");
    console.error("  3. Re-run: pnpm circle:setup\n");
    process.exit(1);
  }

  const { initiateDeveloperControlledWalletsClient } = await import(
    "@circle-fin/developer-controlled-wallets"
  );

  const client = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  });

  console.log("1. Creating Wallet Set 'Lumbung'...");
  const ws = await client.createWalletSet({ name: "Lumbung" });
  const walletSetId = ws.data?.walletSet?.id;

  if (!walletSetId) {
    throw new Error("Unable to obtain walletSetId from createWalletSet response");
  }
  console.log(`   Wallet set created. ID: ${walletSetId}`);

  console.log("\n2. Creating SCA wallet on ARC-TESTNET...");
  const walletsResponse = await client.createWallets({
    walletSetId,
    blockchains: ["ARC-TESTNET"],
    accountType: "SCA", // SCA on Arc Testnet: Circle Gas Station sponsors gas
    count: 1,
  });

  const wallet = walletsResponse.data?.wallets?.[0];
  if (!wallet) {
    throw new Error("Circle createWallets did not return a wallet");
  }

  console.log("   Wallet created successfully!");
  console.log(`   Address: ${wallet.address}`);
  console.log(`   ID: ${wallet.id}`);

  console.log("\n=======================================================");
  console.log("🎉 Setup complete! Add these values to web/.env.local:");
  console.log("=======================================================");
  console.log(`CIRCLE_WALLET_SET_ID=${walletSetId}`);
  console.log(`CIRCLE_AGENT_WALLET_ID=${wallet.id}`);
  console.log(`CIRCLE_AGENT_WALLET_ADDRESS=${wallet.address}`);
  console.log("=======================================================\n");
}

main().catch((err) => {
  console.error("❌ Circle setup failed:", err);
  process.exit(1);
});
