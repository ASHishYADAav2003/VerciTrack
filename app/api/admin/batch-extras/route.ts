// app/api/admin/batch-extras/route.ts
// Stores display-only fields that cannot go on-chain:
// image URL, EUR price, description, certificate URL, PDF name, jar sizes.
// Core batch data (identity, lab values, quality score) lives on the blockchain.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import path from "path";
import fs from "fs/promises";

const extrasPath = path.join(process.cwd(), "data", "batchExtras.json");

async function readExtras(): Promise<Record<string, any>> {
  try {
    return JSON.parse(await fs.readFile(extrasPath, "utf-8"));
  } catch { return {}; }
}

async function writeExtras(data: Record<string, any>): Promise<void> {
  await fs.mkdir(path.dirname(extrasPath), { recursive: true });
  await fs.writeFile(extrasPath, JSON.stringify(data, null, 2));
}

// GET /api/admin/batch-extras?batchId=HON-... → single batch extras
// GET /api/admin/batch-extras                 → all extras map
export async function GET(req: NextRequest) {
  const batchId = new URL(req.url).searchParams.get("batchId");
  const extras = await readExtras();
  if (batchId) return NextResponse.json(extras[batchId] ?? {});
  return NextResponse.json(extras);
}

// POST /api/admin/batch-extras — save extras for a batch (admin only)
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  if (cookieStore.get("user_role")?.value !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.batchId) {
    return NextResponse.json({ error: "batchId required" }, { status: 400 });
  }

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

  await writeExtras(extras);
  return NextResponse.json({ ok: true });
}
