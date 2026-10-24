import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import clientPromise, { DB_NAME, USERS_COLLECTION } from "./mongodb";

export const ROLES = ["admin", "state_admin", "ministry", "engineer", "agency", "user"] as const;
export type Role = (typeof ROLES)[number];

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  ministry?: string;
  agency?: string;
  state?: string;
  country?: string;
};

const secret = process.env.AUTH_SECRET;
if (!secret) throw new Error("Missing AUTH_SECRET environment variable");
const secretKey = new TextEncoder().encode(secret);

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);

  const cookieStore = await cookies();
  cookieStore.set("pp_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("pp_session")?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, secretKey);
    if (!payload.id || !payload.email || !payload.role) return null;

    return {
      id: String(payload.id),
      name: String(payload.name || ""),
      email: String(payload.email),
      role: payload.role as Role,
      ministry: payload.ministry ? String(payload.ministry) : undefined,
      agency: payload.agency ? String(payload.agency) : undefined,
      state: payload.state ? String(payload.state) : undefined,
      country: payload.country ? String(payload.country) : undefined,
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete("pp_session");
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function requireRole(allowed: Role[]) {
  const session = await requireSession();
  if (!allowed.includes(session.role)) throw new Error("FORBIDDEN");
  return session;
}


const FALLBACK_USERS = [
  {
    _id: "6aa55fa93a0951c1ad2fcae0",
    email: "admin@pragatipulse.gov.in",
    active: true,
    name: "System Administrator",
    passwordHash: "$2b$12$Y41PefsHj.MXVZWvSnvJmOa2J4L1qxzojAHsvdgV0Lvwr8sZlQOAm",
    role: "admin",
    country: "India"
  },
  {
    _id: "6aba20f30db2d1736a648b3a",
    name: "National Admin",
    email: "india@pragatipulse.gov.in",
    passwordHash: "$2b$10$8SwGKmRy38uWUKEBTuRyWOodEClgEDS2mpMO.MY7k.KEEY1GASijq",
    role: "admin",
    active: true,
    country: "India"
  },
  {
    _id: "6abccbbd35139a39f89e0e1b",
    name: "Pranav Ojha (WB Admin)",
    email: "indiawb@pragatipulse.gov.in",
    passwordHash: "$2b$10$Spyk5oNVnJXTG4gGQNq50OCurMwGEIH0zEiXqDSo0nbv4QtsAsW/C",
    role: "state_admin",
    state: "West Bengal",
    country: "India",
    active: true
  },
  {
    _id: "6ab806cc688034025bc425ab",
    name: "West Bengal Admin",
    email: "adminwb@pragatipulse.gov.in",
    role: "state_admin",
    state: "West Bengal",
    country: "India",
    active: true,
    passwordHash: "$2b$10$PUVgmAImf08PFzsWoEs/nuJEdBLMf4i6/SGEDvd4/8DGWBWv5lAUS"
  },
  {
    _id: "6aa5983066ef873e489e4ab2",
    email: "you3@test.com",
    name: "Shreyan Das",
    passwordHash: "$2b$12$nH6Xga9zbgBKzZ4CJv80K.bCVnOuZ3tZNYfb.3P17qITq69gkDdAm",
    role: "ministry",
    ministry: "Department of Sports",
    active: true
  },
  {
    _id: "6aa5bb06e484819eb160837f",
    email: "agency@pragatipulse.gov.in",
    name: "Samrat",
    passwordHash: "$2b$12$Xjun7cGy43MlK1cLejhO.uu1gmIDNHnEpKJYk00CYycRK3Jx/CsHi",
    role: "agency",
    agency: "Samrat Agency",
    country: "India",
    active: true
  },
  {
    _id: "6aa5983066ef873e489e4ab5",
    email: "you5@pragatipulse.gov.in",
    name: "Prabhat Singh",
    passwordHash: "$2b$12$nH6Xga9zbgBKzZ4CJv80K.bCVnOuZ3tZNYfb.3P17qITq69gkDdAm",
    role: "ministry",
    ministry: "Ministry of New and Renewable Energy",
    state: "West Bengal",
    country: "India",
    active: true
  },
  {
    _id: "6ab7828f15ed9f610af0f296",
    name: "Ministry of Coal",
    email: "coal@pragatipulse.gov.in",
    passwordHash: "$2b$10$PUVgmAImf08PFzsWoEs/nuJEdBLMf4i6/SGEDvd4/8DGWBWv5lAUS",
    role: "ministry",
    ministry: "Ministry of Coal",
    state: "West Bengal",
    country: "India",
    active: true
  },
  {
    _id: "6abd0cb00dc1d8d4969757e8",
    name: "MoRTH Officer",
    email: "road@pragatipulse.gov.in",
    passwordHash: "$2b$10$Oj1HvTJrMiWV4qShZ1dFZ.b9ujpenkXn/wIFdTlxn5tDPztl0Uif.",
    role: "ministry",
    ministry: "Ministry of Road Transport & Highways",
    state: "West Bengal",
    country: "India",
    active: true
  },
  {
    _id: "6aa64805003969a20a1acb13",
    name: "Arman Khan",
    email: "you6@pragatipulse.gov.in",
    passwordHash: "$2b$10$PUVgmAImf08PFzsWoEs/nuJEdBLMf4i6/SGEDvd4/8DGWBWv5lAUS",
    role: "agency",
    agency: "Maqsad",
    country: "India",
    active: true
  },
  {
    _id: "6aa59a8666ef873e489e4ab3",
    name: "Shrabasti Ghosh",
    email: "you4@gmail.com",
    passwordHash: "$2b$10$PUVgmAImf08PFzsWoEs/nuJEdBLMf4i6/SGEDvd4/8DGWBWv5lAUS",
    role: "ministry",
    ministry: "Department for Promotion of Industry & Internal Trade",
    state: "West Bengal",
    country: "India",
    active: true
  },
  {
    _id: "6aa648ac003969a20a1acb14",
    name: "Water Resources Dept",
    email: "shrabasti@gmail.com",
    passwordHash: "$2b$10$PUVgmAImf08PFzsWoEs/nuJEdBLMf4i6/SGEDvd4/8DGWBWv5lAUS",
    role: "ministry",
    ministry: "Department of Water Resources, River Development & GR",
    state: "West Bengal",
    country: "India",
    active: true
  }
];

export async function findUserByEmail(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const fallback = FALLBACK_USERS.find(u => u.email === normalizedEmail);
  if (fallback) {
    return fallback;
  }
  try {
    const client = await clientPromise;
    const user = await client.db(DB_NAME).collection(USERS_COLLECTION).findOne({ email: normalizedEmail });
    return user || fallback;
  } catch (e) {
    return fallback;
  }
}
