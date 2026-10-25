import { NextResponse } from "next/server";
import clientPromise, { DB_NAME, BIDS_COLLECTION, PROPOSALS_COLLECTION } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { createClient } from "@/utils/supabase/server";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const proposalId = url.searchParams.get("proposalId");
  
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const bids = await db.collection(BIDS_COLLECTION).find({ proposalId }).sort({ bidAmount: 1 }).toArray();

  if (session.role === "admin" || session.role === "state_admin") {
    // Merge ranks from supabase
    const supabase = await createClient();
    const { data: rankData } = await supabase.from("agency_performance_rankings").select("agency, delay_frequency_pct, avg_cost_overrun_pct").order("delay_frequency_pct", { ascending: true });
    
    // Assign rank based on index in rankData
    bids.forEach(bid => {
      const matchIndex = rankData?.findIndex((r: any) => r.agency === bid.agencyName) ?? -1;
      bid.agencyRank = matchIndex !== -1 ? matchIndex + 1 : "Unranked";
      if(matchIndex !== -1) {
        bid.delayFreq = rankData![matchIndex].delay_frequency_pct;
        bid.costOverrun = rankData![matchIndex].avg_cost_overrun_pct;
      }
    });
  }

  return NextResponse.json(bids);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (session?.role !== "agency") return NextResponse.json({ error: "Only agencies can bid" }, { status: 403 });

  const body = await req.json();
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const proposal = await db.collection(PROPOSALS_COLLECTION).findOne({ _id: new ObjectId(body.proposalId) });
  if (!proposal || proposal.status !== "bidding_open") {
    return NextResponse.json({ error: "Bidding is not open for this proposal" }, { status: 400 });
  }

  const now = new Date().getTime();
  const opened = new Date(proposal.biddingStartedAt || proposal.createdAt).getTime();
  if (now > opened + 7 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "Bidding window (1 week) has closed." }, { status: 400 });
  }

  const bidAmountNum = Number(body.bidAmount);
  if (!body.bidAmount || isNaN(bidAmountNum) || bidAmountNum <= 0) {
    return NextResponse.json({ error: "Please enter a valid bid amount (in Crores)." }, { status: 400 });
  }

  const agencyName = session.agency || session.name;
  const existingBid = await db.collection(BIDS_COLLECTION).findOne({
    proposalId: body.proposalId,
    $or: [{ agencyId: session.id }, { agencyName }]
  });
  if (existingBid) {
    return NextResponse.json({ error: "You have already placed a bid for this proposal." }, { status: 400 });
  }

  const bid = {
    proposalId: body.proposalId,
    agencyId: session.id,
    agencyName,
    bidAmount: bidAmountNum,
    remarks: body.remarks || "",
    status: "submitted",
    submittedAt: new Date()
  };

  await db.collection(BIDS_COLLECTION).insertOne(bid);
  return NextResponse.json({ success: true });
}
