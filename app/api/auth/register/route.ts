import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    const safeRole = role || "customer";

    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const newUser = await db.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash: password, // Note: No hashing for simplicity, matching original logic
        role: safeRole,
        status: safeRole === "farmer" ? "pending" : "approved",
        farmName: body.farmName,
        location: body.location,
        walletAddress: body.walletAddress,
      },
    });

    return NextResponse.json({
      message:
        safeRole === "farmer"
          ? "Farmer account submitted for admin approval."
          : "Account created successfully.",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
      },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "Registration failed." },
      { status: 500 }
    );
  }
}