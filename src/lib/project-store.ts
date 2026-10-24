import { ObjectId } from "mongodb";
import clientPromise, { DB_NAME, PROJECTS_COLLECTION, PROJECT_OVERRIDES_COLLECTION } from "./mongodb";

export type EditableProject = {
  project_code: string;
  project_name: string;
  sector: string;
  ministry?: string;
  agency: string;
  state?: string;
  original_cost: number;
  revised_cost?: number;
  cumulative_expenditure?: number;
  physical_progress?: number;
  land_acquisition_issue?: boolean;
  forest_clearance_issue?: boolean;
  contractor_delay?: boolean;
  burn_rate_6m?: number;
  phys_burn_rate_6m?: number;
};

export async function getMongoProjects(agency?: string) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection(PROJECTS_COLLECTION).find(agency ? { agency } : {}).sort({ updatedAt: -1 }).toArray();
}

export async function getProjectOverrides(projectIds: Array<string | number>) {
  if (!projectIds.length) return [];
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection(PROJECT_OVERRIDES_COLLECTION).find({ projectId: { $in: projectIds.map(String) } }).toArray();
}

export function applyProjectOverrides(projects: any[], overrides: any[]) {
  const byId = new Map(overrides.map(o => [String(o.projectId), o.changes || {}]));
  return projects.map(p => ({ ...p, ...(byId.get(String(p.id)) || {}) }));
}

export async function createMongoProject(data: EditableProject, createdBy: string) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const now = new Date();
  const result = await db.collection(PROJECTS_COLLECTION).insertOne({
    ...data,
    source: "agency",
    createdBy,
    createdAt: now,
    updatedAt: now,
  });
  return result.insertedId.toString();
}

export async function upsertProjectOverride(projectId: string, changes: Partial<EditableProject>, updatedBy: string) {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  await db.collection(PROJECT_OVERRIDES_COLLECTION).updateOne(
    { projectId: String(projectId) },
    { $set: { projectId: String(projectId), changes, updatedBy, updatedAt: new Date() } },
    { upsert: true }
  );
}

export function isMongoProjectId(id: string) {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
}
