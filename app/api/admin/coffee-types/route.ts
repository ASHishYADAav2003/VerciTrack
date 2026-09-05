// app/api/admin/coffee-types/route.ts
// Manages the dynamic coffee type registry

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import path from "path";
import fs from "fs/promises";

async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get("user_role")?.value === "admin";
}

const knownPath  = path.join(process.cwd(), "data", "coffeeTypes.json");
const unknownPath = path.join(process.cwd(), "data", "unknownCoffeeTypes.json");

async function readKnown(): Promise<Record<string, string>> {
  try { return JSON.parse(await fs.readFile(knownPath, "utf-8")); }
  catch { return {}; }
}

async function readUnknown(): Promise<any[]> {
  try { return JSON.parse(await fs.readFile(unknownPath, "utf-8")); }
  catch { return []; }
}

// GET — return pending unknown types for admin review
export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const unknown = await readUnknown();
  const known   = await readKnown();
  return NextResponse.json({ pending: unknown, knownCount: Object.keys(known).length });
}

// POST — approve a pending type: add it to the known registry
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { raw, approved, displayName } = await req.json();
    // raw = "sidr", approved = true/false, displayName = "Sidr"

    const unknown = await readUnknown();
    const idx = unknown.findIndex((u) => u.raw === raw);
    if (idx === -1) return NextResponse.json({ error: "Not found." }, { status: 404 });

    if (approved) {
      // Add to known registry
      const known = await readKnown();
      known[raw] = displayName || unknown[idx].suggested;
      await fs.writeFile(knownPath, JSON.stringify(known, null, 2));
    }

    // Remove from pending list either way
    unknown.splice(idx, 1);
    await fs.writeFile(unknownPath, JSON.stringify(unknown, null, 2));

    return NextResponse.json({ message: approved ? `"${displayName}" added to registry.` : "Dismissed." });
  } catch {
    return NextResponse.json({ error: "Failed to update." }, { status: 500 });
  }
}
