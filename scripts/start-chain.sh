#!/bin/bash
# scripts/start-chain.sh
# Starts the Hardhat node and deploys the contract automatically.
# Usage: npm run chain
# Keep this terminal open while using the app.

set -e

# Compile contracts first (before starting node)
echo ""
echo "Compiling contracts..."
npx hardhat compile

# Kill any existing Hardhat node on port 8545
if lsof -ti:8545 >/dev/null 2>&1; then
  echo "Stopping existing process on port 8545..."
  lsof -ti:8545 | xargs kill -9 2>/dev/null || true
  sleep 1
fi

echo ""
echo "Starting Hardhat node..."
npx hardhat node &
HARDHAT_PID=$!

# Wait until port 8545 is accepting connections
echo "Waiting for node to be ready..."
for i in $(seq 1 20); do
  if curl -sf -X POST http://127.0.0.1:8545 \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' \
    >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

echo ""
echo "Deploying contract..."
npx tsx scripts/deploy.ts

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Chain is ready. contractConfig.ts has been updated."
echo " Open a new terminal and run: npm run dev"
echo " Leave this terminal open."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Keep the Hardhat node running in foreground
wait $HARDHAT_PID
