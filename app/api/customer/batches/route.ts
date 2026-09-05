// app/api/customer/batches/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const filePath = path.join(process.cwd(), "data", "marketplaceBatches.json");

async function readBatches(): Promise<any[]> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function GET(_req: NextRequest) {
  try {
    const batches = await readBatches();

    const approved = batches
      .filter((b) => b.approvalStatus === "approved")
      .map((b) => ({
        batchId: b.batchId,
        name: b.name,
        coffeeType: b.coffeeType,
        origin: b.origin,
        farmerName: b.farmerName,
        price: b.price,
        weight: b.weight,
        description: b.description,
        image: b.image ?? null,
        approvedAt: b.approvedAt ?? null,
        qualityStatus: (b.qualityStatus || "").toLowerCase() || "passed",
      }));

    return NextResponse.json({ batches: approved });
  } catch {
    return NextResponse.json(
      { error: "Failed to load batches." },
      { status: 500 }
    );
  }
}