// app/api/farmer/upload-photo/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const usersPath = path.join(process.cwd(), "data", "users.json");

function getSession(req: NextRequest) {
  const cookie = req.headers.get("cookie") || "";
  const found = cookie.split(";").find(c => c.trim().startsWith("auth_user="));
  if (!found) return null;
  try { return JSON.parse(decodeURIComponent(found.split("=").slice(1).join("="))); }
  catch { return null; }
}

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("photo") as File | null;
    if (!file) return NextResponse.json({ error: "No file." }, { status: 400 });

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const safeId = (session.id || session.email).replace(/[^a-z0-9]/gi, "_");
    const filename = `bk-${safeId}.${ext}`;
    const dir = path.join(process.cwd(), "public", "farmer-photos");
    await fs.mkdir(dir, { recursive: true });

    // Remove old photos for this user
    try {
      const existing = await fs.readdir(dir);
      for (const f of existing.filter(f => f.startsWith(`bk-${safeId}.`))) {
        await fs.unlink(path.join(dir, f));
      }
    } catch {}

    await fs.writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

    const photoUrl = `/farmer-photos/${filename}?t=${Date.now()}`;

    // Persist to users.json
    const users = JSON.parse(await fs.readFile(usersPath, "utf-8"));
    const idx = users.findIndex((u: any) => u.id === session.id || u.email === session.email);
    if (idx !== -1) { users[idx].photoUrl = photoUrl; await fs.writeFile(usersPath, JSON.stringify(users, null, 2)); }

    return NextResponse.json({ ok: true, photoUrl });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
