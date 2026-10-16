/**
 * Circle Entity Secret Registration Script
 *
 * ⚠️ IMPORTANT MONEY-SAFETY RULE:
 * THIS SCRIPT MUST BE EXECUTED DIRECTLY BY THE HUMAN OPERATOR.
 * AGENTS ARE FORBIDDEN FROM REGISTERING THE ENTITY SECRET.
 *
 * The recovery file downloaded by this script must be stored OUTSIDE
 * the repository (e.g. ~/.circle/recovery_file.dat) and NEVER committed.
 *
 * Usage:
 *   pnpm tsx scripts/register-entity-secret.ts
 */

import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as crypto from "node:crypto";
import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";

async function main() {
  console.log("===============================================================");
  console.log("🔐 Circle Entity Secret Registration Tool");
  console.log("===============================================================");
  console.log("This one-time registration enables Developer-Controlled Wallets.");
  console.log("Notice: The recovery file MUST be kept outside this repository.\n");

  const rl = readline.createInterface({ input, output });

  try {
    // 1. Get or prompt for API Key
    let apiKey = process.env.CIRCLE_API_KEY;
    if (!apiKey) {
      apiKey = await rl.question("Enter your Circle API Key (from developer.circle.com): ");
      apiKey = apiKey.trim();
    }
    if (!apiKey) {
      console.error("❌ Circle API Key is required.");
      process.exit(1);
    }

    // 2. Entity Secret (generate or enter)
    let entitySecret = process.env.CIRCLE_ENTITY_SECRET;
    if (!entitySecret) {
      const choice = await rl.question(
        "Do you want to generate a new 32-byte entity secret? (Y/n): ",
      );
      if (choice.trim().toLowerCase() === "n") {
        entitySecret = await rl.question("Enter your 64-character hex Entity Secret: ");
        entitySecret = entitySecret.trim();
      } else {
        entitySecret = crypto.randomBytes(32).toString("hex");
        console.log("\nGenerated new Entity Secret (SAVE THIS SECURELY):");
        console.log(`➡️  ${entitySecret}\n`);
      }
    }

    if (!/^[0-9a-fA-F]{64}$/.test(entitySecret)) {
      console.error("❌ Invalid Entity Secret: must be exactly 64 hexadecimal characters (32 bytes).");
      process.exit(1);
    }

    // 3. Recovery File Destination
    const defaultDir = path.join(os.homedir(), ".circle");
    if (!fs.existsSync(defaultDir)) {
      fs.mkdirSync(defaultDir, { recursive: true });
    }
    const defaultRecoveryPath = path.join(defaultDir, "lumbung_recovery_file.dat");

    const destInput = await rl.question(
      `Save recovery file to [${defaultRecoveryPath}]: `,
    );
    const recoveryPath = destInput.trim() ? path.resolve(destInput.trim()) : defaultRecoveryPath;

    // Verify recovery file is not inside the project repo
    const repoRoot = path.resolve(__dirname, "..");
    if (recoveryPath.startsWith(repoRoot)) {
      console.error(`❌ Security Violation: Recovery file cannot be placed inside repo: ${recoveryPath}`);
      console.error("Please specify a directory outside the repository (e.g. ~/.circle/).");
      process.exit(1);
    }

    console.log("\nRegistering Entity Secret with Circle...");
    const response = await registerEntitySecretCiphertext({
      apiKey,
      entitySecret,
    });

    const recoveryFileContent = response.data?.recoveryFile;
    if (!recoveryFileContent) {
      console.error("❌ Circle registration failed: no recovery file returned.");
      process.exit(1);
    }

    fs.writeFileSync(recoveryPath, recoveryFileContent, { encoding: "utf-8", mode: 0o600 });
    console.log(`✅ Recovery file saved securely to: ${recoveryPath}`);

    console.log("\n===============================================================");
    console.log("🎉 Registration Successful!");
    console.log("===============================================================");
    console.log("Add the following to web/.env.local (never commit this file):");
    console.log(`CIRCLE_API_KEY=${apiKey}`);
    console.log(`CIRCLE_ENTITY_SECRET=${entitySecret}`);
    console.log("===============================================================");
    console.log("Next step: run 'pnpm circle:setup' to create the Lumbung wallet.\n");
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error("❌ Registration error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
