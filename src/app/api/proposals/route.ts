import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import clientPromise, { DB_NAME, PROPOSALS_COLLECTION, NOTIFICATIONS_COLLECTION } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { createMongoProject } from "@/lib/project-store";

import { extractMinistry } from "@/lib/ministry-extractor";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  
  let query: any = {};
  if (session.role === "ministry" && session.ministry) {
    query = { $or: [{ ministry: new RegExp(`^${session.ministry}$`, "i") }, { createdBy: session.id }] };
  } else if (session.role === "agency" && session.agency) {
    query = { $or: [{ agency: session.agency }, { status: "bidding_open" }] };
  } else if (session.role === "state_admin" && session.state) {
    query = { state: new RegExp(`^${session.state}$`, "i") };
  } else if (session.role !== "admin" && session.role !== "state_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const proposals = await db.collection(PROPOSALS_COLLECTION).find(query).sort({ createdAt: -1 }).toArray();
  return NextResponse.json(proposals);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const resolvedMinistry = session.ministry || body.ministry || extractMinistry(body.sector, body.agency, body.project_name);
  const resolvedState = body.state || session.state || "National";

  const proposal = {
    ...body,
    state: resolvedState,
    ministry: resolvedMinistry,
    type: session.role === "agency" ? "agency_proposal" : "ministry_proposal",
    status: "pending_admin", // both start by going to admin / state admin
    createdBy: session.id,
    creatorRole: session.role,
    creatorName: session.name,
    agency: session.agency || body.agency,
    createdAt: new Date(),
    feedback: []
  };

  const res = await db.collection(PROPOSALS_COLLECTION).insertOne(proposal);

  // Notify admin
  await db.collection(NOTIFICATIONS_COLLECTION).insertOne({
    targetRole: "admin",
    title: "New Project Proposal",
    message: `${session.name} submitted a new project proposal for ${proposal.project_name}.`,
    isRead: false,
    createdAt: new Date()
  });

  return NextResponse.json({ success: true, id: res.insertedId });
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const { id, action, feedback, project_code, agency, bidAmount } = data;
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const proposal = await db.collection(PROPOSALS_COLLECTION).findOne({ _id: new ObjectId(id) });
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let newStatus = proposal.status;
  let notifTarget = null;
  let notifMsg = "";
  const updates: any = { $set: {} };

  if (action === "dismiss" && proposal.createdBy === session.id) {
    newStatus = "dismissed";
  } else if (session.role === "state_admin" || session.role === "admin") {
    if (action === "approve") {
      if (proposal.type === "agency_proposal") {
        newStatus = "pending_ministry";
        notifTarget = { targetMinistry: proposal.ministry };
        notifMsg = `Admin approved a proposal (${proposal.project_name}) from ${proposal.agency}. Awaiting your final approval.`;
      } else {
        newStatus = "bidding_open";
        notifTarget = { targetRole: "agency" }; // all agencies in that ministry
        notifMsg = `Bidding is now OPEN for ${proposal.project_name}! Submit your bids within 1 week.`;
      }
    } else if (action === "reject") {
      newStatus = "rejected_by_admin";
      notifTarget = { userId: proposal.createdBy };
      notifMsg = `Admin rejected your proposal (${proposal.project_name}). Reason: ${feedback}`;
    } else if (action === "award_bid") {
      newStatus = "approved"; // finalized
      if (agency && bidAmount) {
         const pCode = proposal.project_code || project_code || `PRJ-${Date.now()}`;
         const pCost = Number(bidAmount) || Number(proposal.expected_expenditure) || 0;
         const pSector = proposal.sector || "Others";
         const pMinistry = proposal.ministry || undefined;
         const pState = proposal.state || 'Unknown';
         const pName = proposal.project_name || "New Awarded Project";

         // 1. Create in MongoDB projects collection so it appears immediately on Dashboard & My Projects
         await createMongoProject({
           project_code: pCode,
           project_name: pName,
           sector: pSector,
           ministry: pMinistry,
           agency: agency,
           state: pState,
           original_cost: pCost,
           revised_cost: pCost,
           cumulative_expenditure: 0,
           physical_progress: 0
         }, session.email);

         // 2. Also insert into Supabase for Postgres consistency
         try {
           const supabase = await createClient();
           await supabase.from('projects').insert([{
             project_code: pCode,
             project_name: pName,
             sector: pSector,
             hml_category: pSector,
             ministry: pMinistry || null,
             agency: agency,
             state: pState,
             original_cost: pCost,
             revised_cost: pCost,
             cumulative_expenditure: 0,
             physical_progress: 0
           }]);
         } catch (supaErr) {
           console.warn("Supabase insert warning:", supaErr);
         }

         updates.$set.agency = agency;
         updates.$set.expected_expenditure = bidAmount;
      }
    }
  } else if (session.role === "ministry") {
    if (action === "approve") {
      newStatus = "approved";
      notifTarget = { userId: proposal.createdBy };
      notifMsg = `Ministry approved your proposal (${proposal.project_name})!`;
      
      if (proposal.type === "agency_proposal") {
         const pCode = proposal.project_code || project_code || `PRJ-${Date.now()}`;
         const pCost = Number(proposal.expected_expenditure) || 0;
         const pSector = proposal.sector || "Others";
         const pMinistry = proposal.ministry || undefined;
         const pState = proposal.state || 'Unknown';
         const pName = proposal.project_name || "New Awarded Project";

         // 1. Create in MongoDB projects collection
         await createMongoProject({
           project_code: pCode,
           project_name: pName,
           sector: pSector,
           ministry: pMinistry,
           agency: proposal.agency,
           state: pState,
           original_cost: pCost,
           revised_cost: pCost,
           cumulative_expenditure: 0,
           physical_progress: 0
         }, session.email);

         // 2. Insert into Supabase
         try {
           const supabase = await createClient();
           await supabase.from('projects').insert([{
             project_code: pCode,
             project_name: pName,
             sector: pSector,
             hml_category: pSector,
             ministry: pMinistry || null,
             agency: proposal.agency,
             state: pState,
             original_cost: pCost,
             revised_cost: pCost,
             cumulative_expenditure: 0,
             physical_progress: 0
           }]);
         } catch (supaErr) {
           console.warn("Supabase insert warning:", supaErr);
         }
      }
    } else if (action === "reject") {
      newStatus = "rejected_by_ministry";
      notifTarget = { userId: proposal.createdBy };
      notifMsg = `Ministry rejected your proposal (${proposal.project_name}). Reason: ${feedback}`;
    }
  }

  updates.$set.status = newStatus;
  if (project_code) {
    updates.$set.project_code = project_code;
  }
  if (newStatus === "bidding_open") {
    updates.$set.biddingStartedAt = new Date();
  }
  if (feedback) {
    updates.$push = { feedback: { text: feedback, author: session.name, role: session.role, date: new Date() } };
  }
  
  await db.collection(PROPOSALS_COLLECTION).updateOne({ _id: new ObjectId(id) }, updates);

  if (notifTarget) {
    await db.collection(NOTIFICATIONS_COLLECTION).insertOne({
      ...notifTarget,
      title: "Proposal Update",
      message: notifMsg,
      isRead: false,
      createdAt: new Date()
    });
  }

  return NextResponse.json({ success: true, status: newStatus });
}
