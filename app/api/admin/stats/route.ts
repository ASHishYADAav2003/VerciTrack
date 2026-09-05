// app/api/admin/stats/route.ts
// Dashboard stats — reads both `status` and `approvalStatus` safely
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import path from "path";
import fs from "fs/promises";

const usersPath   = path.join(process.cwd(), "data", "users.json");
const batchesPath = path.join(process.cwd(), "data", "marketplaceBatches.json");

async function readJSON(p: string) {
  try { return JSON.parse(await fs.readFile(p, "utf-8")); }
  catch { return []; }
}

// Normalise: users.json may use `status` OR `approvalStatus`
const getStatus = (u: any) => u.approvalStatus ?? u.status ?? "pending";

export async function GET() {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;
  if (role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users   = await readJSON(usersPath);
    const batches = await readJSON(batchesPath);

    const farmers = users.filter((u: any) => u.role === "farmer");
    const customers  = users.filter((u: any) => u.role === "customer");

    return NextResponse.json({
      batches: {
        total:    batches.length,
        approved: batches.filter((b: any) => b.approvalStatus === "approved").length,
        pending:  batches.filter((b: any) => b.approvalStatus === "pending").length,
        live:     batches.filter((b: any) => b.approvalStatus === "approved").length,
        qualityFailed: batches.filter((b: any) =>
          (b.qualityStatus || "").toLowerCase() === "failed"
        ).length,
      },
      farmers: {
        total:   farmers.length,
        pending: farmers.filter((u: any) => getStatus(u) === "pending").length,
        approved:farmers.filter((u: any) => getStatus(u) === "approved").length,
      },
      customers: {
        total: customers.length,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
