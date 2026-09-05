// scripts/deploy.ts — uses ethers v6 (avoids viem/ox ESM incompatibility with tsx)
import { ethers } from "ethers";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const RPC_URL   = "http://127.0.0.1:8545";
const DEPLOY_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

async function main() {
  const artifactPath = join(
    process.cwd(),
    "artifacts",
    "blockchain",
    "contracts",
    "CoffeeTraceability.sol",
    "CoffeeTraceability.json"
  );

  let artifact: any;
  try {
    artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  } catch {
    throw new Error(
      `Artifact not found at ${artifactPath}.\nRun: npx hardhat compile`
    );
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(DEPLOY_KEY, provider);

  console.log("Deploying CoffeeTraceability contract...");

  const factory  = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const address  = await contract.getAddress();

  console.log(`\nOK: CoffeeTraceability deployed to: ${address}`);

  // Auto-update lib/contractConfig.ts
  const configPath = join(process.cwd(), "lib", "contractConfig.ts");
  let config = readFileSync(configPath, "utf-8");
  config = config.replace(
    /(export const CONTRACT_ADDRESS\s*=\s*\n?\s*)"0x[a-fA-F0-9]+" as/,
    `$1"${address}" as`
  );
  writeFileSync(configPath, config);
  console.log(`OK: contractConfig.ts updated — address: ${address}`);
}

main().catch((err) => {
  console.error("Deploy failed:", err);
  process.exit(1);
});
