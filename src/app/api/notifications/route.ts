import { NextResponse } from "next/server";
import clientPromise, { DB_NAME, NOTIFICATIONS_COLLECTION } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json([]);

    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);
      
      const queries: any[] = [{ userId: session.id }];
      if (session.role === "admin") queries.push({ targetRole: "admin" });
      if (session.role === "agency") queries.push({ targetRole: "agency" });
      if (session.ministry) queries.push({ targetMinistry: session.ministry });
      if (session.agency) queries.push({ targetAgency: session.agency });

      const notifications = await db.collection(NOTIFICATIONS_COLLECTION)
        .find({ $and: [{ $or: queries }, { isRead: { $ne: true } }] })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();

      return NextResponse.json(notifications || []);
    } catch (dbErr) {
      // Graceful degradation when MongoDB is offline
      return NextResponse.json([]);
    }
  } catch {
    return NextResponse.json([]);
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    try {
      const client = await clientPromise;
      const db = client.db(DB_NAME);

      if (body.action === "mark_read" && Array.isArray(body.ids)) {
        await db.collection(NOTIFICATIONS_COLLECTION).updateMany(
          { _id: { $in: body.ids.filter(Boolean).map((id: string) => new ObjectId(id)) } },
          { $set: { isRead: true } }
        );
      }
    } catch {
      // Offline degradation
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
