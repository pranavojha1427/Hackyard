// @ts-nocheck
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { createClient } from "@/utils/supabase/server";
import { createMongoProject, upsertProjectOverride, isMongoProjectId } from "@/lib/project-store";
import clientPromise, { DB_NAME, PROJECTS_COLLECTION, NOTIFICATIONS_COLLECTION } from "@/lib/mongodb";

const numberOrUndefined = (v: unknown) => {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

function clean(body: any, agency: string) {
  return {
    project_code: String(body.project_code ?? "").trim(), project_name: String(body.project_name ?? "").trim(),
    sector: String(body.sector ?? "Others").trim(), ministry: String(body.ministry ?? "").trim() || undefined,
    agency, state: String(body.state ?? "").trim() || undefined,
    original_cost: numberOrUndefined(body.original_cost) ?? 0, revised_cost: numberOrUndefined(body.revised_cost),
    cumulative_expenditure: numberOrUndefined(body.cumulative_expenditure), physical_progress: numberOrUndefined(body.physical_progress),
    land_acquisition_issue: Boolean(body.land_acquisition_issue), forest_clearance_issue: Boolean(body.forest_clearance_issue), contractor_delay: Boolean(body.contractor_delay),
    burn_rate_6m: numberOrUndefined(body.burn_rate_6m), phys_burn_rate_6m: numberOrUndefined(body.phys_burn_rate_6m),
  };
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(["agency"]);
    const data = clean(await req.json(), session.agency || "");
    if (!data.project_code) data.project_code = `PRJ-${Date.now().toString().slice(-6)}`;
    if (!data.agency || !data.project_name || !data.sector) return NextResponse.json({ error: "Project name and sector are required." }, { status: 400 });
    const id = await createMongoProject(data, session.email);

    try {
      const supabase = await createClient();
      await supabase.from("projects").insert([{
        project_code: data.project_code,
        project_name: data.project_name,
        sector: data.sector,
        hml_category: data.sector,
        ministry: data.ministry || null,
        agency: data.agency,
        state: data.state || "Unknown",
        original_cost: data.original_cost || 0,
        revised_cost: data.revised_cost || data.original_cost || 0,
        cumulative_expenditure: data.cumulative_expenditure || 0,
        physical_progress: data.physical_progress || 0
      }]);
    } catch (e) {
      console.warn("Supabase project backup warning:", e);
    }

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error: any) {
    const status = error?.message === "FORBIDDEN" ? 403 : error?.message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 403 ? "Agency/company access required." : "Unable to create project." }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireRole(["agency"]);
    const body = await req.json();
    const projectId = String(body.projectId ?? "").trim();
    if (!projectId) return NextResponse.json({ error: "projectId is required." }, { status: 400 });

    const client = await clientPromise;

    // New agency-created projects live directly in MongoDB.
    if (isMongoProjectId(projectId)) {
      const collection = client.db(DB_NAME).collection(PROJECTS_COLLECTION);
      const existing = await collection.findOne({ _id: new ObjectId(projectId), agency: session.agency });
      if (!existing) return NextResponse.json({ error: "You can only modify projects owned by your agency/company." }, { status: 403 });
      
      const changes = clean(body, session.agency || "");
      
      const isCompleted = Number(changes.physical_progress) === 100 && existing.physical_progress !== 100;
      if (isCompleted) {
        changes.is_completed = true;
      }
      
      await collection.updateOne({ _id: existing._id }, { $set: { ...changes, updatedBy: session.email, updatedAt: new Date() } });
      
      if (isCompleted) {
        const notifMsg = `Agency ${session.agency} has successfully completed the project: ${existing.project_name || existing.project_code}!`;
        const notifs = [
          { targetRole: "admin", title: "Project Completed", message: notifMsg, isRead: false, createdAt: new Date() }
        ];
        if (existing.ministry) {
          notifs.push({ targetMinistry: existing.ministry, title: "Project Completed", message: notifMsg, isRead: false, createdAt: new Date() } as any);
        }
        await client.db(DB_NAME).collection(NOTIFICATIONS_COLLECTION).insertMany(notifs);
      }
      return NextResponse.json({ ok: true });
    }

    // Existing government projects remain in Supabase. MongoDB stores an audit-friendly override.
    const supabase = await createClient();
    const { data: project, error } = await supabase.from("projects").select("id, agency, project_name, ministry, physical_progress").eq("id", projectId).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!project || project.agency !== session.agency) return NextResponse.json({ error: "You can only modify projects owned by your agency/company." }, { status: 403 });

    const overridesColl = client.db(DB_NAME).collection("project_overrides");
    const existingOverride = await overridesColl.findOne({ projectId: String(projectId) });
    const currentProgress = existingOverride?.changes?.physical_progress ?? existingOverride?.physical_progress ?? project?.physical_progress ?? 0;

    const changes = clean(body, session.agency || "");
    delete (changes as any).agency;
    
    const isCompleted = Number(changes.physical_progress) === 100 && currentProgress !== 100;
    if (isCompleted) {
      changes.is_completed = true;
    }

    await upsertProjectOverride(projectId, changes, session.email);
    
    if (isCompleted) {
      const pName = project?.project_name || `ID: ${projectId}`;
      const notifMsg = `Agency ${session.agency} has successfully completed the project: ${pName}!`;
      const notifs = [
        { targetRole: "admin", title: "Project Completed", message: notifMsg, isRead: false, createdAt: new Date() }
      ];
      if (project?.ministry) {
        notifs.push({ targetMinistry: project.ministry, title: "Project Completed", message: notifMsg, isRead: false, createdAt: new Date() } as any);
      }
      await client.db(DB_NAME).collection(NOTIFICATIONS_COLLECTION).insertMany(notifs);
    }
    
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    const status = error?.message === "FORBIDDEN" ? 403 : error?.message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: status === 403 ? "Agency/company access required." : "Unable to update project." }, { status });
  }
}
