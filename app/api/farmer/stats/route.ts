// app/api/farmer/stats/route.ts
// Returns stats for the logged-in farmer: batch counts, revenue, orders
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const batchesPath = path.join(process.cwd(), "data", "marketplaceBatches.json");
const ordersPath  = path.join(process.cwd(), "data", "orders.json");

async function readJSON(p: string) {
  try { return JSON.parse(await fs.readFile(p, "utf-8")); }
  catch { return []; }
}

export async function GET(req: NextRequest) {
  try {
    const cookie = req.cookies.get("auth_user")?.value;
    if (!cookie) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const user = JSON.parse(decodeURIComponent(cookie));
    const name = (user.name || "").toLowerCase();

    const batches: any[] = await readJSON(batchesPath);
    const orders:  any[] = await readJSON(ordersPath);

    const mine = batches.filter(b => (b.farmerName || "").toLowerCase() === name);
    const myOrders = orders.filter(o => (o.farmerName || "").toLowerCase() === name);

    const totalRevenue = myOrders
      .filter(o => o.status !== "cancelled")
      .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

    return NextResponse.json({
      batches: {
        total:     mine.length,
        approved:  mine.filter(b => b.approvalStatus === "approved").length,
        pending:   mine.filter(b => b.approvalStatus === "pending").length,
        rejected:  mine.filter(b => b.approvalStatus === "rejected").length,
        suspended: mine.filter(b => b.approvalStatus === "suspended").length,
        passed:    mine.filter(b => (b.qualityStatus || "").toLowerCase() === "passed").length,
      },
      orders: {
        total:     myOrders.length,
        pending:   myOrders.filter(o => o.status === "pending").length,
        fulfilled: myOrders.filter(o => o.status === "fulfilled").length,
      },
      revenue: totalRevenue,
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
