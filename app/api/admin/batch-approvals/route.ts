// app/api/admin/batch-approvals/route.ts
// Reads blockchain batches + farmer pending submissions.
// Approval status overrides stored in batchExtras.json.
// When admin clicks "Register on Blockchain", pending batch is pushed on-chain.
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CONTRACT_ADDRESS, CONTRACT_ABI, activeChain, RPC_URL } from "@/lib/contractConfig";
import { cacheGet, cacheSet, cacheInvalidate } from "@/lib/apiCache";
import { addBatchRecord } from "@/lib/mlScorer";
import { detectAdulteration } from "@/lib/adulterationDetector";
import path from "path";
import fs from "fs/promises";

// Hardhat account #0 — used server-side to push farmer batches on-chain
const DEPLOY_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const extrasPath   = path.join(process.cwd(), "data", "batchExtras.json");
const pendingPath  = path.join(process.cwd(), "data", "pendingBatches.json");
const historyPath  = path.join(process.cwd(), "data", "labHistory.json");

async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get("user_role")?.value === "admin";
}
function publicClient() {
  return createPublicClient({ chain: activeChain, transport: http(RPC_URL) });
}
async function readExtras(): Promise<Record<string, any>> {
  try { return JSON.parse(await fs.readFile(extrasPath, "utf-8")); } catch { return {}; }
}
async function writeExtras(data: Record<string, any>): Promise<void> {
  await fs.mkdir(path.dirname(extrasPath), { recursive: true });
  await fs.writeFile(extrasPath, JSON.stringify(data, null, 2));
}
async function readPending(): Promise<any[]> {
  try { return JSON.parse(await fs.readFile(pendingPath, "utf-8")); } catch { return []; }
}
async function readHistory(): Promise<Record<string, any>> {
  try {
    const arr: any[] = JSON.parse(await fs.readFile(historyPath, "utf-8"));
    return Object.fromEntries(arr.map((r: any) => [r.batchId, r]));
  } catch { return {}; }
}
async function writePending(data: any[]): Promise<void> {
  await fs.mkdir(path.dirname(pendingPath), { recursive: true });
  await fs.writeFile(pendingPath, JSON.stringify(data, null, 2));
}

function normaliseQuality(score: number | null): string {
  if (score == null) return "Unknown";
  if (score >= 75) return "Passed";
  if (score >= 50) return "Caution";
  return "Failed";
}

// Push a pending farmer batch onto the blockchain using the deployer key
async function registerBatchOnChain(batch: any): Promise<void> {
  const account = privateKeyToAccount(DEPLOY_KEY);
  const wallet  = createWalletClient({ account, chain: activeChain, transport: http(RPC_URL) });
  const pub     = publicClient();

  function sc(val: any, factor: number): bigint {
    const n = parseFloat(val);
    return isNaN(n) || n === 0 ? 0n : BigInt(Math.round(n * factor));
  }

  const extParams: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint] = [
    sc(batch.diastase,        10),
    sc(batch.freeAcidity,     10),
    sc(batch.proline,          1),
    sc(batch.conductivity,  1000),
    sc(batch.fructoseGlucose, 10),
    sc(batch.reducingSugars,  10),
    sc(batch.sucrose,         10),
    sc(batch.ash,           1000),
    sc(batch.isotopicDiff,   100),
  ];

  const hash = await wallet.writeContract({
    address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: "registerBatch",
    args: [
      batch.batchId,
      batch.farmerName,
      batch.origin              ?? "",
      batch.coffeeType           ?? "",
      batch.pdfHash             ?? "",
      batch.producerDeclaration ?? "",
      sc(batch.humidity, 10),
      sc(batch.hmf,      10),
      sc(batch.colour,    1),
      BigInt(batch.harvestYear ?? new Date().getFullYear()),
      extParams,
      BigInt(batch.qualityScore ?? 0),
      batch.qualityTier ?? "",
      0n,
      BigInt(batch.jarSizeG   ?? 0),
      BigInt(batch.totalStock ?? 0),
    ],
    account,
  });

  await pub.waitForTransactionReceipt({ hash });
}

// GET — blockchain batches + pending farmer submissions (cached 10 s)
export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filter   = searchParams.get("status");
  const cacheKey = `batch-approvals:${filter ?? "all"}`;
  const cached   = cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  // Always load pending batches — they don't need the blockchain
  const [extras, pending, history] = await Promise.all([readExtras(), readPending(), readHistory()]);

  // Try blockchain (gracefully skip if node is down)
  let blockchainBatches: any[] = [];
  let chainError = false;
  try {
    const client = publicClient();
    const allIds = await client.readContract({
      address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: "getAllBatchIds", args: [],
    }) as string[];

    const results = await Promise.allSettled(
      allIds.map(async (batchId) => {
        const [core, quality, listing] = await Promise.all([
          client.readContract({ address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: "getBatchCore",    args: [batchId] }),
          client.readContract({ address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: "getBatchQuality", args: [batchId] }),
          client.readContract({ address: CONTRACT_ADDRESS, abi: CONTRACT_ABI, functionName: "getBatchListing", args: [batchId] }),
        ]) as [any, any, any];

        if (!core[6]) return null;

        const ex         = extras[batchId] ?? {};
        const qualityScore = Number(quality[0]) || null;
        const humidity   = Number(quality[2]) ? Number(quality[2]) / 10 : null;
        const hmf        = Number(quality[3]) ? Number(quality[3]) / 10 : null;
        const jarSizeG   = Number(listing[1]) || ex.jarSizeG || null;
        const totalStock = Number(listing[2]) || null;
        const soldCount  = Number(listing[3]) || 0;

        const coffeeType = core[3] as string;
        const adulteration = detectAdulteration({
          isotopicDiff:    Number(quality[12]) ? Number(quality[12]) / 100 : null,
          sucrose:         Number(quality[10]) ? Number(quality[10]) / 10  : null,
          proline:         Number(quality[6])  || null,
          fructoseGlucose: Number(quality[8])  ? Number(quality[8])  / 10  : null,
          conductivity:    Number(quality[7])  ? Number(quality[7])  / 1000 : null,
          coffeeType,
        });

        const hr = history[core[0] as string] ?? {};
        return {
          batchId:           core[0] as string,
          farmerName:     core[1] as string,
          origin:            core[2] as string,
          coffeeType,
          pdfHash:           core[4] as string,
          humidity, hmf, qualityScore,
          qualityTier:       quality[1] as string,
          qualityStatus:     normaliseQuality(qualityScore),
          approvalStatus:    ex.approvalStatus ?? "approved",
          adminNote:         ex.adminNote ?? "",
          jarSizeG, totalStock, soldCount,
          stockLeft:         totalStock != null ? totalStock - soldCount : null,
          weight:            jarSizeG ? `${jarSizeG}g` : (ex.weight ?? null),
          price:             ex.price ?? null,
          image:             ex.image ?? null,
          certificateUrl:    ex.certificateUrl ?? null,
          createdAt:         ex.createdAt ?? null,
          approvedAt:        ex.approvedAt ?? null,
          adulterationRisk:  adulteration.risk,
          adulterationFlags: adulteration.flags,
          // Extended lab fields from labHistory
          harvestYear:       hr.harvestYear   ?? null,
          zone:              hr.zone          ?? null,
          altitude:          hr.altitude      ?? null,
          harvestMonth:      hr.harvestMonth  ?? null,
          crystallisation:   hr.crystallisation ?? null,
          hde:               hr.hde           ?? null,
          dominantPollen:    hr.dominantPollen ?? null,
          secondaryPollens:  hr.secondaryPollens ?? null,
          pollenConcentration: hr.pollenConcentration ?? null,
          botanicalConfirmed:  hr.botanicalConfirmed  ?? null,
          geographicConfirmed: hr.geographicConfirmed ?? null,
          palynologicalNotes:  hr.palynologicalNotes  ?? null,
          // Extended params (from hr.params)
          ph:               hr.params?.ph               ?? null,
          invertase:        hr.params?.invertase         ?? null,
          fructose:         hr.params?.fructose          ?? null,
          glucose:          hr.params?.glucose           ?? null,
          fgRatio:          hr.params?.fgRatio           ?? null,
          maltose:          hr.params?.maltose           ?? null,
          waterActivity:    hr.params?.waterActivity     ?? null,
          opticalRotation:  hr.params?.opticalRotation   ?? null,
          viscosity:        hr.params?.viscosity         ?? null,
          totalPolyphenols: hr.params?.totalPolyphenols  ?? null,
          hdeEncoded:       hr.params?.hdeEncoded        ?? null,
          yeastCount:       hr.params?.yeastCount        ?? null,
          totalPlateCount:  hr.params?.totalPlateCount   ?? null,
          leadPb:           hr.params?.leadPb            ?? null,
          cadmiumCd:        hr.params?.cadmiumCd         ?? null,
          pesticideScreen:  hr.params?.pesticideScreen   ?? null,
          antibioticScreen: hr.params?.antibioticScreen  ?? null,
          // Standard params from labHistory (may have more precision than blockchain)
          diastase:         hr.params?.diastase          ?? null,
          freeAcidity:      hr.params?.freeAcidity       ?? null,
          proline:          hr.params?.proline           ?? null,
          conductivity:     hr.params?.conductivity      ?? null,
          fructoseGlucose:  hr.params?.fructoseGlucose   ?? null,
          reducingSugars:   hr.params?.reducingSugars    ?? null,
          sucrose:          hr.params?.sucrose           ?? null,
          ash:              hr.params?.ash               ?? null,
          isotopicDiff:     hr.params?.isotopicDiff      ?? null,
          colour:           hr.params?.colour            ?? null,
        };
      })
    );

    blockchainBatches = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value !== null)
      .map(r => r.value);
  } catch {
    chainError = true;
  }

  // Pending farmer batches not yet on-chain
  const chainIds = new Set(blockchainBatches.map((b: any) => b.batchId));
  const pendingBatches = pending
    .filter((p: any) => !chainIds.has(p.batchId))
    .map((p: any) => {
      const humActual = p.humidity != null && p.humidity > 50 ? p.humidity / 10 : p.humidity;
      const hmfActual = p.hmf      != null && p.hmf      > 200 ? p.hmf      / 10 : p.hmf;
      const adulteration = detectAdulteration({
        isotopicDiff:    p.isotopicDiff   ?? null,
        sucrose:         p.sucrose        ?? null,
        proline:         p.proline        ?? null,
        fructoseGlucose: p.fructoseGlucose ?? null,
        conductivity:    p.conductivity   ?? null,
        coffeeType:       p.coffeeType      ?? null,
      });
      const hr = history[p.batchId] ?? {};
      return {
        batchId:           p.batchId,
        farmerName:     p.farmerName,
        origin:            p.origin        ?? "—",
        coffeeType:         p.coffeeType     ?? "—",
        pdfHash:           p.pdfHash       ?? null,
        humidity:          humActual,
        hmf:               hmfActual,
        qualityScore:      p.qualityScore  ?? null,
        qualityTier:       p.qualityTier   ?? null,
        qualityStatus:     p.qualityStatus ?? normaliseQuality(p.qualityScore),
        approvalStatus:    p.approvalStatus ?? "pending",
        adminNote:         p.adminNote     ?? "",
        jarSizeG:          p.jarSizeG      ?? null,
        totalStock:        p.totalStock    ?? null,
        soldCount: 0,
        stockLeft:         p.totalStock    ?? null,
        weight:            p.weight        ?? null,
        price:             p.price         ?? null,
        image:             p.image         ?? null,
        certificateUrl:    p.certificateUrl ?? null,
        createdAt:         p.createdAt     ?? null,
        approvedAt:        p.approvedAt    ?? null,
        source:            "farmer",
        onChain:           false,
        harvestYear:       p.harvestYear   ?? hr.harvestYear   ?? null,
        diastase:          p.diastase      ?? hr.params?.diastase    ?? null,
        freeAcidity:       p.freeAcidity   ?? hr.params?.freeAcidity ?? null,
        proline:           p.proline       ?? hr.params?.proline     ?? null,
        conductivity:      p.conductivity  ?? hr.params?.conductivity ?? null,
        adulterationRisk:  adulteration.risk,
        adulterationFlags: adulteration.flags,
        // Extended lab fields
        zone:              p.zone          ?? hr.zone          ?? null,
        altitude:          p.altitude      ?? hr.altitude      ?? null,
        harvestMonth:      p.harvestMonth  ?? hr.harvestMonth  ?? null,
        crystallisation:   p.crystallisation ?? hr.crystallisation ?? null,
        hde:               p.hde           ?? hr.hde           ?? null,
        dominantPollen:    p.dominantPollen ?? hr.dominantPollen ?? null,
        secondaryPollens:  p.secondaryPollens ?? hr.secondaryPollens ?? null,
        pollenConcentration: p.pollenConcentration ?? hr.pollenConcentration ?? null,
        botanicalConfirmed:  p.botanicalConfirmed  ?? hr.botanicalConfirmed  ?? null,
        geographicConfirmed: p.geographicConfirmed ?? hr.geographicConfirmed ?? null,
        palynologicalNotes:  p.palynologicalNotes  ?? hr.palynologicalNotes  ?? null,
        ph:               p.ph              ?? hr.params?.ph               ?? null,
        invertase:        p.invertase       ?? hr.params?.invertase         ?? null,
        fructose:         p.fructose        ?? hr.params?.fructose          ?? null,
        glucose:          p.glucose         ?? hr.params?.glucose           ?? null,
        fgRatio:          p.fgRatio         ?? hr.params?.fgRatio           ?? null,
        maltose:          p.maltose         ?? hr.params?.maltose           ?? null,
        waterActivity:    p.waterActivity   ?? hr.params?.waterActivity     ?? null,
        opticalRotation:  p.opticalRotation ?? hr.params?.opticalRotation   ?? null,
        viscosity:        p.viscosity       ?? hr.params?.viscosity         ?? null,
        totalPolyphenols: p.totalPolyphenols ?? hr.params?.totalPolyphenols ?? null,
        hdeEncoded:       p.hdeEncoded      ?? hr.params?.hdeEncoded        ?? null,
        yeastCount:       p.yeastCount      ?? hr.params?.yeastCount        ?? null,
        totalPlateCount:  p.totalPlateCount ?? hr.params?.totalPlateCount   ?? null,
        leadPb:           p.leadPb          ?? hr.params?.leadPb            ?? null,
        cadmiumCd:        p.cadmiumCd       ?? hr.params?.cadmiumCd         ?? null,
        pesticideScreen:  p.pesticideScreen ?? hr.params?.pesticideScreen   ?? null,
        antibioticScreen: p.antibioticScreen ?? hr.params?.antibioticScreen ?? null,
        colour:           p.colour          ?? hr.params?.colour            ?? null,
        fructoseGlucose:  p.fructoseGlucose ?? hr.params?.fructoseGlucose  ?? null,
        reducingSugars:   p.reducingSugars  ?? hr.params?.reducingSugars    ?? null,
        sucrose:          p.sucrose         ?? hr.params?.sucrose           ?? null,
        ash:              p.ash             ?? hr.params?.ash               ?? null,
        isotopicDiff:     p.isotopicDiff    ?? hr.params?.isotopicDiff      ?? null,
      };
    });

  let batches = [...blockchainBatches, ...pendingBatches];
  if (filter) batches = batches.filter(b => b.approvalStatus === filter);

  const result = { batches, chainError };
  if (!chainError) cacheSet(cacheKey, result, 10_000);
  return NextResponse.json(result);
}

// PATCH — approve/reject/suspend OR register a pending batch on-chain
export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { batchId, action, adminNote } = await req.json();
    if (!batchId || !["approved", "rejected", "suspended", "register"].includes(action)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const [extras, pending] = await Promise.all([readExtras(), readPending()]);

    // ── register: push approved pending batch onto blockchain ─────────────────
    if (action === "register") {
      const batch = pending.find((p: any) => p.batchId === batchId);
      if (!batch) return NextResponse.json({ error: "Batch not found in pending list." }, { status: 404 });
      if (batch.approvalStatus !== "approved") {
        return NextResponse.json({ error: "Batch must be approved before registering on-chain." }, { status: 400 });
      }

      try {
        await registerBatchOnChain(batch);
      } catch (chainErr) {
        console.error("[batch-approvals] blockchain registration failed:", chainErr);
        return NextResponse.json(
          { error: "Could not reach blockchain. Make sure Hardhat is running: npm run chain" },
          { status: 503 }
        );
      }

      // Save display extras
      const now = new Date().toISOString();
      extras[batchId] = {
        description:    batch.description    ?? null,
        price:          batch.price          ?? null,
        image:          batch.image          ?? null,
        certificateUrl: batch.certificateUrl ?? null,
        pdfName:        batch.pdfName        ?? null,
        pdfHash:        batch.pdfHash        ?? null,
        jarSizeG:       batch.jarSizeG       ?? null,
        wholesaleQty:   batch.wholesaleQty   ?? null,
        wholesaleUnit:  batch.wholesaleUnit  ?? "kg",
        weight:         batch.weight         ?? null,
        adminNote:      batch.adminNote      ?? "",
        createdAt:      batch.createdAt      ?? now,
        approvedAt:     now,
      };
      await writeExtras(extras);

      // Auto-feed batch into RF training data (no sensory input needed)
      try {
        addBatchRecord({
          batchId:         batch.batchId,
          coffeeType:       batch.coffeeType      ?? null,
          humidity:        batch.humidity        ?? null,
          hmf:             batch.hmf             ?? null,
          diastase:        batch.diastase        ?? null,
          freeAcidity:     batch.freeAcidity     ?? null,
          proline:         batch.proline         ?? null,
          conductivity:    batch.conductivity    ?? null,
          fructoseGlucose: batch.fructoseGlucose ?? null,
          reducingSugars:  batch.reducingSugars  ?? null,
          sucrose:         batch.sucrose         ?? null,
          ash:             batch.ash             ?? null,
          isotopicDiff:    batch.isotopicDiff    ?? null,
        });
      } catch (mlErr) {
        console.warn("[batch-approvals] RF training skipped:", mlErr);
      }

      // Mark as on-chain so farmer still sees their history
      const idx = pending.findIndex((p: any) => p.batchId === batchId);
      if (idx >= 0) { pending[idx] = { ...pending[idx], onChain: true }; await writePending(pending); }

      cacheInvalidate("batch-approvals:");
      cacheInvalidate("marketplace:");
      return NextResponse.json({ message: "Batch registered on blockchain." });
    }

    // ── approve / reject / suspend ────────────────────────────────────────────
    const pendingIdx = pending.findIndex((p: any) => p.batchId === batchId);
    if (pendingIdx >= 0) {
      pending[pendingIdx] = {
        ...pending[pendingIdx],
        approvalStatus: action,
        adminNote:      adminNote ?? "",
        approvedAt:     action === "approved" ? new Date().toISOString() : (pending[pendingIdx].approvedAt ?? null),
      };
      await writePending(pending);
    } else {
      extras[batchId] = {
        ...(extras[batchId] ?? {}),
        approvalStatus: action,
        adminNote:      adminNote ?? "",
        approvedAt:     action === "approved" ? new Date().toISOString() : (extras[batchId]?.approvedAt ?? null),
      };
      await writeExtras(extras);
    }

    cacheInvalidate("batch-approvals:");
    cacheInvalidate("marketplace:");
    const verb = action === "approved" ? "approved" : action === "rejected" ? "rejected" : "suspended";
    return NextResponse.json({ message: `Batch ${verb}.` });
  } catch {
    return NextResponse.json({ error: "Failed to update batch." }, { status: 500 });
  }
}
