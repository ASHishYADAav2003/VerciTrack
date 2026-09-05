import { defineConfig } from "hardhat/config";
import "dotenv/config";

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY
  ? ([process.env.DEPLOYER_PRIVATE_KEY] as `0x${string}`[])
  : [];

export default defineConfig({
  solidity: {
    version: "0.8.28",
    settings: {
      viaIR: true,
      optimizer: { enabled: true, runs: 200 },
    },
  },
  paths: {
    sources: "./blockchain/contracts",
  },
  networks: {
    localhost: {
      type: "http",
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_RPC_URL ?? "https://rpc.sepolia.org",
      accounts: DEPLOYER_KEY,
    },
  },
});
