/**
 * Circle smoke script.
 * Verifies Circle SDK client initialization and inspects agent wallet information.
 * NO MONEY IS MOVED.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Attempt to load .env.local if present
const envLocalPath = resolve(process.cwd(), ".env.local");
if (existsSync(envLocalPath) && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(envLocalPath);
  } catch {
    // Ignore if already loaded or syntax error
  }
}

async function main() {
  console.log("=== Lumbung Circle Smoke Test ===");
  console.log("Checking environment configuration...");

  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  const walletId = process.env.CIRCLE_AGENT_WALLET_ID;
  const walletSetId = process.env.CIRCLE_WALLET_SET_ID;
  const vaultAddress = process.env.LUMBUNG_VAULT_ADDRESS;

  if (!apiKey || !entitySecret) {
    console.log("⚠️  CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET is not set in environment.");
    console.log("To run this test with real Circle API:");
    console.log("  1. Copy .env.example to web/.env.local");
    console.log("  2. Add CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET (from Circle Developer Console)");
    console.log("  3. Run: pnpm circle:smoke\n");
    console.log("Smoke check skipped cleanly (no credentials).");
    process.exit(0);
  }

  // Import after loading env
  const { initiateDeveloperControlledWalletsClient } = await import(
    "@circle-fin/developer-controlled-wallets"
  );

  const client = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  });

  console.log("✅ Circle client initialized successfully.");

  if (walletId) {
    console.log(`\nQuerying agent wallet (ID: ${walletId})...`);
    try {
      const response = await client.getWallet({ id: walletId });
      const wallet = response.data?.wallet;
      if (wallet) {
        console.log("Wallet details:");
        console.log(`  - ID: ${wallet.id}`);
        console.log(`  - Address: ${wallet.address}`);
        console.log(`  - Blockchain: ${wallet.blockchain}`);
        console.log(`  - Account Type: ${wallet.accountType}`);
        console.log(`  - Wallet Set ID: ${wallet.walletSetId}`);
        console.log(`  - State: ${wallet.state}`);
      } else {
        console.log("⚠️  Wallet not found in response.");
      }
    } catch (err) {
      console.error("❌ Failed to query wallet:", err instanceof Error ? err.message : err);
    }
  } else if (walletSetId) {
    console.log(`\nListing wallets in wallet set (ID: ${walletSetId})...`);
    try {
      const response = await client.listWallets({ walletSetId });
      const wallets = response.data?.wallets ?? [];
      console.log(`Found ${wallets.length} wallet(s):`);
      for (const w of wallets) {
        console.log(`  - ${w.address} (id: ${w.id}, type: ${w.accountType}, chain: ${w.blockchain})`);
      }
    } catch (err) {
      console.error("❌ Failed to list wallets:", err instanceof Error ? err.message : err);
    }
  } else {
    console.log("ℹ️  Neither CIRCLE_AGENT_WALLET_ID nor CIRCLE_WALLET_SET_ID is set.");
    console.log("Run 'pnpm circle:setup' after registering your entity secret to create a wallet.");
  }

  if (vaultAddress) {
    console.log(`\nVault address configured: ${vaultAddress}`);
  }

  console.log("\n✅ Smoke check completed successfully (no money moved).");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
