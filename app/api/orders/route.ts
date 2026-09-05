// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const filePath = path.join(process.cwd(), "data", "orders.json");

async function readOrders(): Promise<any[]> {
  try { return JSON.parse(await fs.readFile(filePath, "utf-8")); }
  catch { return []; }
}

export async function GET() {
  return NextResponse.json({ orders: await readOrders() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orders = await readOrders();
    const order = {
      id:             `order-${Date.now()}`,
      batchId:        body.batchId,
      coffeeType:      body.coffeeType      ?? null,
      farmerName:  body.farmerName  ?? null,
      customerName:   body.customerName   ?? "Anonymous",
      customerEmail:  body.customerEmail  ?? "",
      quantity:       body.quantity       ?? 1,
      total:          body.total          ?? null,
      txHash:         body.txHash         ?? null,  // on-chain proof
      buyerWallet:    body.buyerWallet    ?? null,  // buyer ETH address
      // Blockchain purchases are payment-confirmed the moment the tx lands.
      // Off-chain/manual orders start as pending until the farmer accepts.
      status:         body.txHash ? "confirmed" : "pending",
      createdAt:      new Date().toISOString(),
    };
    orders.push(order);
    await fs.writeFile(filePath, JSON.stringify(orders, null, 2));
    return NextResponse.json({ message: "Order recorded.", order });
  } catch {
    return NextResponse.json({ error: "Failed to save order." }, { status: 500 });
  }
}
