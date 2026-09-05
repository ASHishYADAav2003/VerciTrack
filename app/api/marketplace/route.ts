// app/api/marketplace/route.ts
// All batch data comes from the blockchain.
// Display-only extras (image, EUR price, description, certificate URL) from batchExtras.json.

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { CONTRACT_ADDRESS, CONTRACT_ABI, activeChain, RPC_URL } from "@/lib/contractConfig";
import { scoreCoffee, type LabParams } from "@/lib/coffeeQuality";
import { cacheGet, cacheSet } from "@/lib/apiCache";
import path from "path";
import fs from "fs/promises";

const ordersPath = path.join(process.cwd(), "data", "orders.json");
const extrasPath = path.join(process.cwd(), "data", "batchExtras.json");

function publicClient() {
  return createPublicClient({ chain: activeChain, transport: http(RPC_URL) });
}

async function readOrders(): Promise<any[]> {
  try { return JSON.parse(await fs.readFile(ordersPath, "utf-8")); } catch { return []; }
}

async function readExtras(): Promise<Record<string, any>> {
  try { return JSON.parse(await fs.readFile(extrasPath, "utf-8")); } catch { return {}; }
}

function decode(x: bigint | undefined | null): number | null {
  if (x == null) return null;
  const n = Number(x);
  return n === 0 ? null : n;
}

// Build a full batch record from contract reads + sidecar extras
async function fetchBatch(client: ReturnType<typeof publicClient>, batchId: string, extras: Record<string, any>) {
  const [core, quality, listing] = await Promise.all([
    client.readContract({ address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: "getBatchCore",    args: [batchId] }),
    client.readContract({ address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: "getBatchQuality", args: [batchId] }),
    client.readContract({ address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: "getBatchListing", args: [batchId] }),
  ]) as [any, any, any];

  if (!core[6]) return null; // exists === false

  // Decode quality params (stored as scaled integers)
  const humidity        = decode(quality[2])  ? Number(quality[2])  / 10 : null;
  const hmf             = decode(quality[3])  ? Number(quality[3])  / 10 : null;
  const diastase        = decode(quality[4])  ? Number(quality[4])  / 10 : null;
  const freeAcidity     = decode(quality[5])  ? Number(quality[5])  / 10 : null;
  const proline         = decode(quality[6])  ? Number(quality[6])       : null;
  const conductivity    = decode(quality[7])  ? Number(quality[7])  / 1000 : null;
  const fructoseGlucose = decode(quality[8])  ? Number(quality[8])  / 10 : null;
  const reducingSugars  = decode(quality[9])  ? Number(quality[9])  / 10 : null;
  const sucrose         = decode(quality[10]) ? Number(quality[10]) / 10 : null;
  const ash             = decode(quality[11]) ? Number(quality[11]) / 1000 : null;
  const isotopicDiff    = decode(quality[12]) ? Number(quality[12]) / 100 : null;
  const colour          = decode(quality[13]) ? Number(quality[13])       : null;

  const qualityScore = Number(quality[0]) || null;
  const qualityTier  = (quality[1] as string) || null;

  // Re-compute breakdown + flags for display (not stored on-chain)
  const labParams: LabParams = {
    hmf, water: humidity, diastase, freeAcidity, proline, conductivity,
    fructoseGlucose, sucrose, colour,
    coffeeType: core[3] as string,
  };
  const hasLab = Object.values(labParams).some(v => v !== null && v !== "");
  const scored = hasLab ? scoreCoffee(labParams) : null;

  const ex = extras[batchId] ?? {};
  const jarSizeG = Number(listing[1]) || ex.jarSizeG || null;

  return {
    batchId:          core[0] as string,
    farmerName:    core[1] as string,
    origin:           core[2] as string,
    coffeeType:        core[3] as string,
    pdfHash:          core[4] as string,
    producerDeclaration: core[5] as string,
    name:             `${core[3]} Coffee`,
    harvestYear:      Number(listing[4]) || null,
    // Marketplace display (from extras)
    description:      ex.description   ?? null,
    price:            ex.price         ?? null,
    image:            ex.image         ?? null,
    certificateUrl:   ex.certificateUrl ?? null,
    pdfName:          ex.pdfName        ?? null,
    weight:           jarSizeG ? `${jarSizeG}g` : (ex.weight ?? null),
    jarSizeG,
    // Stock (from blockchain)
    totalStock:       Number(listing[2]) || null,
    soldCount:        Number(listing[3]) || 0,
    // Quality (from blockchain)
    qualityScore,
    qualityTier,
    qualityStatus:    !scored ? "Unknown" : !scored.compliant ? "Failed" : scored.flags.length > 0 ? "Caution" : "Passed",
    qualityBreakdown: scored?.breakdown ?? null,
    qualityFlags:     scored?.flags     ?? [],
    // Lab values (decoded from blockchain)
    humidity, hmf, diastase, freeAcidity, proline,
    conductivity, fructoseGlucose, reducingSugars, sucrose, ash, isotopicDiff, colour,
    // Status — everything on-chain is approved
    approvalStatus:   "approved",
    status:           "Verified",
    createdAt:        ex.createdAt  ?? null,
    approvedAt:       ex.approvedAt ?? null,
    txHash:           null,
  };
}

// GET — read all batches from blockchain (cached 15 s)
export async function GET(req: NextRequest) {
  const cached = cacheGet("marketplace:all");
  if (cached) return NextResponse.json(cached);

  try {
    const client  = publicClient();
    const [allIds, extras, orders] = await Promise.all([
      client.readContract({ address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: "getAllBatchIds", args: [] }) as Promise<string[]>,
      readExtras(),
      readOrders(),
    ]);

    const soldMap: Record<string, number> = {};
    for (const o of orders) {
      if (o.batchId) soldMap[o.batchId] = (soldMap[o.batchId] || 0) + (Number(o.quantity) || 0);
    }

    const results = await Promise.allSettled(
      allIds.map(id => fetchBatch(client, id, extras))
    );

    const batches = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value !== null)
      .map(r => ({
        ...r.value,
        sold:      soldMap[r.value.batchId] || 0,
        remaining: r.value.totalStock != null
          ? r.value.totalStock - (soldMap[r.value.batchId] || 0)
          : null,
      }));

    cacheSet("marketplace:all", batches, 15_000);
    return NextResponse.json(batches);
  } catch (err) {
    console.error("[marketplace GET] blockchain error:", err);
    return NextResponse.json(
      { error: "Could not reach blockchain. Make sure Hardhat is running: npm run chain" },
      { status: 503 }
    );
  }
}

// POST — kept for backward compat but now only saves extras (no full batch record)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.batchId) return NextResponse.json({ error: "batchId required" }, { status: 400 });

    const extras = await readExtras();
    extras[body.batchId] = {
      description:    body.description    ?? null,
      price:          body.price          ?? null,
      image:          body.image          ?? null,
      certificateUrl: body.certificateUrl ?? null,
      pdfName:        body.pdfName        ?? null,
      pdfHash:        body.pdfHash        ?? null,
      jarSizeG:       body.jarSizeG       ?? null,
      wholesaleQty:   body.wholesaleQty   ?? null,
      wholesaleUnit:  body.wholesaleUnit  ?? "kg",
      weight:         body.weight         ?? null,
      createdAt:      extras[body.batchId]?.createdAt ?? new Date().toISOString(),
      approvedAt:     new Date().toISOString(),
    };
    await fs.mkdir(path.dirname(extrasPath), { recursive: true });
    await fs.writeFile(extrasPath, JSON.stringify(extras, null, 2));

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}
