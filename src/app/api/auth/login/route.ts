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

    await createSession({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role as Role,
      ministry: (user as any).ministry,
      agency: (user as any).agency,
      state: (user as any).state,
      country: (user as any).country,
    });

    return NextResponse.json({ ok: true, role: user.role });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Unable to log in." }, { status: 500 });
  }
}
