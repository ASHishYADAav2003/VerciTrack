// app/api/auth/me/route.ts
// Returns the current session user from the httpOnly auth_user cookie.
// Client components cannot read httpOnly cookies directly — they fetch this instead.

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const authRaw = req.cookies.get("auth_user")?.value;
  if (!authRaw) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  try {
    const user = JSON.parse(decodeURIComponent(authRaw));
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
