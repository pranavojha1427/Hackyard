import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession, findUserByEmail, type Role } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user || !user.active) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

    const anyUser = user as any;
    await createSession({
      id: anyUser._id.toString(),
      name: anyUser.name,
      email: anyUser.email,
      role: anyUser.role as Role,
      ministry: anyUser.ministry,
      agency: anyUser.agency,
      state: anyUser.state,
      country: anyUser.country || "India",
    });

    return NextResponse.json({ ok: true, role: user.role });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Unable to log in." }, { status: 500 });
  }
}
