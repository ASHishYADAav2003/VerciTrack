import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || user.passwordHash !== password) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Rejected farmers cannot log in
    if (user.role === "farmer" && user.status === "rejected") {
      return NextResponse.json(
        { error: "Your account registration was not approved. Please contact support." },
        { status: 403 }
      );
    }

    // Pending farmers CAN log in — but we pass pending flag so UI can warn them
    const isPending = user.role === "farmer" && user.status === "pending";

    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status ?? "approved",
    };

    const response = NextResponse.json({
      message: "Login successful.",
      user: sessionUser,
      pending: isPending,
    });

    response.cookies.set("auth_user", JSON.stringify(sessionUser), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    response.cookies.set("user_role", user.role, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "Login failed." },
      { status: 500 }
    );
  }
}
