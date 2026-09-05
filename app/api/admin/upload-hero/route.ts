// app/api/admin/upload-hero/route.ts — saves hero background image to /public/hero-bg.*
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const settingsPath = path.join(process.cwd(), "data", "siteSettings.json");

async function readSettings() {
  try { return JSON.parse(await fs.readFile(settingsPath, "utf-8")); }
  catch { return {}; }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("image") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determine extension from MIME type
    const ext = file.type === "image/png" ? "png"
      : file.type === "image/webp" ? "webp"
      : "jpg";

    const filename = `hero-bg.${ext}`;
    const publicDir = path.join(process.cwd(), "public");
    const savePath = path.join(publicDir, filename);

    // Remove any old hero-bg.* files
    for (const old of ["hero-bg.jpg", "hero-bg.png", "hero-bg.webp"]) {
      try { await fs.unlink(path.join(publicDir, old)); } catch {}
    }

    await fs.writeFile(savePath, buffer);

    // Update settings
    const settings = await readSettings();
    settings.heroImageUrl = `/${filename}?t=${Date.now()}`;
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));

    return NextResponse.json({ ok: true, url: settings.heroImageUrl });
  } catch (err) {
    console.error("Hero upload error:", err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
