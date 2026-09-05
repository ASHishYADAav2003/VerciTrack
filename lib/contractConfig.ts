// lib/contractConfig.ts
import { defineChain } from "viem";

// ── Local Hardhat chain ────────────────────────────────────────────────────────
export const hardhatLocalhost = defineChain({
  id: 31337,
  name: "Hardhat Localhost",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
  },
});

// ── Sepolia testnet ────────────────────────────────────────────────────────────
export const sepoliaChain = defineChain({
  id: 11155111,
  name: "Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? process.env.SEPOLIA_RPC_URL ?? "https://rpc.sepolia.org"],
    },
  },
  blockExplorers: {
    default: { name: "Etherscan", url: "https://sepolia.etherscan.io" },
  },
  testnet: true,
});

// ── Active network — set NEXT_PUBLIC_CHAIN=sepolia in .env.local for Sepolia ──
const CHAIN = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_CHAIN) ?? "local";

export const activeChain   = CHAIN === "sepolia" ? sepoliaChain : hardhatLocalhost;
export const RPC_URL       = CHAIN === "sepolia"
  ? (process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? process.env.SEPOLIA_RPC_URL ?? "https://rpc.sepolia.org")
  : "http://127.0.0.1:8545";

// ── Contract addresses ─────────────────────────────────────────────────────────
// Auto-updated by scripts/deploy.ts after every `npm run chain`
const LOCAL_CONTRACT_ADDRESS   = "0x5fbdb2315678afecb367f032d93f642f64180aa3" as `0x${string}`;
// Set by scripts/deploy-sepolia.ts after first Sepolia deploy — commit this value
const SEPOLIA_CONTRACT_ADDRESS = "" as `0x${string}`;

export const CONTRACT_ADDRESS: `0x${string}` = CHAIN === "sepolia"
  ? SEPOLIA_CONTRACT_ADDRESS
  : LOCAL_CONTRACT_ADDRESS;

export const CONTRACT_ABI = [
  // ── registerBatch ─────────────────────────────────────────────────────────
  // _extParams[9]: diastase×10, freeAcidity×10, proline, conductivity×1000,
  //   fructoseGlucose×10, reducingSugars×10, sucrose×10, ash×1000, isotopicDiff×100
  {
    name: "registerBatch",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_batchId",             type: "string"     },
      { name: "_farmerName",       type: "string"     },
      { name: "_origin",              type: "string"     },
      { name: "_coffeeType",           type: "string"     },
      { name: "_pdfHash",             type: "string"     },
      { name: "_producerDeclaration", type: "string"     },
      { name: "_humidity",            type: "uint256"    },
      { name: "_hmf",                 type: "uint256"    },
      { name: "_colour",              type: "uint256"    },
      { name: "_harvestYear",         type: "uint256"    },
      { name: "_extParams",           type: "uint256[9]" },
      { name: "_qualityScore",        type: "uint256"    },
      { name: "_qualityTier",         type: "string"     },
      { name: "_priceWei",            type: "uint256"    },
      { name: "_jarSizeG",            type: "uint256"    },
      { name: "_totalStock",          type: "uint256"    },
    ],
    outputs: [],
  },

  // ── updateBatch ───────────────────────────────────────────────────────────
  {
    name: "updateBatch",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_batchId",             type: "string"     },
      { name: "_farmerName",       type: "string"     },
      { name: "_origin",              type: "string"     },
      { name: "_coffeeType",           type: "string"     },
      { name: "_pdfHash",             type: "string"     },
      { name: "_producerDeclaration", type: "string"     },
      { name: "_humidity",            type: "uint256"    },
      { name: "_hmf",                 type: "uint256"    },
      { name: "_colour",              type: "uint256"    },
      { name: "_harvestYear",         type: "uint256"    },
      { name: "_extParams",           type: "uint256[9]" },
      { name: "_qualityScore",        type: "uint256"    },
      { name: "_qualityTier",         type: "string"     },
      { name: "_priceWei",            type: "uint256"    },
      { name: "_jarSizeG",            type: "uint256"    },
      { name: "_totalStock",          type: "uint256"    },
    ],
    outputs: [],
  },

  // ── purchaseBatch ─────────────────────────────────────────────────────────
  {
    name: "purchaseBatch",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "_batchId", type: "string" }],
    outputs: [],
  },

  // ── getBatchCore ──────────────────────────────────────────────────────────
  {
    name: "getBatchCore",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_batchId", type: "string" }],
    outputs: [
      { name: "batchId",             type: "string" },
      { name: "farmerName",       type: "string" },
      { name: "origin",              type: "string" },
      { name: "coffeeType",           type: "string" },
      { name: "pdfHash",             type: "string" },
      { name: "producerDeclaration", type: "string" },
      { name: "exists",              type: "bool"   },
    ],
  },

  // ── getBatchMetrics ───────────────────────────────────────────────────────
  {
    name: "getBatchMetrics",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_batchId", type: "string" }],
    outputs: [
      { name: "humidity",     type: "uint256" },
      { name: "hmf",          type: "uint256" },
      { name: "colour",       type: "uint256" },
      { name: "harvestYear",  type: "uint256" },
      { name: "timestamp",    type: "uint256" },
      { name: "registeredBy", type: "address" },
    ],
  },

  // ── getBatchQuality ───────────────────────────────────────────────────────
  {
    name: "getBatchQuality",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_batchId", type: "string" }],
    outputs: [
      { name: "qualityScore",     type: "uint256" },
      { name: "qualityTier",      type: "string"  },
      { name: "humidity",         type: "uint256" },
      { name: "hmf",              type: "uint256" },
      { name: "diastase",         type: "uint256" },
      { name: "freeAcidity",      type: "uint256" },
      { name: "proline",          type: "uint256" },
      { name: "conductivity",     type: "uint256" },
      { name: "fructoseGlucose",  type: "uint256" },
      { name: "reducingSugars",   type: "uint256" },
      { name: "sucrose",          type: "uint256" },
      { name: "ash",              type: "uint256" },
      { name: "isotopicDiff",     type: "uint256" },
      { name: "colour",           type: "uint256" },
    ],
  },

  // ── getBatchListing ───────────────────────────────────────────────────────
  {
    name: "getBatchListing",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_batchId", type: "string" }],
    outputs: [
      { name: "priceWei",     type: "uint256" },
      { name: "jarSizeG",     type: "uint256" },
      { name: "totalStock",   type: "uint256" },
      { name: "soldCount",    type: "uint256" },
      { name: "harvestYear",  type: "uint256" },
      { name: "registeredBy", type: "address" },
    ],
  },

  // ── getPurchaseHistory ────────────────────────────────────────────────────
  {
    name: "getPurchaseHistory",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_batchId", type: "string" }],
    outputs: [
      { name: "buyers",      type: "address[]" },
      { name: "pricesPaid",  type: "uint256[]" },
      { name: "timestamps",  type: "uint256[]" },
    ],
  },

  // ── getAllBatchIds ─────────────────────────────────────────────────────────
  {
    name: "getAllBatchIds",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string[]" }],
  },

  // ── Events ────────────────────────────────────────────────────────────────
  {
    name: "BatchRegistered",
    type: "event",
    inputs: [
      { name: "batchId",      type: "string",  indexed: false },
      { name: "coffeeType",    type: "string",  indexed: false },
      { name: "origin",       type: "string",  indexed: false },
      { name: "qualityScore", type: "uint256", indexed: false },
      { name: "qualityTier",  type: "string",  indexed: false },
      { name: "timestamp",    type: "uint256", indexed: false },
      { name: "registeredBy", type: "address", indexed: false },
    ],
  },
  {
    name: "BatchPurchased",
    type: "event",
    inputs: [
      { name: "batchId",         type: "string",  indexed: false },
      { name: "buyer",           type: "address", indexed: false },
      { name: "farmerWallet", type: "address", indexed: false },
      { name: "pricePaid",       type: "uint256", indexed: false },
      { name: "timestamp",       type: "uint256", indexed: false },
    ],
  },
  {
    name: "BatchUpdated",
    type: "event",
    inputs: [
      { name: "batchId",      type: "string",  indexed: false },
      { name: "qualityScore", type: "uint256", indexed: false },
      { name: "qualityTier",  type: "string",  indexed: false },
      { name: "timestamp",    type: "uint256", indexed: false },
      { name: "updatedBy",    type: "address", indexed: false },
    ],
  },
] as const;
