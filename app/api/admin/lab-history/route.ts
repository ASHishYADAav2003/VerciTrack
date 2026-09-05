// app/api/admin/lab-history/route.ts
// Stores lab parameters from each registered batch for ML analysis.
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { upsertLabRecord, readLabHistory, type LabRecord } from "@/lib/labAnalytics";

async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get("user_role")?.value === "admin";
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body: LabRecord = await req.json();
    if (!body.batchId) return NextResponse.json({ error: "batchId required" }, { status: 400 });
    body.registeredAt = body.registeredAt || new Date().toISOString();
    upsertLabRecord(body);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[lab-history POST]", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = readLabHistory();
  return NextResponse.json({ records: store.records, count: store.records.length });
}
