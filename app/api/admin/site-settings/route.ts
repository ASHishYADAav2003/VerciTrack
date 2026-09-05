// app/api/admin/site-settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const filePath = path.join(process.cwd(), "data", "siteSettings.json");

async function readSettings() {
  try { return JSON.parse(await fs.readFile(filePath, "utf-8")); }
  catch { return { heroImageUrl: "", heroTitle: "", heroSubtitle: "" }; }
}

export async function GET() {
  return NextResponse.json(await readSettings());
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const current = await readSettings();
    const updated = { ...current, ...body };
    await fs.writeFile(filePath, JSON.stringify(updated, null, 2));
    return NextResponse.json({ ok: true, settings: updated });
  } catch {
    return NextResponse.json({ error: "Failed to save settings." }, { status: 500 });
  }
}
