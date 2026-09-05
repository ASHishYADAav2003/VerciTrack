// app/api/admin/approvals/route.ts
//   users.json stores the field as `status` (not `approvalStatus`)
//     This API normalises it so the UI always works with `approvalStatus`

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import path from "path";
import fs from "fs/promises";

async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get("user_role")?.value === "admin";
}

const filePath = path.join(process.cwd(), "data", "users.json");

async function readUsers(): Promise<any[]> {
  try { return JSON.parse(await fs.readFile(filePath, "utf-8")); }
  catch { return []; }
}
async function writeUsers(users: any[]) {
  await fs.writeFile(filePath, JSON.stringify(users, null, 2));
}

// Map `status` → `approvalStatus` so the UI has one consistent field name
function normalise(u: any) {
  return {
    ...u,
    // approvalStatus is derived from `status`; never expose password
    approvalStatus: u.approvalStatus ?? u.status ?? "pending",
    password: undefined,
  };
}

// GET — all users (farmers + customers), normalised
export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const users = await readUsers();
    return NextResponse.json({ users: users.map(normalise) });
  } catch {
    return NextResponse.json({ error: "Failed to load users." }, { status: 500 });
  }
}

// PATCH — approve | reject | suspend a farmer by email
export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { email, action } = await req.json();

    if (!email || !["approve", "reject", "suspend", "reinstate"].includes(action)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const users = await readUsers();
    const idx = users.findIndex(
      u => (u.email || "").toLowerCase() === email.toLowerCase()
    );

    if (idx === -1) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Write to BOTH fields so any code that reads either one works
    const newStatus =
      action === "approve"   ? "approved"  :
      action === "reject"    ? "rejected"  :
      action === "suspend"   ? "suspended" :
      action === "reinstate" ? "approved"  : "pending";

    users[idx].status         = newStatus;   // source of truth in JSON
    users[idx].approvalStatus = newStatus;   // redundant copy for legacy UI code

    await writeUsers(users);

    const verb =
      action === "approve"   ? "approved"  :
      action === "reject"    ? "rejected"  :
      action === "suspend"   ? "suspended" : "reinstated";

    return NextResponse.json({ message: `User ${verb}.` });
  } catch {
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}

// POST — legacy support for old page that used POST with { username, action }
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    // old callers send { username, action } — new ones send { email, action }
    const identifier = body.email || body.username;
    const action     = body.action === "approve" ? "approve" : "reject";

    const users = await readUsers();
    const idx = users.findIndex(u =>
      (u.email || "").toLowerCase() === (identifier || "").toLowerCase() ||
      (u.name  || "").toLowerCase() === (identifier || "").toLowerCase()
    );

    if (idx === -1) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    users[idx].status         = newStatus;
    users[idx].approvalStatus = newStatus;

    await writeUsers(users);
    return NextResponse.json({ message: `User ${newStatus}.` });
  } catch {
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}
