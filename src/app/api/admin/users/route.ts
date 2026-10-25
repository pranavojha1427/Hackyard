import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import clientPromise, { DB_NAME, USERS_COLLECTION } from "@/lib/mongodb";
import { requireRole, ROLES, findUserByEmail } from "@/lib/auth";
import { saveProvisionedUser, getProvisionedUsers, type ProvisionedUser } from "@/lib/user-store";

export async function POST(req: Request) {
  try {
    const admin = await requireRole(["admin", "state_admin"]);
    const body = await req.json();

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    let role = String(body.role ?? "").trim().toLowerCase();
    const ministry = String(body.ministry ?? "").trim() || undefined;
    const agency = String(body.agency ?? "").trim() || undefined;
    const state = String(body.state ?? "").trim() || undefined;
    const country = String(body.country ?? "").trim() || "India";

    // Normalizing role naming
    if (role === "state admin") role = "state_admin";
    if (role === "country admin") role = "admin";

    if (!name || !email || !password || !ROLES.includes(role as any)) {
      return NextResponse.json({ error: "Invalid account details." }, { status: 400 });
    }

    if (role === "admin" && admin.role !== "admin") {
      return NextResponse.json({ error: "Only Central Admins can create Country Admins." }, { status: 403 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    
    if (role === "ministry" && !ministry) {
      return NextResponse.json({ error: "Ministry/Department selection is required for Ministry accounts." }, { status: 400 });
    }
    if (role === "state_admin" && !state) {
      return NextResponse.json({ error: "State assignment is required for State Admin accounts." }, { status: 400 });
    }
    if ((role === "engineer" || role === "agency") && !agency) {
      return NextResponse.json({ error: "Agency/company is required for this role." }, { status: 400 });
    }

    // Check if user already exists
    const existing = await findUserByEmail(email);
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = existing?._id ? String(existing._id) : `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const newUser: ProvisionedUser = {
      _id: userId,
      name,
      email,
      passwordHash: hashedPassword,
      role,
      active: true,
      createdAt: (existing as any)?.createdAt || new Date().toISOString()
    };
    if (ministry) newUser.ministry = ministry;
    if (agency) newUser.agency = agency;
    // Central Union Ministries have national jurisdiction across all states; do not attach state
    if (state && role !== "ministry") newUser.state = state;
    if (country) newUser.country = country;

    // 1. Persist to resilient provisioned user store (Guarantees zero-data-loss & offline capability)
    await saveProvisionedUser(newUser);

    // 2. Best-effort sync to MongoDB if reachable
    try {
      const mongoPromise = (async () => {
        const client = await clientPromise;
        const users = client.db(DB_NAME).collection(USERS_COLLECTION);
        const updateDoc: any = { ...newUser, updatedAt: new Date() };
        if (role === "ministry") {
          delete updateDoc.state;
          await users.updateOne(
            { email },
            { $set: updateDoc, $unset: { state: "" } },
            { upsert: true }
          );
        } else {
          await users.updateOne(
            { email },
            { $set: updateDoc },
            { upsert: true }
          );
        }
      })();
      const mongoTimeout = new Promise((resolve) => setTimeout(resolve, 2000));
      await Promise.race([mongoPromise, mongoTimeout]);
    } catch (mErr) {
      console.warn("MongoDB sync skipped (offline resilient store used):", mErr);
    }

    return NextResponse.json({ 
      success: true, 
      message: existing 
        ? `Account credentials for ${email} updated successfully.` 
        : `Account provisioned successfully for ${email}.`
    });
  } catch (e: any) {
    console.error("ADMIN USERS ERROR:", e);
    if (e.message === "Unauthorized" || e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized: Please log in as an administrator." }, { status: 401 });
    }
    if (e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden: Administrator privileges required." }, { status: 403 });
    }
    return NextResponse.json({ error: e.message || "Failed to create account." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await requireRole(["admin", "state_admin"]);

    // Aggregate users across all sources: FALLBACK_USERS, provisioned_users.json, and MongoDB
    const usersMap = new Map<string, any>();

    // 1. Seed canonical platform users
    const { FALLBACK_USERS } = await import("@/lib/auth");
    FALLBACK_USERS.forEach((u: any) => {
      const key = (u.email || "").toLowerCase().trim();
      if (key) {
        usersMap.set(key, {
          _id: String(u._id || key),
          name: u.name,
          email: u.email,
          role: u.role,
          state: u.role === "ministry" ? undefined : u.state,
          ministry: u.ministry,
          agency: u.agency,
          createdAt: u.createdAt || "2026-09-01T00:00:00.000Z"
        });
      }
    });

    // 2. Merge local resilient provisioned store
    getProvisionedUsers().forEach((u: any) => {
      const key = (u.email || "").toLowerCase().trim();
      if (key) {
        usersMap.set(key, {
          _id: String(u._id || key),
          name: u.name,
          email: u.email,
          role: u.role,
          state: u.role === "ministry" ? undefined : u.state,
          ministry: u.ministry,
          agency: u.agency,
          createdAt: u.createdAt
        });
      }
    });

    // 3. Merge MongoDB users if available
    try {
      const mongoPromise = (async () => {
        const client = await clientPromise;
        const mongoUsers = await client.db(DB_NAME).collection(USERS_COLLECTION).find({}).toArray();
        return mongoUsers;
      })();
      const mongoTimeout = new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 2000));
      const mongoUsers = await Promise.race([mongoPromise, mongoTimeout]);

      mongoUsers.forEach((u: any) => {
        const key = (u.email || "").toLowerCase().trim();
        if (key && u.role !== "user") {
          usersMap.set(key, {
            _id: String(u._id || key),
            name: u.name || usersMap.get(key)?.name || key,
            email: u.email,
            role: u.role,
            state: u.role === "ministry" ? undefined : u.state,
            ministry: u.ministry,
            agency: u.agency,
            createdAt: u.createdAt || usersMap.get(key)?.createdAt || new Date().toISOString()
          });
        }
      });
    } catch (mErr) {
      console.warn("MongoDB users query skipped:", mErr);
    }

    const allUsers = Array.from(usersMap.values()).sort((a, b) => {
      const roleOrder: Record<string, number> = { admin: 1, state_admin: 2, ministry: 3, agency: 4, engineer: 5 };
      const orderA = roleOrder[a.role] || 99;
      const orderB = roleOrder[b.role] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || "").localeCompare(b.name || "");
    });

    return NextResponse.json({ success: true, users: allUsers });
  } catch (e: any) {
    if (e.message === "Unauthorized" || e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ success: true, users: [] });
  }
}
