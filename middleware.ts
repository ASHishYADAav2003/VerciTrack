import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const role    = req.cookies.get("user_role")?.value;
  const authRaw = req.cookies.get("auth_user")?.value;
  const { pathname } = req.nextUrl;

  const isAdmin     = role === "admin";
  const isFarmer = role === "farmer";

  // /verify is fully public — no auth required
  if (pathname.startsWith("/verify")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const farmerAllowed = ["/admin/register-batch", "/admin/batches", "/admin/certificates"];
    const farmerOk = farmerAllowed.some((p) => pathname.startsWith(p));
    if (!isAdmin && !(isFarmer && farmerOk)) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  if (pathname.startsWith("/farmer")) {
    if (!authRaw) return NextResponse.redirect(new URL("/login", req.url));
    if (role === "customer") return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith("/customer") && !role) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/farmer/:path*", "/customer/:path*", "/verify/:path*"],
};