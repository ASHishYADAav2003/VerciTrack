import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

type UserRole = "admin" | "farmer" | "customer";
type UserStatus = "approved" | "pending" | "rejected";

type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status?: UserStatus;
};

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), "data", "users.json");
    const file = await fs.readFile(filePath, "utf-8");
    const users: User[] = JSON.parse(file);

    const user = users.find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase() &&
        u.password === password
    );

    if (!user) {
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
  } catch {
    return NextResponse.json(
      { error: "Login failed." },
      { status: 500 }
    );
  }
}
