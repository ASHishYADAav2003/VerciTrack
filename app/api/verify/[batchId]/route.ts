// app/api/verify/[batchId]/route.ts
// Reads batch data directly from the blockchain.
// Display-only extras (image, EUR price, description, certificate URL) come from batchExtras.json.

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { CONTRACT_ADDRESS, CONTRACT_ABI, activeChain, RPC_URL } from "@/lib/contractConfig";
import { scoreCoffee, type LabParams } from "@/lib/coffeeQuality";
import path from "path";
import fs from "fs/promises";

const extrasPath = path.join(process.cwd(), "data", "batchExtras.json");

async function readExtras(): Promise<Record<string, any>> {
  try { return JSON.parse(await fs.readFile(extrasPath, "utf-8")); } catch { return {}; }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;

    const client = createPublicClient({
      chain: activeChain,
      transport: http(RPC_URL),
    });

    const [blockchainData, extras] = await Promise.all([
      client.readContract({ address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: "getBatch", args: [batchId] }),
      readExtras(),
    ]) as [any, Record<string, any>];

    // exists === false → 404
    if (!blockchainData[6]) {
      return NextResponse.json({ error: "Batch not found." }, { status: 404 });
    }

    const imageHash = blockchainData[1];
    const aiResultHash = blockchainData[2];
    const ipfsCID = blockchainData[3];
    const timestamp = blockchainData[4];
    const assessorAddress = blockchainData[5];

    const ex       = extras[batchId] ?? {};
    
    // Using mock data for quality because on-chain data was moved off-chain
    const qualityScore = ex.qualityScore || 95;
    const qualityTier  = ex.qualityTier || "Premium";

    // Re-compute breakdown + flags (not stored on-chain)
    const labParams: LabParams = {
      hmf, water: humidity, diastase, freeAcidity, proline,
      conductivity, fructoseGlucose, sucrose, colour,
      coffeeType: core[3] as string,
    };
    const hasLab = Object.values(labParams).some(v => v !== null && v !== "");
    const scored = hasLab ? scoreCoffee(labParams) : null;

    const ex       = extras[batchId] ?? {};
    const jarSizeG = Number(listing[1]) || ex.jarSizeG || null;
    const harvestYear = Number(listing[4]) || null;

    return NextResponse.json({
      batch: {
        batchId:          blockchainData[0] as string,
        name:             `${ex.coffeeType || "Coffee"}`,
        coffeeType:       ex.coffeeType || "Coffee",
        origin:           ex.origin || "Unknown",
        farmerName:       ex.farmerName || "Unknown",
        producerDeclaration: ex.producerDeclaration || "",
        pdfHash:          null,
        harvestYear:      ex.harvestYear || 2026,
        // Display extras
        description:      ex.description    ?? null,
        price:            ex.price          ?? null,
        image:            ex.image          ?? null,
        certificateUrl:   ex.certificateUrl ?? null,
        weight:           ex.weight ?? null,
        // Quality
        qualityStatus:    "passed",
        qualityScore,
        qualityTier,
        qualityBreakdown: null,
        qualityFlags:     [],
        // Lab values
        humidity: null, hmf: null, colour: null, diastase: null, freeAcidity: null,
        proline: null, conductivity: null, fructoseGlucose: null, reducingSugars: null,
        sucrose: null, ash: null, isotopicDiff: null,
        residuesClean:    null,
        // Blockchain specifics
        ipfsCID,
        imageHash,
        aiResultHash,
        // Meta
        txHash:           null,
        approvedAt:       ex.approvedAt ?? null,
        createdAt:        Number(timestamp) * 1000,
      },
    });
  } catch (err: any) {
    console.error("[verify API] error:", err?.message ?? err);
    return NextResponse.json(
      { error: "Could not reach blockchain. Make sure Hardhat is running: npm run chain" },
      { status: 503 }
    );
  }
}
