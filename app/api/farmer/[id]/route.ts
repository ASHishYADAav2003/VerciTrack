// app/api/farmers/[id]/route.ts
// Public API — fetch farmer profile + their approved batches by user ID
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const usersPath   = path.join(process.cwd(), "data", "users.json");
const batchesPath = path.join(process.cwd(), "data", "marketplaceBatches.json");

async function readJSON(p: string) {
  try { return JSON.parse(await fs.readFile(p, "utf-8")); }
  catch { return []; }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const users   = await readJSON(usersPath);
  const batches = await readJSON(batchesPath);

  const user = users.find((u: any) => u.id === id && u.role === "farmer");
  if (!user) return NextResponse.json({ error: "Farmer not found" }, { status: 404 });

  // Match batches by farmer name (that's what batches store)
  const approved = batches
    .filter(
      (b: any) =>
        b.approvalStatus === "approved" &&
        (b.farmerName || "").toLowerCase() === (user.name || "").toLowerCase()
    )
    .map((b: any) => ({
      batchId:        b.batchId,
      name:           b.name,
      coffeeType:      b.coffeeType,
      origin:         b.origin,
      price:          b.price,
      weight:         b.weight,
      image:          b.image ?? null,
      qualityStatus:  (b.qualityStatus || "passed").toLowerCase(),
      approvedAt:     b.approvedAt ?? null,
      certificateUrl: b.certificateUrl ?? null,
      pdfHash:        b.pdfHash ?? null,
    }));

  return NextResponse.json({
    farmer: {
      id:            user.id,
      name:          user.name,
      farmName:      user.farmName      ?? null,
      location:      user.location      ?? null,
      walletAddress: user.walletAddress ?? null,
      status:        user.status        ?? "approved",
    },
    batches: approved,
  });
}