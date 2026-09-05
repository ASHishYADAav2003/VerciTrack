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

    const [core, quality, listing, extras] = await Promise.all([
      client.readContract({ address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: "getBatchCore",    args: [batchId] }),
      client.readContract({ address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: "getBatchQuality", args: [batchId] }),
      client.readContract({ address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: "getBatchListing", args: [batchId] }),
      readExtras(),
    ]) as [any, any, any, Record<string, any>];

    // exists === false → 404
    if (!core[6]) {
      return NextResponse.json({ error: "Batch not found." }, { status: 404 });
    }

    // Decode scaled integers
    const n = (x: bigint, divisor = 1) => Number(x) === 0 ? null : Number(x) / divisor;

    const humidity        = n(quality[2],  10);
    const hmf             = n(quality[3],  10);
    const diastase        = n(quality[4],  10);
    const freeAcidity     = n(quality[5],  10);
    const proline         = n(quality[6],   1);
    const conductivity    = n(quality[7],  1000);
    const fructoseGlucose = n(quality[8],  10);
    const reducingSugars  = n(quality[9],  10);
    const sucrose         = n(quality[10], 10);
    const ash             = n(quality[11], 1000);
    const isotopicDiff    = n(quality[12], 100);
    const colour          = n(quality[13],  1);

    const qualityScore = Number(quality[0]) || null;
    const qualityTier  = (quality[1] as string) || null;

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
        batchId:          core[0] as string,
        name:             `${core[3]} Coffee`,
        coffeeType:        core[3] as string,
        origin:           core[2] as string,
        farmerName:    core[1] as string,
        producerDeclaration: core[5] as string,
        pdfHash:          (core[4] as string) || null,
        harvestYear,
        // Display extras
        description:      ex.description    ?? null,
        price:            ex.price          ?? null,
        image:            ex.image          ?? null,
        certificateUrl:   ex.certificateUrl ?? null,
        weight:           jarSizeG ? `${jarSizeG}g` : (ex.weight ?? null),
        // Quality
        qualityStatus:    "passed",
        qualityScore,
        qualityTier,
        qualityBreakdown: scored?.breakdown ?? null,
        qualityFlags:     scored?.flags     ?? [],
        // Lab values
        humidity, hmf, colour, diastase, freeAcidity,
        proline, conductivity, fructoseGlucose, reducingSugars,
        sucrose, ash, isotopicDiff,
        residuesClean:    null,
        // Meta
        txHash:           null,
        approvedAt:       ex.approvedAt ?? null,
        createdAt:        ex.createdAt  ?? null,
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
