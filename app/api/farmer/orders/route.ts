// app/api/farmer/orders/route.ts
// Returns orders for the logged-in farmer; allows marking orders as fulfilled.
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const ordersPath = path.join(process.cwd(), "data", "orders.json");

async function readOrders(): Promise<any[]> {
  try { return JSON.parse(await fs.readFile(ordersPath, "utf-8")); }
  catch { return []; }
}
async function writeOrders(orders: any[]) {
  await fs.writeFile(ordersPath, JSON.stringify(orders, null, 2));
}

function getFarmerName(req: NextRequest): string | null {
  try {
    const raw = req.cookies.get("auth_user")?.value;
    if (!raw) return null;
    const user = JSON.parse(decodeURIComponent(raw));
    return (user.name || "").toLowerCase() || null;
  } catch { return null; }
}

// GET — orders where farmerName matches the logged-in farmer
export async function GET(req: NextRequest) {
  const name = getFarmerName(req);
  if (!name) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const all = await readOrders();
  const mine = all.filter(o => (o.farmerName || "").toLowerCase() === name);
  // Sort newest first
  mine.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return NextResponse.json({ orders: mine });
}

// PATCH — mark an order as fulfilled or cancelled
export async function PATCH(req: NextRequest) {
  const name = getFarmerName(req);
  if (!name) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const { orderId, status } = await req.json();
    if (!orderId || !["fulfilled", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const orders = await readOrders();
    const idx = orders.findIndex(o => o.id === orderId && (o.farmerName || "").toLowerCase() === name);
    if (idx === -1) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    orders[idx].status = status;
    orders[idx].updatedAt = new Date().toISOString();
    await writeOrders(orders);

    return NextResponse.json({ message: `Order marked as ${status}.` });
  } catch {
    return NextResponse.json({ error: "Failed to update order." }, { status: 500 });
  }
}
