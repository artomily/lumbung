#!/usr/bin/env bash
set -euo pipefail

# LumbungVault funding script for Arc Testnet
# Deposits test USDC into LumbungVault via deposit(uint256,bytes32) with ref="seed"

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
USDC_ADDRESS="${USDC_ADDRESS:-0x3600000000000000000000000000000000000000}"

# Determine vault address
VAULT_ADDRESS="${LUMBUNG_VAULT_ADDRESS:-}"
DEPLOYMENT_FILE="${CONTRACTS_DIR}/deployments/arc-testnet.json"

if [ -z "${VAULT_ADDRESS}" ] && [ -f "${DEPLOYMENT_FILE}" ]; then
    VAULT_ADDRESS=$(node -e "
    const fs = require('fs');
    const d = JSON.parse(fs.readFileSync('${DEPLOYMENT_FILE}', 'utf8'));
    console.log(d.vaultAddress || '');
    ")
fi

if [ -z "${VAULT_ADDRESS}" ] || [ "${VAULT_ADDRESS}" = "null" ]; then
    echo "ERROR: Vault address not found. Either deploy first (deploy.sh) or set LUMBUNG_VAULT_ADDRESS."
    exit 1
fi

PRIVATE_KEY="${FUNDING_PRIVATE_KEY:-${DEPLOYER_PRIVATE_KEY:-}}"
if [ -z "${PRIVATE_KEY}" ]; then
    echo "ERROR: Neither FUNDING_PRIVATE_KEY nor DEPLOYER_PRIVATE_KEY is set."
    echo "Please provide a private key funded with Arc testnet USDC from https://faucet.circle.com."
    exit 1
fi

# Amount in micro-USDC (default: 100 USDC = 100_000_000 micro-USDC)
AMOUNT="${AMOUNT_MICRO_USDC:-100000000}"

# Tool selection (arc-cast or cast)
CAST_BIN="arc-cast"
if ! command -v "${CAST_BIN}" &> /dev/null; then
    CAST_BIN="cast"
fi

echo "=== LumbungVault Funding Script ==="
echo "Vault Address:  ${VAULT_ADDRESS}"
echo "USDC Address:   ${USDC_ADDRESS}"
echo "Deposit Amount: ${AMOUNT} micro-USDC ($(( AMOUNT / 1000000 )) USDC)"
echo "RPC URL:        ${RPC_URL}"

# 1. Approve USDC transfer to LumbungVault
echo "Step 1: Approving USDC spend..."
"${CAST_BIN}" send "${USDC_ADDRESS}" "approve(address,uint256)" "${VAULT_ADDRESS}" "${AMOUNT}" \
    --rpc-url "${RPC_URL}" \
    --private-key "${PRIVATE_KEY}" \
    --gas-price 25gwei \
    --priority-gas-price 20gwei

# 2. Deposit into LumbungVault with ref = "seed"
# "seed" in bytes32: 0x7365656400000000000000000000000000000000000000000000000000000000
REF_BYTES32="0x7365656400000000000000000000000000000000000000000000000000000000"

echo "Step 2: Calling deposit(uint256,bytes32)..."
"${CAST_BIN}" send "${VAULT_ADDRESS}" "deposit(uint256,bytes32)" "${AMOUNT}" "${REF_BYTES32}" \
    --rpc-url "${RPC_URL}" \
    --private-key "${PRIVATE_KEY}" \
    --gas-price 25gwei \
    --priority-gas-price 20gwei

# 3. Read current balance
echo "Step 3: Verifying vault balance..."
CURRENT_BAL=$("${CAST_BIN}" call "${VAULT_ADDRESS}" "balance()(uint256)" --rpc-url "${RPC_URL}")

echo ""
echo "=== Vault Successfully Funded! ==="
echo "Current LumbungVault Balance: ${CURRENT_BAL} micro-USDC"
echo "View on explorer: https://explorer.testnet.arc.io/address/${VAULT_ADDRESS}"
