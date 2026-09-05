// app/api/farmers/route.ts
// Public API — lookup a farmer by name (used by verify page)
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const usersPath   = path.join(process.cwd(), "data", "users.json");
const batchesPath = path.join(process.cwd(), "data", "marketplaceBatches.json");

async function readJSON(p: string) {
  try { return JSON.parse(await fs.readFile(p, "utf-8")); }
  catch { return []; }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name")?.toLowerCase().trim();

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const users   = await readJSON(usersPath);
  const batches = await readJSON(batchesPath);

  const farmer = users.find(
    (u: any) => u.role === "farmer" && (u.name || "").toLowerCase() === name
  );

  if (!farmer) return NextResponse.json({ error: "Farmer not found" }, { status: 404 });

  const approvedBatches = batches.filter(
    (b: any) =>
      b.approvalStatus === "approved" &&
      (b.farmerName || "").toLowerCase() === name
  ).length;

  return NextResponse.json({
    farmer: {
      id:            farmer.id,
      name:          farmer.name,
      farmName:      farmer.farmName      ?? null,
      location:      farmer.location      ?? null,
      walletAddress: farmer.walletAddress ?? null,
      status:        farmer.status        ?? "approved",
      approvedBatches,
    },
  });
}