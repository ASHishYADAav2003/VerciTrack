import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

type Role = "admin" | "farmer" | "customer";
type Status = "approved" | "pending" | "rejected";

type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  status: Status;
  address?: string;
  farmName?: string;
  location?: string;
  walletAddress?: string;
};

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

    const safeRole: Role = role || "customer";
    const filePath = path.join(process.cwd(), "data", "users.json");

    const file = await fs.readFile(filePath, "utf-8");
    const users: User[] = JSON.parse(file);

    const existingUser = users.find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const newUser: User = {
      id: `${safeRole}-${Date.now()}`,
      name,
      email,
      password,
      role: safeRole,
      status: safeRole === "farmer" ? "pending" : "approved",
      address: body.address,
      farmName: body.farmName,
      location: body.location,
      walletAddress: body.walletAddress,
    };

    users.push(newUser);

    await fs.writeFile(filePath, JSON.stringify(users, null, 2));

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
  } catch {
    return NextResponse.json(
      { error: "Registration failed." },
      { status: 500 }
    );
  }
}