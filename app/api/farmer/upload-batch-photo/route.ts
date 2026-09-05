// app/api/farmer/upload-batch-photo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import path from "path";
import fs from "fs/promises";

async function requireFarmer(): Promise<boolean> {
  const cs = await cookies();
  const role = cs.get("user_role")?.value;
  return role === "farmer" || role === "admin";
}

export async function POST(req: NextRequest) {
  if (!await requireFarmer()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("photo") as File | null;
    if (!file) return NextResponse.json({ error: "No file." }, { status: 400 });

    const maxBytes = 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json({ error: "File too large (max 8 MB)." }, { status: 400 });
    }

    const ext = file.type === "image/png" ? "png"
              : file.type === "image/webp" ? "webp"
              : "jpg";

    const rawId = (formData.get("batchId") as string | null) || `img-${Date.now()}`;
    const safeId = rawId.replace(/[^a-z0-9\-]/gi, "_");
    const filename = `batch-${safeId}.${ext}`;

    const dir = path.join(process.cwd(), "public", "batch-photos");
    await fs.mkdir(dir, { recursive: true });

    try {
      const existing = await fs.readdir(dir);
      for (const f of existing.filter(f => f.startsWith(`batch-${safeId}.`))) {
        await fs.unlink(path.join(dir, f));
      }
    } catch {}

    await fs.writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

    const imageUrl = `/batch-photos/${filename}?t=${Date.now()}`;
    return NextResponse.json({ ok: true, imageUrl });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
