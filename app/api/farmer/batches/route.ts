// app/api/farmer/batches/route.ts
// GET  — returns this farmer's submitted batches (from pendingBatches.json)
// POST — submit a new batch for admin review
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import path from "path";
import fs from "fs/promises";

const pendingPath = path.join(process.cwd(), "data", "pendingBatches.json");
const ordersPath  = path.join(process.cwd(), "data", "orders.json");

async function readPending(): Promise<any[]> {
  try { return JSON.parse(await fs.readFile(pendingPath, "utf-8")); } catch { return []; }
}
async function writePending(data: any[]): Promise<void> {
  await fs.mkdir(path.dirname(pendingPath), { recursive: true });
  await fs.writeFile(pendingPath, JSON.stringify(data, null, 2));
}
async function readOrders(): Promise<any[]> {
  try { return JSON.parse(await fs.readFile(ordersPath, "utf-8")); } catch { return []; }
}

async function getSession() {
  const cs = await cookies();
  return { role: cs.get("user_role")?.value, name: cs.get("user_name")?.value };
}

export async function GET(req: NextRequest) {
  const { role, name } = await getSession();
  if (role !== "farmer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [all, orders] = await Promise.all([readPending(), readOrders()]);
  const soldMap: Record<string, number> = {};
  for (const o of orders) {
    if (o.batchId) soldMap[o.batchId] = (soldMap[o.batchId] || 0) + (Number(o.quantity) || 0);
  }

  const mine = all
    .filter((b: any) => !name || b.farmerName === name)
    .map((b: any) => ({
      ...b,
      sold:      soldMap[b.batchId] || 0,
      remaining: b.totalStock != null ? b.totalStock - (soldMap[b.batchId] || 0) : null,
    }))
    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return NextResponse.json({ batches: mine });
}

export async function DELETE(req: NextRequest) {
  const { role, name } = await getSession();
  if (role !== "farmer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get("batchId");
  if (!batchId) return NextResponse.json({ error: "batchId required" }, { status: 400 });

  const all = await readPending();
  const idx = all.findIndex((b: any) => b.batchId === batchId);
  if (idx < 0) return NextResponse.json({ error: "Batch not found" }, { status: 404 });

  const batch = all[idx];
  if (name && batch.farmerName !== name) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  if (batch.approvalStatus === "approved" || batch.onChain) {
    return NextResponse.json({ error: "Approved batches cannot be deleted." }, { status: 400 });
  }

  all.splice(idx, 1);
  await writePending(all);
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const { role } = await getSession();
  if (!["farmer", "admin"].includes(role ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!body.batchId || !body.farmerName) {
      return NextResponse.json({ error: "batchId and farmerName required" }, { status: 400 });
    }

    const all = await readPending();
    if (all.some((b: any) => b.batchId === body.batchId)) {
      return NextResponse.json({ error: "Batch ID already submitted" }, { status: 409 });
    }

    all.push({ ...body, source: "farmer", approvalStatus: "pending", createdAt: new Date().toISOString() });
    await writePending(all);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[farmer/batches POST]", err);
    return NextResponse.json({ error: "Failed to save batch" }, { status: 500 });
  }
}
