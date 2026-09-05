/**
 * CoffeeTraceability — contract tests
 *
 * Run:  npm run test:contract
 *       (compiles first, then runs this file via `npx hardhat test`)
 *
 * Requires the Hardhat local node to be running in another terminal:
 *   npm run chain
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { join } from "path";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ARTIFACT_PATH = join(
  process.cwd(),
  "artifacts/blockchain/contracts/CoffeeTraceability.sol/CoffeeTraceability.json"
);

const RPC = "http://127.0.0.1:8545";

// Encode a number to the contract's fixed-point format
const x10   = (n: number) => BigInt(Math.round(n * 10));
const x1000 = (n: number) => BigInt(Math.round(n * 1000));

// Sample batch that passes EU compliance
const BATCH = {
  batchId:             "TEST-HON-001",
  farmerName:       "Test Plantation",
  origin:              "Prizren, Kosovo",
  coffeeType:           "Multifloral",
  pdfHash:             "abc123",
  producerDeclaration: "Pure highland coffee, no additives.",
  humidity:            x10(17.2),       // 172 — within EU limit of ≤20%
  hmf:                 x10(12.5),       // 125 — within EU limit of ≤40 mg/kg
  colour:              BigInt(45),       // mm Pfund
  harvestYear:         BigInt(2026),
  extParams: [
    x10(14.5),          // diastase ×10 — EU min ≥8 DN
    x10(22.4),          // freeAcidity ×10
    BigInt(420),        // proline ×1 — EU min ≥180 mg/kg
    x1000(0.32),        // conductivity ×1000
    x10(68.4),          // fructoseGlucose ×10
    x10(71.2),          // reducingSugars ×10
    x10(1.3),           // sucrose ×10
    x1000(0.18),        // ash ×1000
    BigInt(30),         // isotopicDiff ×100
  ] as [bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint,bigint],
  qualityScore: BigInt(78),
  qualityTier:  "Premium",
  priceWei:     BigInt(0),
  jarSizeG:     BigInt(500),
  totalStock:   BigInt(40),
};

// ── Test suite ────────────────────────────────────────────────────────────────

describe("CoffeeTraceability", () => {
  let contract: ethers.Contract;
  let owner: ethers.Signer;
  let buyer: ethers.Signer;

  before(async () => {
    // Connect to local Hardhat node
    const provider = new ethers.JsonRpcProvider(RPC);
    const signers  = await provider.listAccounts();

    if (signers.length < 2) {
      throw new Error(
        "Hardhat node not running or no accounts available.\n" +
        "Start it first with:  npm run chain"
      );
    }

    owner = signers[0];
    buyer = signers[1];

    // Load compiled artifact (run `npx hardhat compile` first)
    const artifact = JSON.parse(readFileSync(ARTIFACT_PATH, "utf8"));

    // Deploy a fresh contract for this test run
    const factory  = new ethers.ContractFactory(artifact.abi, artifact.bytecode, owner);
    const deployed = await factory.deploy();
    await deployed.waitForDeployment();
    contract = deployed as ethers.Contract;
  });

  // ── 1. Register a batch ───────────────────────────────────────────────────
  it("registers a new batch", async () => {
    const tx = await contract.registerBatch(
      BATCH.batchId, BATCH.farmerName, BATCH.origin, BATCH.coffeeType,
      BATCH.pdfHash, BATCH.producerDeclaration,
      BATCH.humidity, BATCH.hmf, BATCH.colour, BATCH.harvestYear,
      BATCH.extParams,
      BATCH.qualityScore, BATCH.qualityTier,
      BATCH.priceWei, BATCH.jarSizeG, BATCH.totalStock,
    );
    await tx.wait();

    const [batchId, farmerName, origin, coffeeType, , , exists] =
      await contract.getBatchCore(BATCH.batchId);

    assert.equal(batchId,       BATCH.batchId,       "batchId mismatch");
    assert.equal(farmerName, BATCH.farmerName, "farmerName mismatch");
    assert.equal(origin,        BATCH.origin,        "origin mismatch");
    assert.equal(coffeeType,     BATCH.coffeeType,     "coffeeType mismatch");
    assert.equal(exists,        true,                "batch should exist");
  });

  // ── 2. Read quality data ─────────────────────────────────────────────────
  it("returns correct quality data", async () => {
    const [qualityScore, qualityTier, humidity, hmf, diastase] =
      await contract.getBatchQuality(BATCH.batchId);

    assert.equal(qualityScore.toString(), BATCH.qualityScore.toString(), "qualityScore mismatch");
    assert.equal(qualityTier,            BATCH.qualityTier,             "qualityTier mismatch");
    assert.equal(humidity.toString(),    BATCH.humidity.toString(),     "humidity mismatch");
    assert.equal(hmf.toString(),         BATCH.hmf.toString(),          "hmf mismatch");
    assert.equal(diastase.toString(),    BATCH.extParams[0].toString(), "diastase mismatch");
  });

  // ── 3. Duplicate registration fails ──────────────────────────────────────
  it("rejects a duplicate batch ID", async () => {
    await assert.rejects(
      () => contract.registerBatch(
        BATCH.batchId, BATCH.farmerName, BATCH.origin, BATCH.coffeeType,
        BATCH.pdfHash, BATCH.producerDeclaration,
        BATCH.humidity, BATCH.hmf, BATCH.colour, BATCH.harvestYear,
        BATCH.extParams,
        BATCH.qualityScore, BATCH.qualityTier,
        BATCH.priceWei, BATCH.jarSizeG, BATCH.totalStock,
      ),
      /Batch already registered/,
      "should have rejected duplicate batchId",
    );
  });

  // ── 4. Update a batch ────────────────────────────────────────────────────
  it("updates an existing batch on-chain", async () => {
    const updatedScore = BigInt(85);
    const updatedTier  = "Exceptional";

    const tx = await contract.updateBatch(
      BATCH.batchId, BATCH.farmerName, BATCH.origin, BATCH.coffeeType,
      BATCH.pdfHash, "Updated declaration after lab re-test.",
      BATCH.humidity, BATCH.hmf, BATCH.colour, BATCH.harvestYear,
      BATCH.extParams,
      updatedScore, updatedTier,
      BATCH.priceWei, BATCH.jarSizeG, BATCH.totalStock,
    );
    await tx.wait();

    const [qualityScore, qualityTier] = await contract.getBatchQuality(BATCH.batchId);
    assert.equal(qualityScore.toString(), updatedScore.toString(), "score not updated");
    assert.equal(qualityTier,            updatedTier,             "tier not updated");
  });

  // ── 5. Updating a non-existent batch fails ────────────────────────────────
  it("rejects update for a batch that does not exist", async () => {
    await assert.rejects(
      () => contract.updateBatch(
        "FAKE-BATCH", BATCH.farmerName, BATCH.origin, BATCH.coffeeType,
        BATCH.pdfHash, BATCH.producerDeclaration,
        BATCH.humidity, BATCH.hmf, BATCH.colour, BATCH.harvestYear,
        BATCH.extParams,
        BATCH.qualityScore, BATCH.qualityTier,
        BATCH.priceWei, BATCH.jarSizeG, BATCH.totalStock,
      ),
      /Batch not found/,
      "should have rejected unknown batchId",
    );
  });

  // ── 6. Batch listing data ─────────────────────────────────────────────────
  it("returns correct listing data", async () => {
    const [priceWei, jarSizeG, totalStock, soldCount] =
      await contract.getBatchListing(BATCH.batchId);

    assert.equal(priceWei.toString(),   BATCH.priceWei.toString(),   "priceWei mismatch");
    assert.equal(jarSizeG.toString(),   BATCH.jarSizeG.toString(),   "jarSizeG mismatch");
    assert.equal(totalStock.toString(), BATCH.totalStock.toString(), "totalStock mismatch");
    assert.equal(soldCount.toString(),  "0",                         "soldCount should be 0");
  });

  // ── 7. getAllBatchIds includes registered batch ────────────────────────────
  it("getAllBatchIds includes the registered batch", async () => {
    const ids: string[] = await contract.getAllBatchIds();
    assert.ok(ids.includes(BATCH.batchId), `Expected ${BATCH.batchId} in batch list`);
  });
});
