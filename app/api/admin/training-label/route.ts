// app/api/admin/training-label/route.ts
// RF model stats endpoint — training is now automatic (no sensory input).
// POST: manually trigger a retrain (e.g. after importing historical batches)
// GET:  return model stats, feature importance, and training record count
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getModelStats, triggerRetrain } from "@/lib/mlScorer";

async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get("user_role")?.value === "admin";
}

// POST — manually trigger a retrain on all stored batch records
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = triggerRetrain();
    const stats  = getModelStats();
    return NextResponse.json({
      success: true,
      message: result.note,
      stats,
      featureImportance: result.featureImportance,
    });
  } catch (err) {
    console.error("[training-label POST]", err);
    return NextResponse.json({ error: "Retrain failed" }, { status: 500 });
  }
}

// GET — return current RF model stats and feature importance
export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stats = getModelStats();
  return NextResponse.json({ stats });
}
