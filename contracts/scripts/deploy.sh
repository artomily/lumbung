#!/usr/bin/env bash
set -euo pipefail

# LumbungVault deployment script for Arc Testnet
# Enforces maxFeePerGas >= 20 gwei per Arc protocol requirements

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_ROOT="$(cd "${CONTRACTS_DIR}/.." && pwd)"

# Attempt to load env from web/.env.local or .env if present
if [ -f "${PROJECT_ROOT}/web/.env.local" ]; then
    echo "Loading env from ${PROJECT_ROOT}/web/.env.local"
    # shellcheck disable=SC1091
    set -a && source "${PROJECT_ROOT}/web/.env.local" && set +a
elif [ -f "${PROJECT_ROOT}/.env" ]; then
    echo "Loading env from ${PROJECT_ROOT}/.env"
    # shellcheck disable=SC1091
    set -a && source "${PROJECT_ROOT}/.env" && set +a
fi

RPC_URL="${ARC_RPC_URL:-https://rpc.testnet.arc.io}"
CHAIN_ID=5042002
USDC_ADDRESS="${USDC_ADDRESS:-0x3600000000000000000000000000000000000000}"

echo "=== LumbungVault Arc Testnet Deployment ==="
echo "RPC URL:        ${RPC_URL}"
echo "Chain ID:       ${CHAIN_ID}"
echo "USDC Address:   ${USDC_ADDRESS}"

# Validation
if [ -z "${DEPLOYER_PRIVATE_KEY:-}" ]; then
    echo "ERROR: DEPLOYER_PRIVATE_KEY is not set."
    echo "Please set DEPLOYER_PRIVATE_KEY in your environment or web/.env.local."
    exit 1
fi

if [ -z "${OWNER_ADDRESS:-}" ]; then
    echo "ERROR: OWNER_ADDRESS is not set."
    echo "Please set OWNER_ADDRESS in your environment or web/.env.local."
    exit 1
fi

if [ -z "${CIRCLE_AGENT_WALLET_ADDRESS:-}" ]; then
    echo "ERROR: CIRCLE_AGENT_WALLET_ADDRESS is not set."
    echo "Please run Lane B setup first (B2 scripts/circle-setup.ts) to generate the agent wallet."
    exit 1
fi

echo "Owner Address:  ${OWNER_ADDRESS}"
echo "Agent Address:  ${CIRCLE_AGENT_WALLET_ADDRESS}"

# Choose forge binary (arc-forge or forge)
FORGE_BIN="arc-forge"
if ! command -v "${FORGE_BIN}" &> /dev/null; then
    FORGE_BIN="forge"
fi

echo "Using compiler: ${FORGE_BIN}"

cd "${CONTRACTS_DIR}"

# Arc mempool silently drops maxFeePerGas < 20 gwei.
# We set with-gas-price to 25 gwei and priority-gas-price to 20 gwei.
echo "Broadcasting deployment transaction to Arc testnet..."
DEPLOY_OUTPUT=$("${FORGE_BIN}" script script/Deploy.s.sol:DeployScript \
    --rpc-url "${RPC_URL}" \
    --broadcast \
    --with-gas-price 25gwei \
    --priority-gas-price 20gwei \
    -vvv)

echo "${DEPLOY_OUTPUT}"

# Locate broadcast artifact
BROADCAST_FILE="${CONTRACTS_DIR}/broadcast/Deploy.s.sol/${CHAIN_ID}/run-latest.json"

if [ ! -f "${BROADCAST_FILE}" ]; then
    echo "ERROR: Broadcast run file not found at ${BROADCAST_FILE}"
    exit 1
fi

# Extract deployed vault address from broadcast JSON using node
VAULT_ADDRESS=$(node -e "
const fs = require('fs');
const b = JSON.parse(fs.readFileSync('${BROADCAST_FILE}', 'utf8'));
const tx = b.transactions.find(t => t.contractName === 'LumbungVault');
if (!tx || !tx.contractAddress) {
    console.error('Could not find LumbungVault contractAddress in broadcast artifact');
    process.exit(1);
}
console.log(tx.contractAddress);
")

if [ -z "${VAULT_ADDRESS}" ]; then
    echo "ERROR: Failed to extract LumbungVault address."
    exit 1
fi

DEPLOYMENTS_DIR="${CONTRACTS_DIR}/deployments"
mkdir -p "${DEPLOYMENTS_DIR}"
DEPLOYMENT_FILE="${DEPLOYMENTS_DIR}/arc-testnet.json"

cat <<EOF > "${DEPLOYMENT_FILE}"
{
  "network": "arc-testnet",
  "chainId": ${CHAIN_ID},
  "vaultAddress": "${VAULT_ADDRESS}",
  "ownerAddress": "${OWNER_ADDRESS}",
  "agentAddress": "${CIRCLE_AGENT_WALLET_ADDRESS}",
  "usdcAddress": "${USDC_ADDRESS}",
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "explorerUrl": "https://explorer.testnet.arc.io/address/${VAULT_ADDRESS}"
}
EOF

echo ""
echo "=== Deployment Successful! ==="
echo "LumbungVault Address: ${VAULT_ADDRESS}"
echo "Deployment info saved to: ${DEPLOYMENT_FILE}"
echo "View on explorer: https://explorer.testnet.arc.io/address/${VAULT_ADDRESS}"
echo "Next step: Fund the vault (Task A4) using contracts/scripts/fund-vault.sh"
