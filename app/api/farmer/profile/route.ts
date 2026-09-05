import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

type User = {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  status: string;
  farmName?: string;
  location?: string;
  walletAddress?: string;
  phone?: string;
  bio?: string;
  organic?: boolean;
  shippingPolicy?: string;
  returnsPolicy?: string;
  photoUrl?: string;
};

const filePath = path.join(process.cwd(), "data", "users.json");

function getSession(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") || "";
  const authCookie = cookieHeader.split(";").find(c => c.trim().startsWith("auth_user="));
  if (!authCookie) return null;
  try { return JSON.parse(decodeURIComponent(authCookie.split("=").slice(1).join("="))); }
  catch { return null; }
}

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const users: User[] = JSON.parse(await fs.readFile(filePath, "utf-8"));
  const user = users.find(u => u.id === session.id || u.email === session.email);
  if (!user) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const { password: _pw, ...safe } = user;
  return NextResponse.json(safe);
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const session = getSession(req);
    if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const file = await fs.readFile(filePath, "utf-8");
    const users: User[] = JSON.parse(file);

    const idx = users.findIndex(
      (u) => u.id === session.id || u.email === session.email
    );

    if (idx === -1) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Only update allowed fields — never let the user change their own role or status
    const allowed: (keyof User)[] = [
      "name", "phone", "location", "farmName",
      "walletAddress", "bio", "organic",
      "shippingPolicy", "returnsPolicy", "photoUrl",
    ];

    allowed.forEach((field) => {
      if (body[field] !== undefined) {
        (users[idx] as any)[field] = body[field];
      }
    });

    await fs.writeFile(filePath, JSON.stringify(users, null, 2));

    return NextResponse.json({ message: "Profile updated successfully." });
  } catch {
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 }
    );
  }
}
