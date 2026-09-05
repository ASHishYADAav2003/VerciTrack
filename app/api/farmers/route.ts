// app/api/farmers/route.ts
// Public endpoint — returns approved farmers with only public-safe fields.
// Used by /farmer-profile pages (accessible to unauthenticated visitors).
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const usersPath = path.join(process.cwd(), "data", "users.json");

export async function GET() {
  try {
    const raw = await fs.readFile(usersPath, "utf-8");
    const users: any[] = JSON.parse(raw);

    const approved = users
      .filter(u => u.role === "farmer" && (u.status === "approved" || u.approvalStatus === "approved"))
      .map(({ id, name, farmName, location, walletAddress }) => ({
        id,
        name,
        farmName:      farmName      ?? null,
        location:      location      ?? null,
        walletAddress: walletAddress ?? null,
        status: "approved",
      }));

    return NextResponse.json({ farmers: approved });
  } catch {
    return NextResponse.json({ farmers: [] });
  }
}
