import { NextResponse } from "next/server";
import clientPromise, { DB_NAME, NOTIFICATIONS_COLLECTION } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json([]);

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

    return NextResponse.json(notifications);
  } catch (error) {
    console.warn("Notifications GET notice:", error);
    return NextResponse.json([]);
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (body.action === "mark_read" && Array.isArray(body.ids)) {
      const client = await clientPromise;
      const db = client.db(DB_NAME);
      await db.collection(NOTIFICATIONS_COLLECTION).updateMany(
        { _id: { $in: body.ids.filter((id: string) => ObjectId.isValid(id)).map((id: string) => new ObjectId(id)) } },
        { $set: { isRead: true } }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.warn("Notifications PUT notice:", error);
    return NextResponse.json({ success: false });
  }
}
