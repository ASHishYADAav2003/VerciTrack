// app/api/batch/generate-code/route.ts
// Server-only: uses fs/promises to read the current batch list for sequence numbering.
import { NextRequest, NextResponse } from "next/server";
import { generateBatchCode, locationToRegionCode, coffeeTypeToCode } from "@/lib/batchCodeGenerator";
import { promises as fs } from "fs";
import path from "path";

async function generateNextBatchCode(
  location: string,
  coffeeType: string,
  harvestYear?: number
): Promise<string> {
  try {
    const mpPath = path.join(process.cwd(), "data", "marketplaceBatches.json");
    let batches: any[] = [];
    try {
      const raw = await fs.readFile(mpPath, "utf-8");
      batches = JSON.parse(raw);
    } catch { /* file may not exist yet */ }

    let maxSeq = 0;
    for (const b of batches) {
      const match = (b.batchId || "").match(/HON-[A-Z]{2,3}-[A-Z]{2,3}-\d{2}-(\d{4})/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > maxSeq) maxSeq = n;
      }
    }

    return generateBatchCode(location, coffeeType, harvestYear ?? new Date().getFullYear(), maxSeq + 1);
  } catch {
    const ts = Date.now().toString().slice(-4);
    const region = locationToRegionCode(location);
    const type   = coffeeTypeToCode(coffeeType);
    const year   = String(harvestYear ?? new Date().getFullYear()).slice(-2);
    return `HON-${region}-${type}-${year}-${ts}`;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const location  = searchParams.get("location")  ?? "Kosovo";
    const coffeeType = searchParams.get("coffeeType") ?? "Multifloral";
    const yearParam = searchParams.get("year");
    const year      = yearParam ? parseInt(yearParam) : undefined;

    const batchCode = await generateNextBatchCode(location, coffeeType, year);
    return NextResponse.json({ batchCode });
  } catch {
    return NextResponse.json({ error: "Could not generate batch code." }, { status: 500 });
  }
}
