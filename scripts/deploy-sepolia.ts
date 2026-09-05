// scripts/deploy-sepolia.ts
// Deploy CoffeeTraceability contract to Sepolia testnet.
// Usage: npm run deploy:sepolia
//
// Required in .env.local:
//   DEPLOYER_PRIVATE_KEY=0x...   (your wallet private key — needs Sepolia ETH)
//   SEPOLIA_RPC_URL=https://...  (Alchemy / Infura / public RPC)

import { createWalletClient, createPublicClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";

// Load .env.local
config({ path: join(process.cwd(), ".env.local") });

const PRIVATE_KEY  = process.env.DEPLOYER_PRIVATE_KEY;
const RPC_URL      = process.env.SEPOLIA_RPC_URL ?? "https://rpc.sepolia.org";

if (!PRIVATE_KEY) {
  console.error("ERROR: DEPLOYER_PRIVATE_KEY not set in .env.local");
  process.exit(1);
}

const sepolia = defineChain({
  id: 11155111,
  name: "Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: "Etherscan", url: "https://sepolia.etherscan.io" } },
  testnet: true,
});

async function main() {
  const artifactPath = join(
    process.cwd(),
    "artifacts", "blockchain", "contracts",
    "CoffeeTraceability.sol", "CoffeeTraceability.json"
  );

  let artifact: any;
  try {
    artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  } catch {
    throw new Error(`Artifact not found. Run: npx hardhat compile`);
  }

  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
  console.log(`\nDeployer: ${account.address}`);

  const pub = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });

  // Check balance
  const balance = await pub.getBalance({ address: account.address });
  const ethBalance = Number(balance) / 1e18;
  console.log(`Balance:  ${ethBalance.toFixed(4)} ETH`);
  if (ethBalance < 0.01) {
    console.error("ERROR: Not enough Sepolia ETH. Get some from https://sepoliafaucet.com");
    process.exit(1);
  }

  const wallet = createWalletClient({ account, chain: sepolia, transport: http(RPC_URL) });

  console.log("\nDeploying CoffeeTraceability to Sepolia...");
  const hash = await wallet.sendTransaction({
    data: artifact.bytecode as `0x${string}`,
    gas: 8_000_000n,
  });

  console.log(`Transaction: https://sepolia.etherscan.io/tx/${hash}`);
  console.log("Waiting for confirmation...");

  const receipt = await pub.waitForTransactionReceipt({ hash, confirmations: 2 });
  const address = receipt.contractAddress;
  if (!address) throw new Error("No contract address in receipt");

  console.log(`\nOK: Contract deployed: ${address}`);
  console.log(`    Etherscan: https://sepolia.etherscan.io/address/${address}`);

  // Auto-update SEPOLIA_CONTRACT_ADDRESS in lib/contractConfig.ts
  const configPath = join(process.cwd(), "lib", "contractConfig.ts");
  let configSrc = readFileSync(configPath, "utf-8");
  configSrc = configSrc.replace(
    /(const SEPOLIA_CONTRACT_ADDRESS\s*=\s*)"[^"]*"/,
    `$1"${address}"`
  );
  writeFileSync(configPath, configSrc);
  console.log(`OK: contractConfig.ts updated — SEPOLIA_CONTRACT_ADDRESS = ${address}`);
  console.log(`\nNext steps:`);
  console.log(`    1. Commit contractConfig.ts to GitHub`);
  console.log(`    2. Add to .env.local:  NEXT_PUBLIC_CHAIN=sepolia`);
  console.log(`    3. Add to .env.local:  SEPOLIA_RPC_URL=${RPC_URL}`);
  console.log(`    4. Restart:  npm run dev\n`);
}

main().catch((err) => {
  console.error("Deploy failed:", err.shortMessage ?? err.message ?? err);
  process.exit(1);
});
